var NicoLiveCookie = {
    
    getCookie:function(uri_string){
	var ios = Cc["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);  
	var uri = ios.newURI(uri_string, null, null);  
	var cookieSvc = Cc["@mozilla.org/cookieService;1"].getService(Components.interfaces.nsICookieService);  
	var cookie = cookieSvc.getCookieString(uri, null);  
	return cookie;
    },

    getCookie2:function(uri_string,name){
	var ios = Cc["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);  
	var uri = ios.newURI(uri_string, null, null);  
	uri_string = uri.asciiHost;
	debugprint(uri_string);

	var cookieMgr = Cc["@mozilla.org/cookiemanager;1"].getService(Components.interfaces.nsICookieManager);
	for (var e = cookieMgr.enumerator; e.hasMoreElements();) {
	    var cookie = e.getNext().QueryInterface(Components.interfaces.nsICookie);

	    var host = cookie.host.replace(".","\\.");
	    var reg = new RegExp( host+"$" , "i");
	    if( uri_string.match(reg) ){
		if( cookie.name==name ) return cookie.value;
	    }
	}
	return null;
    }
};

