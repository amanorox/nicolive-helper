var HttpObserver = {

    observe:function(subject, topic, data){
	if( topic=="http-on-modify-request" ){
	    /*
	    if( httpChannel.URI.spec.match(/getzappinglist/) ){
		debugprint("HTTP getzappinglist is canceled.");
		var httpRequest = httpChannel.QueryInterface(Components.interfaces.nsIRequest); 
		httpRequest.cancel(0);
	    }
	     */

	    if( !$('get-extratime').hasAttribute('checked') ) return;

	    var httpChannel = subject.QueryInterface(Components.interfaces.nsIHttpChannel);

	    //debugprint(httpChannel.URI.spec);
	    if( httpChannel.URI.spec.match(/^https*:\/\/.*live\.nicovideo.*\/api\/configurestream.*key=end.*now/) ){
		debugprint("HTTP configurestream is canceled.");
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
		    debugprint("HTTP /disconnect is canceled");
		}
	    }
	}
    },

    init:function(){
	if(!this._registered){
	    this.observerService = Components.classes["@mozilla.org/observer-service;1"]
		.getService(Components.interfaces.nsIObserverService);
	    this.observerService.addObserver(this, "http-on-modify-request", false);
	    debugprint("begin http observe.");
	    this._registered = true;
	}
    },
    destroy:function(){
	if( this._registered ){
	    this.observerService.removeObserver(this, "http-on-modify-request");
	    debugprint("end http observe.");
	}
    }
};
