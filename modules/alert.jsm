/* -*- mode: js2;-*- */

var EXPORTED_SYMBOLS = ["NicoLiveAlertModule"];

var NicoLiveAlertModule = {

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

    closeConnection:function(){
	if( this.oStream ){
	    this.oStream.close();
	    delete this.oStream;
	}
	if( this.ciStream ){
	    this.ciStream.close();
	    delete this.ciStream;
	}
	Application.console.log('connection close');
    },

    connectCommentServer: function(server,port,thread){
	Application.console.log(server+":"+port+":"+thread);

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
    },

    connect:function(){
	var url = "http://live.nicovideo.jp/api/getalertinfo";
	var req = new XMLHttpRequest();
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
			    alert(x);
			}
		    }
		}else{
		    alert('ニコ生アラートサーバへ接続失敗');
		}
	    }
	};

	req.open('GET', url );
	req.send('');
    }	

};
