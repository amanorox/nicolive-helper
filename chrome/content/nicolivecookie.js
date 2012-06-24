try{
    Components.utils.import("resource://gre/modules/ctypes.jsm");
} catch (x) {
    Application.console.log(x);
}


var NicoLiveCookie = {
    notice:function(elem){
	let b = elem.hasAttribute('checked');
	ShowNotice(elem.label+'のクッキー共有を'+(b?'有効':'無効')+'にしました。');
    },


    init:function(){
    },
    destroy:function(){
	try{
	    if( this.lib ){
		this.lib.close();
	    }
	} catch (x) {
	    Application.console.log(x);
	}
    },

    // IE(非保護モード)のクッキーを取得(js-ctypes)
    getStdIECookie:function(uri,name){
	// HRESULT GetIECookie(LPCWSTR url,LPCWSTR name,LPWSTR cookie,DWORD len)
	if( !this.iestandard ){
	    if( !this.lib ){
		let path = GetExtensionPath();
		path.append("libs");
		path.append("cookiereader_dll.dll");
		this.lib = ctypes.open(path.path);
	    }
	    this.iestandard = this.lib.declare("GetIECookie", ctypes.default_abi, ctypes.long, ctypes.jschar.ptr, ctypes.jschar.ptr, ctypes.jschar.ptr, ctypes.uint32_t );
	    //debugprint(this.iestandard);
	}
	var myUTF16String = ctypes.jschar.array()(1024);
	this.iestandard(uri,name,myUTF16String, 1024);
	//debugprint(myUTF16String.readString());

	var c = myUTF16String.readString();
	c = c.split(";");
	for(let i=0,item;item=c[i];i++){
	    try{
		c = item.match(/user_session=(.*)/)[1];
		break;
	    } catch (x) {
	    }
	}
	return c;
    },
    // IE(保護モード)のクッキーを取得(js-ctypes)
    getIECookie:function(uri,name){
	// HRESULT GetProtectedModeIECookie(LPCWSTR url,LPCWSTR name,LPWSTR cookie,DWORD len)
	if( !this.ieprotected ){
	    if( !this.lib ){
		let path = GetExtensionPath();
		path.append("libs");
		path.append("cookiereader_dll.dll");
		this.lib = ctypes.open(path.path);
	    }
	    this.ieprotected = this.lib.declare("GetProtectedModeIECookie", ctypes.default_abi, ctypes.long, ctypes.jschar.ptr, ctypes.jschar.ptr, ctypes.jschar.ptr, ctypes.uint32_t );
	    //debugprint(this.ieprotected);
	}
	var myUTF16String = ctypes.jschar.array()(1024);
	this.ieprotected(uri,name,myUTF16String, 1024);
	//debugprint("IEProCookie:"+myUTF16String.readString());

	var c = myUTF16String.readString();
	try{
	    c = c.split(";")[0].match(/user_session=(.*)/)[1];
	} catch (x) {
	    c = "";
	}
	return c;
    },

    setCookie:function(value){
	var cookieMgr = Cc["@mozilla.org/cookiemanager;1"].getService(Components.interfaces.nsICookieManager2);
	var host = ".nicovideo.jp";
	var path = "/";
	var key = "user_session";
	var d = new Date();
	var expired = d.getTime()/1000; // seconds since the epoch.
	expired += 60*60*24*7; // 1 week
	cookieMgr.add( host, path, key, value, false, false, false, expired );
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
	let file;
	if( IsWINNT() ){
            file = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("LocalAppData", Components.interfaces.nsIFile);
            file.append("Google");
            file.append("Chrome");
            file.append("User Data");
            file.append("Default");
            file.append("Cookies");
	}else if( IsLinux() ){
	    
	}else if( IsDarwin() ){
	    
	}
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
    },

    // Mac Safariのクッキーを取得(js-ctypes)
    getMacSafariCookie:function(){
	//debugprint("read mac safari's cookie.");
	if( !this.macsafari ){
	    if( !this.lib ){
		let path = GetExtensionPath();
		path.append("libs");
		path.append("libmacsafaricookie.dylib");
		debugprint(path.path);
		this.lib = ctypes.open(path.path);
	    }
	    this.macsafari = this.lib.declare("GetSafariNicoSessionCookie", ctypes.default_abi, ctypes.int32_t, ctypes.char.ptr, ctypes.int32_t );
	}
	var myUTF16String = ctypes.char.array()(1024);
	this.macsafari(myUTF16String, 1024);
	//debugprint(myUTF16String.readString());

	var c = myUTF16String.readString();
	return c;
    }

};

window.addEventListener("load", function(e){ NicoLiveCookie.init(); }, false);
window.addEventListener("unload", function(e){ NicoLiveCookie.destroy(); }, false);
