/*
Copyright (c) 2009 amano <amano@miku39.jp>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
 */

Components.utils.import("resource://gre/modules/ctypes.jsm");

var NicoLiveTalker = {
    GetExtensionPath:function(){
	let id = "nlh_commenttalker@miku39.jp";
	let ext;
	try{
	    ext = Components.classes["@mozilla.org/extensions/manager;1"]
		.getService(Components.interfaces.nsIExtensionManager)
		.getInstallLocation(id)
		.getItemLocation(id);
	} catch (x) {
	    let _addon;
	    AddonManager.getAddonByID("nlh_commenttalker@miku39.jp",
				      function(addon) {
					  _addon = addon;
				      });
	    // Piroさん(http://piro.sakura.ne.jp/)が値が設定されるまで待つことをやっていたので真似してしまう.
	    let thread = Components.classes['@mozilla.org/thread-manager;1'].getService().mainThread;
	    while (_addon === void(0)) {
		thread.processNextEvent(true);
	    }
	    ext = _addon.getResourceURI('/').QueryInterface(Components.interfaces.nsIFileURL).file.clone();
	}
	return ext;
    },

    runProcess:function(exe,text){
	try{
	    if( $('use-bouyomichan').selected ){
		this.bouyomichan( $('bouyomichan-server').value, text);
	    }
	    if( $('use-saykotoeri').selected || $('use-saykotoeri2').selected){
		// system()使うのでコマンドラインパラメータとして渡すのに危険なもの削除.
		text = text.replace(/[;\"'&]/g,"");
		this.talkqueue.push(text);
		//obj.sayKotoeri(text);
	    }
	    if( $('use-yukkuroid').selected ){
		text = text.replace(/[;\"'&]/g,"");
		this.talkqueue.push(text);
	    }
	} catch (x) {
	}

	return;
    },

    talk_bysaykotoeri:function(){
	try{
	    
	if( this.talkqueue.length==0 ){
	    $('talker-left').value = this.talkqueue.length + "行";
	    return;
	}
	let saykotoeri = 0;
	if( $('use-saykotoeri').selected ) saykotoeri = 1;
	if( $('use-saykotoeri2').selected ) saykotoeri = 2;
	if( $('use-yukkuroid').selected ) saykotoeri = 3;

	let text = this.talkqueue.shift();
	switch(saykotoeri){
	case 1:
	    if( !this.saykotoeri(text) ){
		this.talkqueue.unshift(text);
	    }
	    break;
	case 2:
	    let speed = "-s "+ $('nlhaddon-talk-speed').value;
	    let volume = "-b " + $('nlhaddon-talk-volume').value;
	    if( !this.saykotoeri2(speed+" "+volume,text) ){
		this.talkqueue.unshift(text);
	    }
	    break;

	case 3:
	    //debugprint( this.isYukkuroidSaying(0) );
	    if( !this.isYukkuroidSaying(0) ){
		let utf8 = ctypes.char.array()(text);
		this.yukkuroidSetText(utf8);
		this.yukkuroidPlay();
	    }else{
		this.talkqueue.unshift(text);
	    }
	    break;

	default:
	    break;
	}

	$('talker-left').value = this.talkqueue.length + "行";

	} catch (x) {
	}
    },

    test:function(){
	//this.runProcess("","人付");
	//this.runProcess("","工エエェェ(´д｀)ェェエエ工");
	this.runProcess("","コメント読み上げのテストです");
	this.runProcess("","sm683164");
    },

    newProcessComment:function(xmlchat){
	NicoLiveTalker.oldprocesscomment(xmlchat);

	if( !$('enable-comment-talker').checked ) return; // 読み上げしない.

	let chat = NicoLiveHelper.extractComment(xmlchat);
	if(chat.date<NicoLiveHelper.connecttime){ return; } // 過去ログ無視.

	if(chat.premium==3){
	    if( !$('nlhaddon-read-castercomment').checked ) return; // 運営コメ読まない.
	    if(chat.text.indexOf('/')==0) return; // 運営コマンドは読まない.
	    chat.text = chat.text.replace(/<.*?>/g,""); // タグ除去.
	}
	// 改行文字を含むコメントを読まない.
	//if( $('nlhaddon-dontread-crlfincluded').checked && chat.text.match(/(\r|\n)/)) return;
	// / で始まるコメを読まない.
	if( $('nlhaddon-dontread-leadingslash').checked && chat.text.indexOf('/')==0 ) return;
	// n 文字以上のコメは読まない.
	if( $('nlhaddon-restrictlength').value>0 &&
	    chat.text.length >= $('nlhaddon-restrictlength').value ) return;
	if( chat.premium!=3 ){
	    // NGコメを読まない.
	    if( $('nlhaddon-dontread-ngword').checked && NicoLiveComment.isNGWord(chat.text) ) return;
	}
	chat.text = chat.text.replace(/[wｗ]{2,}$/,"わらわら");
	chat.text = chat.text.replace(/[wｗ]$/,"わら");
	chat.text = chat.text.replace(/http:\/\/[\w.%\&=/-?]+/,"ゆーあーるえるしょうりゃく");

	let str;
	let replacefunc = function(s,p){
	    let tmp = s;
	    switch(p){
	    case 'comment':
		tmp = chat.text;
		break;
	    case 'name':
		try{
		    tmp = NicoLiveComment.namemap[chat.user_id].name;
		} catch (x) {
		    tmp = null;
		}
		if( !tmp ) tmp = "";
		break;
	    }
	    return tmp;
	};
	str = $('nlhaddon-format').value.replace(/{(.*?)}/g,replacefunc);
	//this.runProcess('',chat.text);
	this.runProcess('',str);
    },

    init_jsctypes:function(){
	try{
	    var path = this.GetExtensionPath();
	    path.append("libs");
	    path.append("libxpcom_commenttalker-mac.dylib");
	    debugprint(path.path);
	    this.lib = ctypes.open(path.path);
	    this.bouyomichan = this.lib.declare("bouyomichan", ctypes.default_abi, ctypes.int32_t, ctypes.jschar.ptr, ctypes.jschar.ptr);
	    this.saykotoeri = this.lib.declare("saykotoeri", ctypes.default_abi, ctypes.int32_t, ctypes.jschar.ptr);
	    this.saykotoeri2 = this.lib.declare("saykotoeri2", ctypes.default_abi, ctypes.int32_t, ctypes.jschar.ptr, ctypes.jschar.ptr);

	    this.yukkuroidSetText = this.lib.declare("yukkuroidSetText", ctypes.default_abi, ctypes.int32_t, ctypes.char.ptr);
	    this.isYukkuroidSaying = this.lib.declare("isYukkuroidSaying", ctypes.default_abi, ctypes.int32_t, ctypes.int32_t);
	    this.yukkuroidPlay = this.lib.declare("yukkuroidPlay", ctypes.default_abi, ctypes.int32_t);

	} catch (x) {
	    debugprint(x);
	}
    },

    init:function(){
	debugprint('CommentTalker init.');

	this.init_jsctypes();

	this.talkqueue = new Array();
	setInterval(function(){
			NicoLiveTalker.talk_bysaykotoeri();
		    }, 1000 );

	this.oldprocesscomment = NicoLiveHelper.processComment;
	NicoLiveHelper.processComment = function(xmlchat){
	    NicoLiveTalker.newProcessComment(xmlchat);
	};

	let prefs = NicoLivePreference.getBranch();
	try{
	    $('enable-comment-talker').checked = prefs.getBoolPref("ext.comment-talker.enable");
	    $('use-what-talker-program').selectedIndex = prefs.getIntPref("ext.comment-talker.program");
	    $('bouyomichan-server').value = prefs.getCharPref("ext.comment-talker.bouyomichan-server");
	    $('nlhaddon-restrictlength').value = prefs.getIntPref("ext.comment-talker.length");
	    $('nlhaddon-format').value = prefs.getUnicharPref("ext.comment-talker.format");
	    $('nlhaddon-talk-speed').value = prefs.getIntPref("ext.comment-talker.speed");
	    $('nlhaddon-talk-volume').value = prefs.getIntPref("ext.comment-talker.volume");
	} catch (x) {
	}
    },

    destroy:function(){
	try{
	    this.lib.close();
	} catch (x) {
	    debugprint(x);
	}

	let prefs = NicoLivePreference.getBranch();
	prefs.setBoolPref("ext.comment-talker.enable", $('enable-comment-talker').checked);
	prefs.setIntPref("ext.comment-talker.program", $('use-what-talker-program').selectedIndex);
	prefs.setCharPref("ext.comment-talker.bouyomichan-server",$('bouyomichan-server').value );
	prefs.setIntPref("ext.comment-talker.length", $('nlhaddon-restrictlength').value);
	prefs.setUnicharPref("ext.comment-talker.format",$('nlhaddon-format').value);
	prefs.setIntPref("ext.comment-talker.speed", $('nlhaddon-talk-speed').value);
	prefs.setIntPref("ext.comment-talker.volume", $('nlhaddon-talk-volume').value);
    }
};

window.addEventListener("load", function(e){ NicoLiveTalker.init(); }, false);
window.addEventListener("unload", function(e){ NicoLiveTalker.destroy(); }, false);
