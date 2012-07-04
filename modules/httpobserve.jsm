/* -*- mode: js2;-*- */

var EXPORTED_SYMBOLS = ["NicoLiveHttpObserver"];

function debugprint(str){
    var aConsoleService = Components.classes["@mozilla.org/consoleservice;1"].
	getService(Components.interfaces.nsIConsoleService);
    aConsoleService.logStringMessage(str);
}

var NicoLiveHttpObserver = {

    counter: 0,
    dolosstime: false,
    _disable_heartbeat: false,

    setLossTime:function(b){
	this.dolosstime = b;
	debugprint("Losstime: "+(b?"Enabled":"Disabled"));
    },

    _testCancelHeartbeat:function(b){
	this._disable_heartbeat = b;
	debugprint("Heartbeat: "+(b?"Disabled":"Enabled"));
    },

    observe:function(subject, topic, data){
	if( topic=="http-on-modify-request" ){

	    var httpChannel = subject.QueryInterface(Components.interfaces.nsIHttpChannel);

	    if( this._disable_heartbeat ){
		if( httpChannel.URI.spec.match(/^https*:\/\/.*live\.nicovideo.*\/api\/heartbeat/) ){
		    if(!httpChannel.getRequestHeader('User-Agent').match(/NicoLiveHelper/)){
			var httpRequest = httpChannel.QueryInterface(Components.interfaces.nsIRequest); 
			httpRequest.cancel(0);
		    }
		}
	    }

	    if( !this.dolosstime ) return;

	    //debugprint(httpChannel.URI.spec);
	    if( httpChannel.URI.spec.match(/^https*:\/\/.*live\.nicovideo.*\/api\/configurestream.*key=end.*now/) ){
		//debugprint("HTTP configurestream is canceled.");
		var httpRequest = httpChannel.QueryInterface(Components.interfaces.nsIRequest); 
		httpRequest.cancel(0);
	    }

	    if( httpChannel.requestMethod=='POST' && httpChannel.URI.spec.match(/^https*:\/\/.*live\.nicovideo.*\/api\/broadcast\//) ){
		httpChannel.QueryInterface(Components.interfaces.nsIUploadChannel);
		var us = httpChannel.uploadStream;
		us.QueryInterface(Components.interfaces.nsISeekableStream);
		
		var ss = Components.classes["@mozilla.org/scriptableinputstream;1"]
                    .createInstance(Components.interfaces. nsIScriptableInputStream);
		ss.init(us);
		us.seek(0, 0);
		var n = ss.available();
		var postdata = ss.read(n);
		us.seek(0,0);
		//ss.close();
		//us.close();
		//debugprint("post data="+postdata);
		//debugprint(typeof postdata);
		if( postdata.match(/body=%2Fdisconnect/i) ){
		    var httpRequest = httpChannel.QueryInterface(Components.interfaces.nsIRequest); 
		    httpRequest.cancel(0);
		    //debugprint("HTTP /disconnect is canceled");
		}
	    }
	}
    },

    init:function(){
	if( this.counter<=0 ){
	    this.observerService = Components.classes["@mozilla.org/observer-service;1"]
		.getService(Components.interfaces.nsIObserverService);
	    this.observerService.addObserver(this, "http-on-modify-request", false);
	    debugprint("begin http observe.");
	    this.counter = 0;
	    this._registered = true;
	}
	this.counter++;
    },
    destroy:function(){
	this.counter--;
	if( this.counter<=0 ){
	    try{
		this.observerService.removeObserver(this, "http-on-modify-request");
		debugprint("end http observe.");
	    } catch (x) {
	    }
	}
    }
};
