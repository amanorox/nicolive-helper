/*
Copyright (c) 2012 amano <amano@miku39.jp>

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

var AutoCreateLive = {

    drive: function(e){
	var doc = e.target;
	var location = doc.location;

	if(location.href.match(/^http:\/\/live\.nicovideo\.jp\/watch\//i)) {
	    // 番組配信画面の場合
	    var request_id = location.href.match(/^http:\/\/live.nicovideo.jp\/watch\/(lv\d+)/i)[1];
	    if( doc.getElementById('flvplayer_container') ){
		// flvplayer_container があるので生放送のページだろう
		debugprint('This page has flvplayer_container.');
		NicoLiveHelper.postCommentMain( request_id, "","");
		var nexturl = location.href;
		AutoCreateLive.win.close();
		ShowNotice( LoadString('STR_SUCCESS_NEXT_BROADCAST') );
		setTimeout(function(){
			       NicoLiveHelper.closeBroadcastingTab(NicoLiveHelper.request_id, NicoLiveHelper.community);
			       NicoLiveWindow.openDefaultBrowser(nexturl, true);

			       if( NicoLivePreference.isAutoWindowClose(NicoLiveHelper.iscaster) ){
				   NicoLiveHelper.closeWindow();
				   return;
			       }

			       NicoLiveHelper.connectNewBroadcasting(request_id,"",true,request_id);
			   }, 5*1000);
		return;
	    }else{
		// 配信画面でないので状況確認
		try{
		    if( doc.getElementsByClassName('kaijo')[0].innerHTML.match(/この番組は順番待ち中です/)){
			// 枠取れたはずなのに待機ページになっている場合、定期的リロード.
			debugprint('page is reloaded.');
			setTimeout(function(){
				       doc.location.reload(true);
				   }, 15*1000 );
			return;
		    }
		} catch (x) {
		}

		// それ以外の場合.
		debugprint('page is reloaded.');
		setTimeout(function(){
			       doc.location.reload(true);
			   }, 15*1000 );
	    }
	}
	else if(location.href.match(/^http:\/\/live\.nicovideo\.jp\/editstream\/lv\d+/i)){
	    // 待機ページの場合.
	    if(doc.getElementById('error_box')){
		// エラー画面なので15秒待って枠取りし直す.
		debugprint('error occured');
		setTimeout( function(){
				doc.location.reload(true);
			    },10*1000);
		return;
	    }
	    
	    // 1秒間隔で入場できるかチェック.
	    if( doc.getElementById("que_end") ){
		debugprint('waiting...');
		AutoCreateLive._que_waiting_timer = setInterval(
		    function(){
			if(doc.getElementById("que_end").style.display!="none"){
			    clearInterval(AutoCreateLive._que_waiting_timer);
			    var id = location.href.match(/(lv\d+)/i);
			    location.href = 'http://live.nicovideo.jp/watch/'+id[1];
			}
		    }, 1000 );
	    }
	}
	// 番組配信画面ではない場合
	else{
	    if( location.href.match(/reuseid/)){
		try{
		    debugprint('update part #.');
		    var NodesTitle=doc.getElementsByName('title');
		    var vals = NodesTitle[0].value.match(/^(.*?)(part.*?)(\d+)(.*?)$/i);
		    if(vals){
			NodesTitle[0].value = vals[1]+vals[2]+( parseInt(vals[3])+1 ) + vals[4];
		    }
		    var reuseid = location.href.match(/reuseid=(\d+)/)[1];
		} catch (x) {
		}
	    }

	    // 事前処理
	    // 規約同意チェックボックスをチェック
	    var NodeKiyakuAccept=doc.getElementById('kiyaku_accept');
	    if(NodeKiyakuAccept){
		NodeKiyakuAccept.checked=true;
	    }
	    setTimeout(function(){
			   var NodeKiyakuAccept=doc.getElementById('kiyaku_accept');
			   if(NodeKiyakuAccept){
			       NodeKiyakuAccept.checked=true;
			   }
		       },300);
	    
	    // タイマーを設定
	    setTimeout(function(){
			   var NodeKiyakuAccept=doc.getElementById('kiyaku_accept');
			   if(NodeKiyakuAccept){
			       NodeKiyakuAccept.checked=true;
			   }
			   // 遷移実行
			   var NodeWaiting = doc.getElementById('waiting');
			   var NodeSubmitOk=doc.getElementById('submit_ok');
			   var NodeSubmitOk2=doc.getElementById('submit_ok2');
			   var NodeSubmitBack=doc.getElementById('submit_back');

			   if(NodeWaiting){
			       // NodeWaiting.click()が呼べないので、元が行っていることをコピー.
			       doc.getElementById('is_wait').value = 'wait';
			       if(NodeSubmitOk){
				   NodeSubmitOk.disabled = true;
				   NodeSubmitOk.src = NodeSubmitOk.src.replace(/(.*)(\w+)\.gif/, "$1$2_disabled.gif");
			       }
			       if(NodeSubmitOk2){
				   NodeSubmitOk2.disabled = true;
				   NodeSubmitOk2.src = NodeSubmitOk2.src.replace(/(.*)(\w+)\.gif/, "$1$2_disabled.gif");
			       }
			       if(NodeSubmitBack) {
				   NodeSubmitBack.disabled = true;
				   NodeSubmitBack.src = NodeSubmitBack.src.replace(/(.*)(\w+)\.gif/, "$1$2_disabled.gif");
			       }
			       window.setTimeout(function (b) { doc.getElementById("esf").submit(); }, 100);
			       return;
			   }
	
			   // 送信ボタンがある場合は送信
			   if(NodeSubmitOk){
			       doc.getElementById("esf").submit();
			   }
		       },2000);
	}
    },


    create: function( editurl ){
	// http://live.niconico.com/editstream
	// http://live.nicovideo.jp/editstream
	this.win = NicoLiveWindow.openInAppBrowser(editurl);
	debugprint(this.win);
	this.win.addEventListener('load',
				  function(e){
				      try{
					  e.target.getElementById('page').addEventListener('DOMContentLoaded', AutoCreateLive.drive, true);
				      } catch (x) {
					  debugprint(x);
				      }
				  },true);
    }

};
