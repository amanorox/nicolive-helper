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

var NicoLiveTalker = {
    runProcess:function(exe,text){
	let obj = Components.classes["@miku39.jp/NLHCommentTalker;1"].createInstance(Components.interfaces.INLHCommentTalker);

	if( $('use-bouyomichan').selected ){
	    obj.sayBouyomichan( $('bouyomichan-server').value, text);
	}
	if( $('use-saykotoeri').selected ){
	    text = text.replace(/[;\"'&]/g,"");
	    text = text.replace(/[wｗ]{2,}$/,"わらわら");
	    text = text.replace(/[wｗ]$/,"わら");
	    text = text.replace(/http:\/\/[\w.%\&=/-?]+/,"ゆーあーるえるしょうりゃく");
	    this.talkqueue.push(text);
	    //obj.sayKotoeri(text);
	}
	return;
    },

    talk_bysaykotoeri:function(){
	if( this.talkqueue.length==0 ){
	    $('talker-left').value = this.talkqueue.length + "行";
	    return;
	}

	let obj = Components.classes["@miku39.jp/NLHCommentTalker;1"].createInstance(Components.interfaces.INLHCommentTalker);
	let text = this.talkqueue.shift();
	if( !obj.sayKotoeri(text) ){
	    this.talkqueue.unshift(text);
	}
	$('talker-left').value = this.talkqueue.length + "行";
    },

    test:function(){
	this.runProcess("","コメント読み上げのテストです");
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
	} catch (x) {
	}
    },
    destroy:function(){
	let prefs = NicoLivePreference.getBranch();
	prefs.setBoolPref("ext.comment-talker.enable", $('enable-comment-talker').checked);
	prefs.setIntPref("ext.comment-talker.program", $('use-what-talker-program').selectedIndex);
	prefs.setCharPref("ext.comment-talker.bouyomichan-server",$('bouyomichan-server').value );
	prefs.setIntPref("ext.comment-talker.length", $('nlhaddon-restrictlength').value);
	prefs.setUnicharPref("ext.comment-talker.format",$('nlhaddon-format').value);
    }
};

window.addEventListener("load", function(e){ NicoLiveTalker.init(); }, false);
window.addEventListener("unload", function(e){ NicoLiveTalker.destroy(); }, false);
