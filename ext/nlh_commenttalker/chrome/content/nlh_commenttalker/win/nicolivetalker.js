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

    runProcess:function(exe,text, type){
	type = $('nlhaddon-use-external').checked ? 1 : 0;
	switch(type){
	case 0:
	    this.talk(exe,text);
	    break;
	case 1:
	    this.runExternalProcess(exe,text,type);
	    break;
	}
	return;
    },

    runExternalProcess:function(exe,text, type){
	var file = Components.classes["@mozilla.org/file/local;1"]
                     .createInstance(Components.interfaces.nsILocalFile);
	var path = $('nlhaddon-external-program').value;
	file.initWithPath(path);
	var process = Components.classes["@mozilla.org/process/util;1"]
            .createInstance(Components.interfaces.nsIProcess);
	process.init(file);

	text = text.replace(/[!！]+/g,'！');
	text = text.replace(/[?？]+/g,'？');
	text = text.replace(/。+/g,'。　');
	text = text.replace(/！？/g,'？');
	text = text.replace(/／/g,'');
	text = text.replace(/([！？])/g,'$1　');
	text = text.replace(/\s*$/,'');
	if( text.match(/^[！？]$/,'') ){
	    return;
	}
	var unicodeConverter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
            .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
	unicodeConverter.charset = "Shift_JIS";
	text = unicodeConverter.ConvertFromUnicode( text ) + unicodeConverter.Finish();
	var args = [text];
	process.run(false, args, args.length);
    },

    selectExternalProgram:function(){
	const nsIFilePicker = Components.interfaces.nsIFilePicker;
	var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
	fp.init(window, "外部プログラムを指定してください", nsIFilePicker.modeOpen);
	var rv = fp.show();
	if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
	    var file = fp.file;
	    var path = fp.file.path;
	    $('nlhaddon-external-program').value = path;
	}
    },

    test:function(){
	this.runProcess("", $('nlhaddon-testbox').value);
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

    init:function(){
	debugprint('CommentTalker init.');

	try{
	    var path = this.GetExtensionPath();
	    path.append("libs");
	    path.append("commenttalker_dll.dll");
	    debugprint(path.path);
	    this.lib = ctypes.open(path.path);
	    this.talk = this.lib.declare("bouyomichan", ctypes.default_abi, ctypes.int32_t, ctypes.jschar.ptr, ctypes.jschar.ptr);
	} catch (x) {
	    debugprint(x);
	}

	this.oldprocesscomment = NicoLiveHelper.processComment;
	NicoLiveHelper.processComment = function(xmlchat){
	    NicoLiveTalker.newProcessComment(xmlchat);
	};

	let prefs = NicoLivePreference.getBranch();
	try{ $('enable-comment-talker').checked = prefs.getBoolPref("ext.comment-talker.enable"); }catch(x){}
	try{ $('nlhaddon-restrictlength').value = prefs.getIntPref("ext.comment-talker.length"); }catch (x){}
	try{ $('nlhaddon-format').value = prefs.getUnicharPref("ext.comment-talker.format"); }catch (x){}
	try{ $('nlhaddon-external-program').value = prefs.getUnicharPref("ext.comment-talker.ext-program"); }catch (x){}
    },
    destroy:function(){
	try{
	    this.lib.close();
	} catch (x) {
	    debugprint(x);
	}

	let prefs = NicoLivePreference.getBranch();
	prefs.setBoolPref("ext.comment-talker.enable", $('enable-comment-talker').checked);
	prefs.setIntPref("ext.comment-talker.length", $('nlhaddon-restrictlength').value);
	prefs.setUnicharPref("ext.comment-talker.format",$('nlhaddon-format').value);
	prefs.setUnicharPref("ext.comment-talker.ext-program",$('nlhaddon-external-program').value);
    }
};

window.addEventListener("load", function(e){ NicoLiveTalker.init(); }, false);
window.addEventListener("unload", function(e){ NicoLiveTalker.destroy(); }, false);
