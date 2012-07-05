/* -*- mode: js2;-*- */

var EXPORTED_SYMBOLS = ["NicoLiveAlertModule"];

function debugprint(str){
    var aConsoleService = Components.classes["@mozilla.org/consoleservice;1"].
	getService(Components.interfaces.nsIConsoleService);
    aConsoleService.logStringMessage(str);
}

var NicoLiveAlertModule = {
    connected: false,
    alert_target: {},
    use_external_browser: false,

    isRegistered:function(community){
	return this.alert_target[community];
    },

    registerTarget:function(community){
	this.alert_target[community] = true;
    },
    unregisterTarget:function(community){
	delete this.alert_target[community];
    },

    /**
     * ニコ生アラート処理の本体
     */
    checkAlert:function(chat){
	var dat = chat.split(',');
	var request_id, community_id, caster_id;
	switch(dat.length){
	case 3:
	    caster_id = dat[2];
	case 2:
	    community_id = dat[1];
	case 1:
	    request_id = "lv"+dat[0];
	default:
	    break;
	}
	if( this.alert_target[community_id] ){	    
	    this.openDefaultBrowser("http://live.nicovideo.jp/watch/"+request_id);
	}
    },

    openDefaultBrowser:function(url, hasfocus){
	if( this.use_external_browser ){
	    // まず ioservice を用いて nsIURI オブジェクトを作る
	    var ioservice = Components.classes["@mozilla.org/network/io-service;1"]
		.getService(Components.interfaces.nsIIOService);
	
	    var uriToOpen = ioservice.newURI(url, null, null);
	
	    var extps = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"]
		.getService(Components.interfaces.nsIExternalProtocolService);
	
	    // そしてそれを開く
	    extps.loadURI(uriToOpen, null);
	    return null;
	}else{
	    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
	    var browserEnumerator = wm.getEnumerator("navigator:browser");
	    var browserInstance = browserEnumerator.getNext().gBrowser;
	    var tab = browserInstance.addTab( url );
	    browserInstance.selectedTab = tab;
	    return tab;
	}
    },

    // コメントサーバからやってくる1行分のテキストを処理.
    processAlert:function(line){
	if(line.match(/^<chat\s+.*>/)){
	    var parser = new DOMParser();
	    var dom = parser.parseFromString(line,"text/xml");
	    var chat  = dom.getElementsByTagName('chat')[0].textContent;
	    this.checkAlert(chat);
	    return;
	}
    },

    evaluateXPath:function(aNode, aExpr) {
	var xpe = new XPathEvaluator();
	var nsResolver = xpe.createNSResolver(aNode.ownerDocument == null ?
					      aNode.documentElement : aNode.ownerDocument.documentElement);
	var result = xpe.evaluate(aExpr, aNode, nsResolver, 0, null);
	var found = [];
	var res;
	while (res = result.iterateNext())
	    found.push(res);
	return found;
    },

    closeConnection:function(){
	if( this.oStream ){
	    this.oStream.close();
	    delete this.oStream;
	}
	if( this.ciStream ){
	    this.ciStream.close();
	    delete this.ciStream;
	}
	debugprint('disconnected from nico alert server.');
	this.connected = false;
    },

    connectCommentServer: function(server,port,thread){
	debugprint(server+":"+port+":"+thread);

	var socketTransportService = Components.classes["@mozilla.org/network/socket-transport-service;1"].getService(Components.interfaces.nsISocketTransportService);
	var socket = socketTransportService.createTransport(null,0,server,port,null);
	var iStream = socket.openInputStream(0,0,0);

	this.ciStream = Components.classes["@mozilla.org/intl/converter-input-stream;1"].createInstance(Components.interfaces.nsIConverterInputStream);
	this.ciStream.init(iStream,"UTF-8",0,Components.interfaces.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);

	this.pump = Components.classes["@mozilla.org/network/input-stream-pump;1"].createInstance(Components.interfaces.nsIInputStreamPump);
	this.pump.init(iStream,-1,-1,0,0,false);

	this.oStream = socket.openOutputStream(0,0,0);
	this.coStream = Components.classes["@mozilla.org/intl/converter-output-stream;1"].createInstance(Components.interfaces.nsIConverterOutputStream);
	this.coStream.init(this.oStream,"UTF-8",0,Components.interfaces.nsIConverterOutputStream.DEFAULT_REPLACEMENT_CHARACTER);

	var dataListener = {
	    line: "",
	    onStartRequest: function(request, context){
	    },
	    onStopRequest: function(request, context, status){
		// 切断
		NicoLiveAlertModule.closeConnection();
	    },
	    onDataAvailable: function(request, context, inputStream, offset, count) {
		var lineData = {};
		var r;
		while(1){
		    // まとめて読むと、行単位の区切り付けるのメンドイんで.
		    try{
			r = NicoLiveAlertModule.ciStream.readString(1,lineData);
		    } catch (x) { return; }
		    if( !r ){ break; }
		    if( lineData.value=="\0" ){
			NicoLiveAlertModule.processAlert(this.line);
			this.line = "";
			continue;
		    }
		    this.line += lineData.value;
		}
	    }
	};
	this.pump.asyncRead(dataListener,null);
	debugprint('Connect nicolive alert server.');
	this.connected = true;
    },

    connect:function(){
	if( this.connected ) return;

	const { XMLHttpRequest } = Components.classes["@mozilla.org/appshell/appShellService;1"]  
            .getService(Components.interfaces.nsIAppShellService)  
            .hiddenDOMWindow;  
	var req = XMLHttpRequest();  
	var url = "http://live.nicovideo.jp/api/getalertinfo";
	if( !req ) return;

	req.onreadystatechange = function(){
	    if( req.readyState==4 ){
		if( req.status==200 ){
		    var xml = req.responseXML;
		    var status = NicoLiveAlertModule.evaluateXPath(xml,"/getalertstatus/@status");
		    if( status.length && status[0].textContent.match(/ok/i) ){
			try{
			    NicoLiveAlertModule.user_id = NicoLiveAlert.evaluateXPath(xml,"/getalertstatus/user_id")[0].textContent;
			    NicoLiveAlertModule.user_hash = NicoLiveAlert.evaluateXPath(xml,"/getalertstatus/user_hash")[0].textContent;
			    NicoLiveAlertModule.addr = NicoLiveAlert.evaluateXPath(xml,"/getalertstatus/ms/addr")[0].textContent;
			    NicoLiveAlertModule.port = NicoLiveAlert.evaluateXPath(xml,"/getalertstatus/ms/port")[0].textContent;
			    NicoLiveAlertModule.thread = NicoLiveAlert.evaluateXPath(xml,"/getalertstatus/ms/thread")[0].textContent;

			    NicoLiveAlertModule.connectCommentServer(NicoLiveAlert.addr, NicoLiveAlert.port, NicoLiveAlert.thread);
			} catch (x) {
			    debugprint(x);
			}
		    }
		}else{
		    debugprint('failed to connect nico alert server.');
		}
	    }
	};

	req.open('GET', url );
	req.send('');
    }

};
