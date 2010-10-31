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

var NicoLiveCommentProcessor = {

    addAutoKotehan:function(userid,name){
	if( !$('nlhaddon-allowoverwrite').checked ){ // 上書きしない.
	    if( NicoLiveComment.namemap[userid] ){ // すでに設定済み.
		return;
	    }
	}
	NicoLiveComment.addKotehanDatabase(userid,name);
	NicoLiveComment.updateCommentViewer();
	NicoLiveComment.createNameList();
    },

    // http://www.nicovideo.jp/user/... から登録(サムネから取れない時)
    addRefProfileRegister2:function(user_id){
	if( NicoLiveComment.namemap[user_id] ){ // すでに設定済み.
	    return;
	}

	let req = new XMLHttpRequest();
	if( !req ) return;
	req.onreadystatechange = function(){
	    if( req.readyState==4 && req.status==200 ){
		try{
		    let text = req.responseText;
		    let name = text.match(/<h2><strong>(.*)<\/strong>/)[1];
		    if( name ){
			NicoLiveComment.addKotehanDatabase(user_id,name);
			NicoLiveComment.updateCommentViewer();
			NicoLiveComment.createNameList();
		    }
		} catch (x) {
		}
	    }
	};
	req.open('GET', 'http://www.nicovideo.jp/user/'+user_id );
	req.send("");
    },

    // http:/ext.nicovideo.jp/thumb_user/... から登録(こちら優先)
    addRefProfileRegister:function(user_id){
	if( NicoLiveComment.namemap[user_id] ){ // すでに設定済み.
	    return;
	}

	let req = new XMLHttpRequest();
	if( !req ) return;
	req.onreadystatechange = function(){
	    if( req.readyState==4 && req.status==200 ){
		try{
		    let text = req.responseText;
		    let name = text.match(/><strong>(.*)<\/strong>/)[1];
		    if( name ){
			NicoLiveComment.addKotehanDatabase(user_id,name);
			NicoLiveComment.updateCommentViewer();
			NicoLiveComment.createNameList();
		    }else{
			NicoLiveCommentProcessor.addRefProfileRegister2(user_id);
		    }
		} catch (x) {
		    NicoLiveCommentProcessor.addRefProfileRegister2(user_id);
		}
	    }
	};
	req.open('GET', 'http://ext.nicovideo.jp/thumb_user/'+user_id );
	req.send("");
    },

    newProcessCommentHook:function(chat){
	NicoLiveCommentProcessor.oldhook(chat);

	if( !$('auto-kotehan').checked ) return;

	if(chat.date<NicoLiveHelper.connecttime){ return; } // 過去ログ無視.
	if(chat.premium>=2) return;

	let dat = chat.text.match(/[@＠]([^0-9０-９\s@＠][^\s@＠]*?)$/);
	if(dat){
	    let name = dat[1];
	    if( name=="初見" || name=="確認" || name=="アンケート" || name=="削除" || name=="代理" ) return;
	    if( name=="○" || name=="×" || name=="△" || name=="□" || name=="◎") return;
	    NicoLiveCommentProcessor.addAutoKotehan(chat.user_id,name);
	}

	if( $('nlhaddon-ref-userprof').checked && chat.user_id.match(/^\d+$/) ){
	    // ユーザIDからプロフィール参照登録.
	    NicoLiveCommentProcessor.addRefProfileRegister(chat.user_id);
	}
    },

    changeFontScale:function(size){
	if( !size ){ debugprint('font size is default 9pt.'); size = 9; }
	$('comment_table').style.fontSize = size+"pt";
	$('nlhaddon-font-scale-value').value = size + "pt";
    },

    init:function(){
	debugprint('Multi-purpose Comment Processor init.');
	NicoLiveCommentProcessor.oldhook = NicoLiveHelper.processCommentHook;
	NicoLiveHelper.processCommentHook = function(chat){
	    NicoLiveCommentProcessor.newProcessCommentHook(chat);
	};
	NicoLiveCommentProcessor.changeFontScale( $('nlhaddon-comment-font-scale').value );
    },
    destroy:function(){
    }
};

window.addEventListener("load", function(e){ NicoLiveCommentProcessor.init(); }, false);
window.addEventListener("unload", function(e){ NicoLiveCommentProcessor.destroy(); }, false);
