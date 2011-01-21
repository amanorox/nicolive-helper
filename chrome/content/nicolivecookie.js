var NicoLiveCookie = {

    getStandardIECookie:function(uri,name){
	let c;
	try{
	    let obj = Components.classes["@miku39.jp/NLHGetCookie;1"].createInstance(Components.interfaces.INLHGetCookie);
	    c = obj.getStandardModeIECookie(uri,name);
	    c = c.split(";");
	    for(let i=0,item;item=c[i];i++){
		try{
		    c = item.match(/user_session=(.*)/)[1];
		    break;
		} catch (x) {
		}
	    }
	    debugprint(c);
	} catch (x) {
	    c = "";
	}
	return c;
    },

    getProtectedIECookie:function(uri,name){
	let c;
	try{
	    let obj = Components.classes["@miku39.jp/NLHGetCookie;1"].createInstance(Components.interfaces.INLHGetCookie);
	    c = obj.getProtectedModeIECookie(uri,name);
	    c = c.split(";")[0].match(/user_session=(.*)/)[1];
	    debugprint(c);
	} catch (x) {
	    c = "";
	}
	return c;
    },

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
    },

    getChromeCookie:function(){
	// C:\Users\amano\AppData\Local\Google\Chrome\User Data\Default\Cookies
        let file = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("LocalAppData", Components.interfaces.nsIFile);
        file.append("Google");
        file.append("Chrome");
        file.append("User Data");
        file.append("Default");
        file.append("Cookies");
	debugprint(file.path);

        let storageService = Components.classes["@mozilla.org/storage/service;1"].getService(Components.interfaces.mozIStorageService);
        let dbconnect = storageService.openDatabase(file);
	let st = dbconnect.createStatement("SELECT * FROM cookies WHERE host_key like ?1 AND name = ?2");
	st.bindUTF8StringParameter(0,"%.nicovideo.jp%");
	st.bindUTF8StringParameter(1,"user_session");
	let latest = 0;
	let return_value = "";
	while(st.step()){
	    let host_key = st.row.host_key;
	    let name = st.row.name;
	    let value = st.row.value;
	    let expires = parseInt(st.row.expires_utc);
	    if( latest < expires ){
		//debugprint(host_key + "/" + value);
		latest = expires;
		return_value = value;
	    }
	}
	st.finalize();
	dbconnect.close();
	return return_value;
    }

};

