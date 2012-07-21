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

/**
 * ニコニコ生放送ヘルパー for Firefox 3.6
 */
Components.utils.import("resource://nicolivehelpermodules/usernamecache.jsm");
Components.utils.import("resource://nicolivehelpermodules/httpobserve.jsm");
Components.utils.import("resource://nicolivehelpermodules/alert.jsm");

/*
 * inplayがtrueになるとき
 * ・/playを受け取ったとき
 * ・接続時にすでに再生されているとき
 * ・ジングル再生要求を出したとき
 * 
 * inplayがfalseになるとき
 * ・最後に再生した動画の再生時間が経過したとき
 */

var NicoLiveHelper = {
    requestqueue: [],
    stock: [],
    playlist: [],
    error_req: {},
    request_setno: 0,
    stock_setno: 0,

    request_id: "",    // 生放送ID(lvXXXXXXX).
    addr: "",
    port: 0,
    thread: "",        // コメントサーバスレッド.
    ticket: "",

    user_id:"",        // ユーザーID(数字のやつ)
    is_premium:"0",    // プレミアムかどうか.

    last_res: 0,       // リスナーコメするのに必要なコメ番.
    postkey:"",        // リスナーコメするのに必要なキー.

    serverconnecttime: 0, // 接続したときのサーバの時刻(UNIX time).
    connecttime: 0,       // 接続したときのローカルPC時刻(UNIX time).
    secofweek: 604800,    // 1週間の秒数(60*60*24*7).

    starttime: 0,          // 放送の始まった時刻(UNIX time) by getplayerstatus.
    endtime: 0,            // 放送の終わる時刻(UNIX time) by getpublishstatus. ロスタイムになると 0 になる.
    musicstarttime: 0,     // 曲の再生開始時刻(UNIX time) /playを受け取った時刻.
    musicendtime: 0,       // 曲の終了予定時刻(UNIX time) 上記+再生時間.

    iscaster: false,       // 主フラグ.
    inplay: false,         // 再生中フラグ.
    allowrequest: true,    // リクを受け付けるフラグ.
    isautoplay: false,     // 自動再生フラグ.
    israndomplay: false,   // ランダム再生フラグ.
    isconsumptionrateplay: false, // リク消費率順再生フラグ.
    musicinfo: {},         // 再生中の動画情報.
    anchor: {},            // アンカー処理用.
    userdefinedvalue: {},  // {json}用.

    undo_stack: [],        // アンドゥ処理関数のスタック

    commentstate: COMMENT_STATE_NONE, // コメントの状態遷移用(なし、動画情報送信中、動画情報送信終了).
    commentview: COMMENT_VIEW_NORMAL, // 上コメ表示状態.

    _prepared: "",      // 先読みした動画.
    _playmusictime: 0,  // playMusicを呼び出した時刻.
    _extendcnt: 0,      // 延長処理を呼んだ回数(延長すると0に戻る).

    twitterinfo: {},  // Twitter投稿API
    product_code: {}, // 作品コード.

    // リクを受け付けるかどうかチェック.
    /**
     * リクエスト受け付けチェック.
     * @param xml getthumbinfoで取得したxml
     * @param comment_no リク主のコメント番号(その他は0)
     * @param is_self_request 自貼りのときに真
     *
     * -1 : xmlがおかしい、動画情報が取得できない
     * -2 : リクエストを受け付けていない(NG含む)
     * -3 : 新着7日規制
     * -4 : 再生済み
     * -5 : リク済み
     * -6 : リクエスト縛り条件満たしてない
     * -7 : 枠内に収まらない
     * -8 : 生放送で再生できない
     */
    checkToAcceptRequest: function(xml, comment_no, is_self_request){
	if(xml.getElementsByTagName('error').length){ // 動画がない.
	    return {code:-1,msg:NicoLivePreference.msg.deleted,movieinfo:{}};
	}
	let info = this.xmlToMovieInfo(xml);
	if( !info ){
	    ShowNotice("コメント番号 "+comment_no+" のリクエストは動画情報を取得できませんでした");
	    return {code:-1,msg:"",movieinfo:{}};
	}

	if( NicoLivePreference.ngvideos["_"+info.video_id] ){
	    // NG動画のチェック.
	    return {code:-2,msg:NicoLivePreference.msg.ngvideo,movieinfo:info};
	}

	if(NicoLivePreference.do_classify || NicoLivePreference.isMikuOnly() ){
	    let str = new Array();
	    // 半角小文字で正規化してトレーニングをしているので、分類するときもそのように.
	    for(let i=0,tag; tag=info.tags[i];i++){
		str.push(ZenToHan(tag.toLowerCase()));
	    }
	    if( info.overseastags ){
		// 日本タグだと編集されやすく海外タグに重要な情報が書かれている場合もあるので.
		for(let i=0,tag; tag=info.overseastags[i];i++){
		    str.push(ZenToHan(tag.toLowerCase()));
		}
	    }
	    info.classify = NicoLiveClassifier.classify(str);
	}

	if( !this.allowrequest ){
	    // リクを受け付けていない
	    // アンカーチェックはここでやる.
	    if( this.anchor.start && this.anchor.end &&
		this.anchor.start <= comment_no && comment_no <= this.anchor.end ){
		    // アンカー範囲内なので無問題.
	    }else{
		return {code:-2,msg:NicoLivePreference.msg.notaccept,movieinfo:info};
	    }
	}
	// 生放送での引用拒否チェック.
	if( info.no_live_play ){
	    return {code:-8,msg:NicoLivePreference.msg.no_live_play,movieinfo:info};
	}

	if(NicoLivePreference.limitnewmovie && !is_self_request){
	    // 7日内に投稿された動画.
	    let sevendaysago = GetCurrentTime()-this.secofweek;
	    let d = new Date(sevendaysago*1000);
	    d = new Date( d.toLocaleFormat("%Y/%m/%d 0:00:00") );
	    d = d.getTime()/1000;
	    if( info.first_retrieve >= d ){
		return {code:-3,msg:NicoLivePreference.msg.newmovie,movieinfo:info};
	    }
	}

	// リクエストキューに既にある動画.
	if(this.isRequestedMusic(info.video_id)){
	    return {code:-5,msg:NicoLivePreference.msg.requested,movieinfo:info};
	}

	if(!is_self_request && !NicoLivePreference.accept_playedvideo && this.isPlayedMusic(info.video_id)){
	    // 再生済みを受け付けない(自貼り除く).
	    return {code:-4,msg:NicoLivePreference.msg.played,movieinfo:info};
	}
	if(!is_self_request && NicoLivePreference.accept_playedvideo ){
	    let n = NicoLivePreference.n_min_old_playedvideo_to_allow * 60; // n分以上前に再生したものは許可.
	    let now = GetCurrentTime();
	    if( this.playlist["_"+info.video_id] >= now-n ){
		return {code:-4,msg:NicoLivePreference.msg.played,movieinfo:info};
	    }
	}

	// リクエスト制限のチェック.
	if(!is_self_request && NicoLivePreference.restrict.dorestrict){
	    let msg = this.checkMovieRestriction(info);
	    if( msg!=null ){
		return {code:-6,"msg":msg,movieinfo:info};
	    }
	}

	if(NicoLivePreference.isMikuOnly()){
	    let ismiku = false;

	    // タグにミクオリジナルがあればほぼ間違いない.
	    let i,tag;
	    for(i=0;tag=info.tags[i];i++){
		if(tag.indexOf('ミクオリジナル')!=-1){
		    ismiku = true; break;
		}
	    }
	    if(info.overseastags){
		for(i=0;tag=info.overseastags[i];i++){
		    if(tag.indexOf('ミクオリジナル')!=-1){
			ismiku = true; break;
		    }
		}
	    }

	    if(!ismiku){
		if( info.classify['class']=='Miku' ){
		    ismiku = true;
		}else{
		    // タイトルに「ミク」「オリジナル」が含まれていれば多分OK.
		    if( info.title.indexOf('ミク')!=-1 && info.title.indexOf('オリジナル')!=-1 ){
			ismiku = true;
		    }
		}
	    }

	    let str;
	    if( !ismiku ){
		debugprint(info.video_id+":ミクオリジナル曲ではなさそう");
		str = "ミクうたと判断できなかったため主判断をお待ちください";
		return {code:-6,msg:str,movieinfo:info};
	    }
	}

	let success_msg = NicoLivePreference.msg.accept;

	// アンカー受付の個数チェック.
	if( !this.allowrequest ){
	    if( this.anchor.start && this.anchor.end && this.anchor.start <= comment_no && comment_no <= this.anchor.end ){
		this.anchor.counter++;
		if( this.anchor.num && this.anchor.num < this.anchor.counter ){
		    return {code:-2,msg:NicoLivePreference.msg.notaccept,movieinfo:info};
		}
		success_msg = "";
	    }
	}

	// 枠内収まるかチェック.
	if(NicoLivePreference.accept_within_livespace){
	    let t = this.getTotalMusicTime(true);
	    let sec = t.min*60 + t.sec; // リクの残り時間.
	    let remain = this.endtime - this.musicendtime - sec; // 枠の残り時間.

	    if( remain < info.length_ms/1000 ){
		return {code:-7,msg:NicoLivePreference.msg.within_livespace,movieinfo:info};
	    }
	}

	// code:0を返すことで受け付ける.
	return {code:0,msg:success_msg,movieinfo:info};
    },


    // リク制限のチェック.
    checkMovieRestriction:function(videoinfo){
	let restrict = NicoLivePreference.restrict;

	if(restrict.mylist_from>0){
	    if( videoinfo.mylist_counter<restrict.mylist_from ){
		return NicoLivePreference.msg.lessmylists;
	    }
	}
	if(restrict.mylist_to>0){
	    if( videoinfo.mylist_counter>restrict.mylist_to ){
		return NicoLivePreference.msg.greatermylists;
	    }
	}
	if(restrict.view_from>0){
	    if( videoinfo.view_counter<restrict.view_from ){
		return NicoLivePreference.msg.lessviews;
	    }
	}
	if(restrict.view_to>0){
	    if( videoinfo.view_counter>restrict.view_to ){
		return NicoLivePreference.msg.greaterviews;
	    }
	}
	if(restrict.videolength>0){
	    // 指定秒数以下かどうか.
	    if( videoinfo.length_ms/1000 > restrict.videolength ){
		return NicoLivePreference.msg.longertime;
	    }
	}

	let date_from,date_to;
	date_from = restrict.date_from.match(/\d+/g);
	date_to   = restrict.date_to.match(/\d+/g);
	date_from = new Date(date_from[0],date_from[1]-1,date_from[2]);
	date_to   = new Date(date_to[0],date_to[1]-1,date_to[2],23,59,59);
	if( date_to-date_from >= 86400000 ){ /* 86400000は1日のミリ秒数 */
	    // 投稿日チェック
	    let posted = videoinfo.first_retrieve*1000;
	    if( date_from <= posted && posted <= date_to ){
		// OK
	    }else{
		return NicoLivePreference.msg.outofdaterange;
	    }
	}

	// タグにキーワードが含まれていればOK
	if(restrict.tag_include.length>0){
	    let tagstr = videoinfo.tags.join(' ');
	    if( videoinfo.overseastags ){
		tagstr += videoinfo.overseastags.join(' ');
	    }
	    let flg = false;
	    for(let i=0,tag;tag=restrict.tag_include[i];i++){
		let reg = new RegExp(tag,"i");
		if( tagstr.match(reg) ){
		    // 含まれている
		    flg = true;
		}
	    }
	    if( !flg ){
		restrict.requiredkeyword = restrict.tag_include.join(',');
		return NicoLivePreference.msg.requiredkeyword;
	    }
	}

	// タグにキーワードが含まれていなければOK
	if(restrict.tag_exclude.length>0){
	    let tagstr = videoinfo.tags.join(' ');
	    if( videoinfo.overseastags ){
		tagstr += videoinfo.overseastags.join(' ');
	    }
	    let flg = true;
	    let tag;
	    for(let i=0;tag=restrict.tag_exclude[i];i++){
		let reg = new RegExp(tag,"i");
		if( tagstr.match(reg) ){
		    // 含まれている
		    flg = false;
		    break;
		}
	    }
	    if( !flg ){
		restrict.forbiddenkeyword = tag;
		return NicoLivePreference.msg.forbiddenkeyword;
	    }
	}

	// 1.1.35+
	if( restrict.bitrate ){
	    if( videoinfo.highbitrate > restrict.bitrate ){
		return NicoLivePreference.msg.highbitrate;
	    }
	}

	// 1.1.22+
	// タイトルにキーワードが含まれていればOK
	if(restrict.title_include.length>0){
	    let tagstr = videoinfo.title;
	    let flg = false;
	    for(let i=0,tag;tag=restrict.title_include[i];i++){
		let reg = new RegExp(tag,"i");
		if( tagstr.match(reg) ){
		    // 含まれている
		    flg = true;
		}
	    }
	    if( !flg ){
		restrict.requiredkeyword = restrict.title_include.join(',');
		return NicoLivePreference.msg.requiredkeyword_title;
	    }
	}

	// タイトルにキーワードが含まれていなければOK
	if(restrict.title_exclude.length>0){
	    let tagstr = videoinfo.title;
	    let flg = true;
	    let tag;
	    for(let i=0;tag=restrict.title_exclude[i];i++){
		let reg = new RegExp(tag,"i");
		if( tagstr.match(reg) ){
		    // 含まれている
		    flg = false;
		    break;
		}
	    }
	    if( !flg ){
		restrict.forbiddenkeyword = tag;
		return NicoLivePreference.msg.forbiddenkeyword_title;
	    }
	}
	return null;
    },

    // コメント処理のフック用(新)
    processCommentHook:function(chat){
	// chat.isNGWord に NG判定が入っている.
    },

    // リスナーコメント送信予約.
    reserveListenerCommentSending: function(cno, text, mail){
	debugprint(cno+"でコメント「"+text+"」を送信します");
	this._target_comment_no = cno;
	this._sending_text = text;
	this._sending_mail = mail;
    },

    // ユーザーカスタムコメントフィルタを実行する
    filterComment:function(chat){
	if( NicoLivePreference.do_customscript && NicoLivePreference.customscript.commentfilter ){
	    try{
		eval( NicoLivePreference.customscript.commentfilter );
	    } catch (x) {
	    }
	}
    },

    // コメントを処理する(新).
    processComment2: function(chat){
	// /telopで始まる行はニコニコ実況のものなので処理しなくてok.
	if(chat.text.indexOf("/telop")==0 ||
	   chat.text.indexOf("/nspanel")==0 ) return;

	NicoLiveHelper.processCommentHook(chat);

	if( NicoLiveHelper._target_comment_no && NicoLiveHelper._target_comment_no<=chat.no ){
	    NicoLiveHelper.postListenerComment( NicoLiveHelper._sending_text, NicoLiveHelper._sending_mail );
	    NicoLiveHelper._target_comment_no = 0;
	}

	NicoLiveComment.push(chat);   // こちらはコメントログの記録部分.
	NicoLiveComment.addRow(chat); // こちらはコメントタブの表示部分(コテハン設定等が変わるとリフレッシュ).
	
	// 生主のときは過去ログ無視.
	// タイムシフトも過去ログ無視.
	if(NicoLiveHelper.iscaster && chat.date<NicoLiveHelper.connecttime || NicoLiveHelper._timeshift){ return; }

	if( chat.date >= NicoLiveHelper.connecttime ){
	    // コメントフィルタは接続時以降のコメントのみ対象
	    NicoLiveHelper.filterComment(chat);
	}

	if((chat.premium==3||chat.premium==2) && chat.text=="/disconnect"){
	    // 放送終了時.
	    NicoLiveHelper.finishBroadcasting();
	}
	if( chat.premium>3 ){
	    // premium>3 はニコニコの中の人とか. 主コメが上書きされるので動画情報を復元.
	    // BSPコメはpremium=7でくるけどどうするかな…ということで.
	    if(chat.text.indexOf("/press")!=0 && chat.text.indexOf("/koukoku")!=0){
		NicoLiveHelper.setupRevertMusicInfo();
	    }
	}

	switch(chat.premium){
	case 3:
	    if( chat.date < NicoLiveHelper.connecttime || NicoLiveHelper._timeshift ) return;
	    // 主コメの処理.
	    let dat;
	    // /play smile:sm00000 main "title"
	    dat = chat.text.match(/^\/play(sound)*\s*smile:(((sm|nm|ze|so)\d+)|\d+)\s*(main|sub)\s*\"(.*)\"$/);
	    if(dat){
		// 再生コマンドが飛んできたときは次曲タイマしかけたりプレイリスト記録したり.
		let vid = dat[2];
		NicoLiveHelper.current_video_id = vid;
		NicoLiveHelper.musicstarttime = GetCurrentTime();
		NicoLiveHelper.inplay = true;
		if( NicoLiveHelper.iscaster ){
		    if( NicoLiveHelper.musicinfo.video_id!=vid ){
			// ツール上再生ボタンから再生した場合、musicinfo.video_idと一致するので、
			// 一致しないときは別の手段で再生しているために現在再生動画の情報を取得する.
			NicoLiveHelper.setCurrentVideoInfo(vid,true);
		    }else{
			NicoLiveHelper.musicendtime = Math.floor(NicoLiveHelper.musicstarttime + NicoLiveHelper.musicinfo.length_ms/1000)+1;
			NicoLiveHelper.setupPlayNextMusic(NicoLiveHelper.musicinfo.length_ms);
			// 直前に再生した動画と同じ動画IDをコメントしたときに動画情報を送らないように.
			if(NicoLivePreference.nocomment_for_directplay && NicoLiveHelper._comment_video_id==vid){
			    NicoLiveHelper.commentstate = COMMENT_STATE_NONE;
			    return;
			}
			NicoLiveHelper.sendVideoInfo();
			NicoLiveHelper.addPlayListText(NicoLiveHelper.musicinfo);
			NicoLiveHelper.checkVideoDeletedAndPlayNext(NicoLiveHelper.musicinfo.video_id);
		    }
		}else{
		    // リスナーの場合は動画情報を持っていないので取ってくる.
		    NicoLiveHelper.setCurrentVideoInfo(vid,false);
		}
		return;
	    }

	    // 延長メッセージがきたら、終了時刻を更新する
	    /*
	    if( chat.text.indexOf("/info 3")==0 ){
		if( !NicoLiveHelper.iscaster ){
		    NicoLiveHelper.updateEndTime( NicoLiveHelper.request_id );
		}else{
		    NicoLiveHelper.getToken( NicoLiveHelper.request_id );
		}
		NicoLiveHelper._extendcnt = 0;
	    }
	     */

	    if(!NicoLiveHelper.iscaster) break;

	    if( chat.text.indexOf("/stop")==0 ){
		// 再生停止されたら自動再生も止める.
		clearInterval(NicoLiveHelper._playnext);
		clearInterval(NicoLiveHelper._prepare);
		clearInterval(NicoLiveHelper._playend);
		clearInterval(NicoLiveHelper._revertcommentid);
		NicoLiveHelper.inplay = false;
		return;
	    }

	    // アンケート開始.
	    dat = chat.text.match(/^\/vote\s+start\s+(.*)/);
	    if(dat){
		let str = dat[1];
		let qa = CSVToArray(str,"\s+");
		qa[0] = "Q/"+qa[0];
		for(let i=1,s;s=qa[i];i++){
		    qa[i] = "A"+i+"/" + s;
		}
		NicoLiveHelper.postCasterComment(qa.join(","),"");
		NicoLiveHelper.officialvote = qa;
		return;
	    }

	    // アンケート結果表示.
	    dat = chat.text.match(/^\/vote\s+showresult\s+(.*)/);
	    if(dat){
		let str = dat[1];
		let result = str.match(/\d+/g);
		let graph = "";
		let color = ["#ff0000","#00ff00","#0000ff",
			     "#ffffff","#ffff00","#00ffff",
			     "#ff00ff","#888888","#ffff88"];
		str = "";
		for(let i=1,a;a=NicoLiveHelper.officialvote[i];i++){
		    str += NicoLiveHelper.officialvote[i] + "(" + (result[i-1]/10).toFixed(1) + "%) ";
		    graph += "<font color=\""+color[i-1]+"\">";
		    for(let j=0;j<result[i-1]/10;j++){
			graph += "|";
		    }
		    graph += "</font>";
		}
		NicoLiveHelper.postCasterComment("/perm "+NicoLiveHelper.officialvote[0]+"<br>"+graph,"hidden");
		NicoLiveHelper.postCasterComment(str,"");
		return;
	    }

	    if( chat.text.indexOf("/vote stop")==0 ){
		// /vote stopをすると運営コメントが消されるので、動画情報を復元.
		NicoLiveHelper.revertMusicInfo();
		return;
	    }

	    if( chat.text.indexOf("/perm")==0 && chat.mail.indexOf("hidden")!=-1 ){
		NicoLiveHelper.commentview = COMMENT_VIEW_HIDDEN_PERM;
		clearInterval(NicoLiveHelper._commentstatetimer);
		return;
	    }
	    if( chat.mail.indexOf("hidden")!=-1 ){
		// hiddenだけの場合は、15秒間だけHIDDEN_PERM.
		NicoLiveHelper.commentview = COMMENT_VIEW_HIDDEN_PERM;
		clearInterval(NicoLiveHelper._commentstatetimer);
		NicoLiveHelper._commentstatetimer = setInterval(
		    function(){
			NicoLiveHelper.commentview = COMMENT_VIEW_NORMAL;
			clearInterval(NicoLiveHelper._commentstatetimer);
		    }, 15*1000 );
	    }

	    if( chat.text.indexOf("/cls")==0 || chat.text.indexOf("/clear")==0 ){
		clearInterval(NicoLiveHelper._sendclsid);

		NicoLiveHelper.commentview = COMMENT_VIEW_NORMAL;
		if( 'function'==typeof NicoLiveHelper.postclsfunc ){
		    NicoLiveHelper.postclsfunc();
		    NicoLiveHelper.postclsfunc = null;
		}
		return;
	    }
	    break;

	default:
	    // リスナーコメの処理.
	    if( chat.text.indexOf("/del")!=0 ){
		let sm = chat.text.match(/((sm|nm)\d+)/);
		if(sm){
		    let selfreq = chat.text.match(/自(貼|張)/);
		    try{
			let code;
			code = chat.text.match(/(...[-+=/]....[-+=/].)/)[1];
			code = code.replace(/[-+=/]/g,"-"); // JWID用作品コード.
			NicoLiveHelper.product_code["_"+sm[1]] = code;
		    } catch (x) {
		    }
		    NicoLiveHelper.addRequest(sm[1], chat.no, chat.user_id, selfreq);
		    return;
		}
		if( NicoLivePreference.allow_10digit ){
		    let sm = chat.text.match(/(\d{10})/);
		    if(sm){
			let selfreq = chat.text.match(/自(貼|張)/);
			if( sm[1]!=8888888888 ){
			    NicoLiveHelper.addRequest(sm[1], chat.no, chat.user_id, selfreq);
			    return;
			}
		    }
		}
	    }

	    if(!NicoLiveHelper.iscaster) break;

	    if( NicoLivePreference.post_pagetitle ){
		let uri = chat.text.match(/(h?ttps?:\/\/[-_.!~*\'()a-zA-Z0-9;/\?:@&=+$,%#]+)/);
		if( uri ){
		    NicoLiveHelper.checkURI(uri[0], chat.no);
		}
	    }

	    switch(chat.text){
	    case "/ver":
	    case "/version":
		NicoLiveHelper.postCasterComment("NicoLive Helper "+GetAddonVersion(),"");
		break;
	    default:
		NicoLiveHelper.processListenersCommand(chat);
		break;
	    }
	    break;
	}
    },

    // 動画の存在をチェックして、削除されてるようなら次の再生を仕掛ける.
    checkVideoDeletedAndPlayNext:function(video_id){
	if( !NicoLivePreference.check_delete ) return;
	let f = function(xml, req){
	    if( req.readyState==4 && req.status==200 ){
		let music = NicoLiveHelper.xmlToMovieInfo(xml);
		if( !music ){
		    ShowNotice("動画情報を取得できなかったため15秒後にスキップします");
		    NicoLiveHelper.setupPlayNextMusic(15*1000);
		}
	    }
	};
	NicoApi.getthumbinfo( video_id, f );
    },

    // コメを処理する(各種追加機能の古いバージョンでのフック用).
    processComment: function(xmlchat){},

    processListenersCommand:function(chat){
	if( !NicoLivePreference.listenercommand.enable ) return;

	let command = chat.text.match(/^\/(\w+)\s*(.*)/);
	if(command){
	    let tmp,n,str;
	    switch(command[1]){
	    case 's':
		str = this.replaceMacros(NicoLivePreference.listenercommand.s,chat);
		if(str) this.postCasterComment(str,"");
		break;

	    case 'dice':
		// 2d+3 とか 4D+2 とか 3D10-2 とか.
		tmp = command[2].match(/(\d+)[Dd](\d*)([+-])?(\d*)/);
		if(tmp){
		    n = parseInt(tmp[1]);
		    let face = parseInt(tmp[2]);
		    let sign = tmp[3];
		    let offset = parseInt(tmp[4]);
		    if( !face || face<0 ) face = 6;
		    if( !sign ) sign = "+";
		    if( !offset ) offset = 0;

		    let result = 0;
		    let resultstr = new Array();
		    for(let i=0; i<n && i<30; i++){
			let dice = GetRandomInt(1,face);
			resultstr.push(dice);
			result += dice;
		    }
		    result = eval("result "+sign+" offset;");
		    resultstr = "["+result + "] = (" + resultstr.join("+")+")" + sign + offset;
		    this.postCasterComment(">>"+chat.no+" "+resultstr,"");
		}
		break;

	    case 'del':
		let target;
		if(!command[2]) break;
		let cancelnum = -1;

		if(command[2]=='all'){
		    target = null;
		    cancelnum = this.cancelRequest(chat.user_id, target);
		}
		tmp = command[2].match(/(sm|nm)\d+/);
		if(tmp){
		    target = tmp[0];
		    cancelnum = this.cancelRequest(chat.user_id, target);
		}
		if(cancelnum<0) break;
		chat.cancelnum = cancelnum;
		str = this.replaceMacros(NicoLivePreference.listenercommand.del,chat);
		if(str) this.postCasterComment(str,"");
		// リクエスト削除した分、減らさないとネ.
		this.request_per_ppl[chat.user_id] -= cancelnum;
		if(this.request_per_ppl[chat.user_id]<0) this.request_per_ppl[chat.user_id] = 0;
		break;
	    }
	}
    },

    /** 放送の終了処理.
     * 接続を切ったり、タブを閉じたり、次枠の準備に飛ばしたり、etc.
     */
    finishBroadcasting:function(){
	let autolive = $('automatic-broadcasting').hasAttribute('checked');
	if( autolive ){
	    NicoLiveHelper.autoNextBroadcasting();
	}

	let prefs = NicoLivePreference.getBranch();
	NicoLiveComment.releaseReflector();
	if( NicoLiveHelper.isAutoWindowClose() ){
	    // 自動放送モードのときは自動枠取り側でウィンドウを閉じるので
	    // ここでは閉じない
	    if( !autolive || !this.iscaster ){
		if( !AutoCreateLive.win ){
		    NicoLiveHelper.closeWindow();
		}
	    }
	}else{
	    PlayAlertSound();
	    let msg = NicoLiveHelper.request_id+':'+NicoLiveHelper.title+' は終了しました';
	    ShowNotice(msg,true);
	    //AlertPrompt(NicoLiveHelper.request_id+' は終了しました',NicoLiveHelper.request_id);
	    NicoLiveHelper._donotshowdisconnectalert = true;
	    NicoLiveHelper.close();
	    if( NicoLivePreference.isAutoTabClose() ){
		NicoLiveHelper.closeBroadcastingTab(NicoLiveHelper.request_id, NicoLiveHelper.community);
	    }
	}
    },

    isAutoWindowClose:function(){
	return NicoLivePreference.isAutoWindowClose(this.iscaster);
    },

    closeWindow:function(){
	let prefs = NicoLivePreference.getBranch();
	let delay = 0;
	try {
	    delay = prefs.getIntPref("closing-delay");
	    debugprint(delay);
	} catch (x) {
	    delay = 1;
	}
	setTimeout(function(){
		       if( NicoLivePreference.isAutoTabClose() ){
			   NicoLiveHelper.closeBroadcastingTab(NicoLiveHelper.request_id, NicoLiveHelper.community);
		       }
		       NicoLiveHelper._donotshowdisconnectalert = true;
		       NicoLiveHelper.close();
		       window.close();
		   },delay);
    },

    // 生放送のページのタブを閉じる.
    closeBroadcastingTab:function(request_id, community_id){
	let wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
	let browserEnumerator = wm.getEnumerator("navigator:browser");
	let url1 = "http://live.nicovideo.jp/watch/"+request_id;
	let url2 = "http://live.nicovideo.jp/watch/"+community_id;

	while(browserEnumerator.hasMoreElements()) {
	    let browserInstance = browserEnumerator.getNext().gBrowser;
	    // browser インスタンスの全てのタブを確認する.
	    let numTabs = browserInstance.tabContainer.childNodes.length;
	    for(let index=0; index<numTabs; index++) {
		let currentBrowser = browserInstance.getBrowserAtIndex(index);
		if (currentBrowser.currentURI.spec.match(url1) || currentBrowser.currentURI.spec.match(url2)) {
		    try{
			window.opener.gBrowser.removeTab( browserInstance.tabContainer.childNodes[index] );
		    } catch (x) {
		    }
		    return;
		}
	    }
	}
    },

    // URIをチェックする.
    checkURI:function(uri, comment_no){
	let req = new XMLHttpRequest();
	if( !req ) return;
	req.open("GET",uri);
	req.onreadystatechange = function(){
	    if( req.readyState==4 && req.status==200 ){
		let title;
		try{
		    let tmp = req.responseText.replace(/[\r\n]/g,"");
		    title = tmp.match(/<title>(.*)<\/title>/i)[1];
		    debugprint("Title:"+title);

		    NicoLiveHelper.postCasterComment(">>"+comment_no+" "+title,"");
		} catch (x) {
		    debugprint(x);
		}
	    }
	};
	req.send("");
    },

    // リクエストをキャンセルする.
    cancelRequest:function(user_id,vid){
	let tmp = new Array();
	let cnt=0;
	// 単純なループの中で単純にspliceで取るわけにはいかないので
	// 削除しない動画リスト作って取り替えることに
	for(let i=0,item;item=this.requestqueue[i];i++){
	    if(item.user_id==user_id){
		if( !vid || item.video_id==vid ){
		    cnt++;
		    continue;
		}
	    }
	    tmp.push(item);
	}
	this.requestqueue = tmp;
	NicoLiveRequest.update(this.requestqueue);
	return cnt;
    },

    extractComment: function(xmlchat){
	let chat = {};
	chat.text = xmlchat.textContent;
	chat.date      = xmlchat.getAttribute('date');
	chat.premium   = xmlchat.getAttribute('premium');
	chat.user_id   = xmlchat.getAttribute('user_id');
	chat.no        = xmlchat.getAttribute('no');
	chat.anonymity = xmlchat.getAttribute('anonymity');
	chat.mail      = xmlchat.getAttribute('mail') || "";
	chat.name      = xmlchat.getAttribute('name') || "";
	chat.locale    = xmlchat.getAttribute('locale') || "";
	chat.origin    = xmlchat.getAttribute('origin') || "";

	chat.date      = chat.date && parseInt(chat.date) || 0;
	chat.premium   = chat.premium && parseInt(chat.premium) || 0;
	chat.user_id   = chat.user_id || "0";
	chat.anonymity = chat.anonymity && parseInt(chat.anonymity) || 0;
	chat.no        = chat.no && parseInt(chat.no) || 0;
	chat.comment_no = chat.no;

	this.last_res = chat.no;
	return chat;
    },

    // 指定のvideo_idの情報をmusicinfoにセット(プログレスバーのため)
    // this.musicstarttimeはあらかじめセットしておくこと.
    setCurrentVideoInfo:function(video_id,setinterval, is_retry){
	// setinterval=trueのときは次曲再生のタイマーをしかける(生主用).
	//debugprint(video_id+'のサムネイルを取得中...');
	let f = function(xml, req){
	    if( req.readyState==4 ){
		if( req.status==200 ){
		    let music = NicoLiveHelper.xmlToMovieInfo(req.responseXML);
		    if( music ){
			if( NicoLiveHelper.current_video_id!=video_id ){
			    //debugprint(video_id+'は/playで指定された動画と異なるため無視します');
			    return;
			}
			NicoLiveHelper.musicinfo = music;
			NicoLiveHelper.musicinfo.mylist = NicoLiveMylist.isVideoExists(video_id);
			let du = Math.floor(NicoLiveHelper.musicinfo.length_ms/1000)+1;
			NicoLiveHelper.musicendtime   = NicoLiveHelper.musicstarttime+du;
			
			if(setinterval){
			    // 手動で/playコマンドを入力したときにここに来る.
			    NicoLiveHelper.commentstate = COMMENT_STATE_NONE;
			    NicoLiveHelper.setupPlayNextMusic(music.length_ms);
			    if( !NicoLivePreference.nocomment_for_directplay ){
				NicoLiveHelper.sendVideoInfo();
			    }
			    NicoLiveHelper.inplay = true;
			}
			NicoLiveHelper.addPlayList(music);
		    }else{
			if( setinterval ){
			    // 動画情報取れない(削除、非表示)みたいなのでスキップ.
			    ShowNotice("動画情報を取得できなかったため15秒後にスキップします");
			    NicoLiveHelper.setupPlayNextMusic(15*1000);
			}
		    }
		}else{
		    if( !is_retry ){
			setTimeout( function(){ NicoLiveHelper.setCurrentVideoInfo(video_id,setinterval,true); }, 5*1000 );
			debugprint('動画情報を取得できませんでした:'+req.status);
		    }
		}
	    }
	};

	NicoApi.getthumbinfo( video_id, f );
    },

    // 与えられたstrがP名かどうか.
    isPName:function(str){
	if( pname_whitelist["_"+str] ){
	    return true;
	}
	if( NicoLivePreference.no_auto_pname ) return false;
	if(str.match(/(PSP|アイドルマスターSP|m[a@]shup|drop|step|overlap|vocaloid_map|mikunopop|mikupop|ship|dump|sleep)$/i)) return false;
	if(str.match(/(M[A@]D|joysound|MMD|HD|3D|vocaloud|world|頭文字D|イニシャルD|(吸血鬼|バンパイア)ハンターD|4D|TOD|oid|clannad|2nd|3rd|second|third|append|CD|DVD|solid|vivid|hard)$/i)) return false;
	let t = str.match(/.*([^jO][pP]|jP)[)]?$/);
	if(t){
	    return true;
	}
	// D名
	t = str.match(/.*[^E][D]$/);
	if(t){
	    return true;
	}
	return false;
    },

    // P名文字列を取得.
    getPName:function(item){
	// DBに設定してあるP名があればそれを優先.
	let pname = NicoLiveDatabase.getPName(item.video_id);
	if(!pname){
	    pname = new Array();
	    let i,j,tag;
	    try{
		// まずはP名候補をリストアップ.
		for(i=0;tag=item.tags[i];i++){
		    if( this.isPName(tag) ){
			pname.push(tag);
		    }
		}
	    } catch (x) { }
	    if(pname.length){
		/* ラマーズP,嫁に囲まれて本気出すラマーズP
		 * とあるときに、後者だけを出すようにフィルタ.
		 * てきとう実装.
		 * 組み合わせの問題なのでnlognで出来るけど、
		 * P名タグは数少ないしn*nでもいいよね.
		 */
		let n = pname.length;
		for(i=0;i<n;i++){
		    let omitflg=false;
		    if(!pname[i]) continue;
		    for(j=0;j<n;j++){
			if(i==j) continue;

			if(pname[j].match(pname[i]+'$')){
			    omitflg = true;
			}
			/* 曲名(誰P)となっているものが含まれていたらそれを除外する
			 * ために (誰P) を含むものを除外する.
			 */
			if(pname[j].indexOf('('+pname[i]+')') != -1 ){
			    pname[j] = "";
			}
		    }
		    if(omitflg) pname[i] = "";
		}
		let tmp = new Array();
		for(i=0;i<n;i++){
		    if(pname[i]) tmp.push(pname[i]);
		}
		pname = tmp.join(',');
	    }else{
		pname = "";
	    }
	}
	return pname;
    },

    // 文字列のマクロ展開を行う.
    // str : 置換元も文字列
    // info : 動画情報
    replaceMacros:function(str,info){
	let replacefunc = function(s,p){
	    let tmp = s;
	    let expression;
	    if(expression = p.match(/^=(.*)/)){
		try{
		    tmp = eval(expression[1]);
		    //if( typeof(tmp)=="number" ) tmp = tmp.toFixed(1);
		    if(tmp==undefined || tmp==null) tmp = "";
		} catch (x) {
		    tmp = "";
		}
		return tmp;
	    }
	    switch(p){
	    case 'id':
		if(info.video_id==null) break;
		tmp = info.video_id;
		break;
	    case 'title':
		if(info.title==null) break;
		tmp = info.title;
		break;
	    case 'date':
		if(info.first_retrieve==null) break;
		tmp = GetDateString(info.first_retrieve*1000);
		break;
	    case 'length':
		if(info.length==null) break;
		tmp = info.length;
		break;
	    case 'view':
		if(info.view_counter==null) break;
		tmp = FormatCommas(info.view_counter);
		break;
	    case 'comment':
		if(info.comment_num==null) break;
		tmp = FormatCommas(info.comment_num);
		break;
	    case 'mylist':
		if(info.mylist_counter==null) break;
		tmp = FormatCommas(info.mylist_counter);
		break;
	    case 'mylistrate':
		if(info.mylist_counter==null||info.view_counter==null) break;
		if( info.view_counter==0 ){
		    tmp = "0.0%";
		}else{
		    tmp = (100*info.mylist_counter/info.view_counter).toFixed(1) + "%";
		}
		break;
	    case 'tags':
		// 1行40文字程度までかなぁ
		if(info.tags==null) break;
		tmp = info.tags.join('　');
		tmp = tmp.replace(/(.{35,}?)　/g,"$1<br>");
		break;
	    case 'username':
		tmp = UserNameCache[info.posting_user_id] || "";
		break;
	    case 'pname':
		if(info.video_id==null || info.tags==null) break;
		tmp = NicoLiveHelper.getPName(info);
		break;
	    case 'additional':
		if(info.video_id==null) break;
		tmp = NicoLiveDatabase.getAdditional(info.video_id);
		break;
	    case 'description':
		// 詳細を40文字まで(世界の新着と同じ)
		tmp = info.description.match(/.{1,40}/);
		break;
	    case 'requestnum': // リク残数.
		tmp = NicoLiveHelper.requestqueue.length;
		break;
	    case 'requesttime': // リク残時間(mm:ss).
		let reqtime = NicoLiveHelper.getTotalMusicTime();
		tmp = GetTimeString(reqtime.min*60+reqtime.sec);
		break;
	    case 'stocknum':  // ストック残数.
		let remainstock = 0;
		for(let i=0,item;item=NicoLiveHelper.stock[i];i++){
		    if(!item.isplayed){
			remainstock++;
		    }
		}
		tmp = remainstock;
		break;
	    case 'stocktime': // ストック残時間(mm:ss).
		let stocktime = NicoLiveHelper.getTotalStockTime();
		tmp = GetTimeString(stocktime.min*60+stocktime.sec);
		break;
		
	    case 'json':
		try {
		    let t = NicoLiveHelper.userdefinedvalue[info.video_id];
		    if( t ){
			tmp = t;
		    }else{
			tmp = "0";
		    }
		} catch (x) {
		    tmp = "";
		}
		break;
		
	    case 'mylistcomment':
		tmp = info.mylistcomment;
		if(!tmp) tmp = "";
		break;

	    case 'pref:min-ago':
		// 枠終了 n 分前通知の設定値.
		tmp = NicoLivePreference.notice.time;
		break;

	    case 'end-time':
		// 放送の終了時刻.
		tmp = GetDateString( NicoLiveHelper.endtime * 1000 );
		break;

	    case 'progress':
		// 現在の動画の進行具合の棒グラフ.
		if( NicoLiveHelper.musicinfo.length_ms<=0 ) return "";
		let progress = GetCurrentTime()-NicoLiveHelper.musicstarttime;
		let progressbar = Math.floor(progress / (NicoLiveHelper.musicinfo.length_ms/1000) * 100);
		tmp = "0:00 <font color=\"#0000ff\">";
		let j;
		for(j=0;j<progressbar;j++){
		    tmp += "|";
		}
		tmp += "</font>";
		for(;j<100;j++){
		    tmp += "|";
		}
		tmp += " " + NicoLiveHelper.musicinfo.length;
		break;
	    case 'live-id':
		tmp = NicoLiveHelper.request_id;
		break;
	    case 'live-title':
		tmp = NicoLiveHelper.title;
		break;
	    case 'hashtag':
		tmp = NicoLiveHelper.twitterinfo.hashtag;
		break;
	    }
	    return tmp;
	};
	let r = "";
	let token = "";
	let nest = 0;
	for(let i=0,ch; ch=str.charAt(i);i++){
	    switch(nest){
	    case 0:
		if( ch=='{' ){
		    nest++;
		    token += ch;
		    break;
		}
		r += ch;
		break;
	    default:
		token += ch;
		if(ch=='{') nest++;
		if(ch=='}'){
		    nest--;
		    if(nest<=0){
			r += replacefunc(token,token.substring(1,token.length-1));
			token = "";
		    }
		}
		break;
	    }
	}
	return r; //str.replace(/{(.*?)}/g,replacefunc);
    },

    // 再生する曲の情報を主コメする.
    _sendVideoInfo:function(){
	let sendstr = NicoLivePreference.videoinfo[this._counter].comment;
	if(!sendstr){
	    clearInterval(this._sendmusicid);
	    this._counter = -1;
	    this.commentstate = COMMENT_STATE_MOVIEINFO_DONE;
	    return;
	}
	let cmd = NicoLivePreference.videoinfo[this._counter].command;
	if(!cmd) cmd = "";
	switch(NicoLivePreference.caster_comment_type){
	case 1: // /perm
	    sendstr = "/perm "+sendstr;
	    break;
	case 2: // hidden
	    cmd += " hidden";
	    break;
	case 3: // /perm + hidden
	    sendstr = "/perm "+sendstr;
	    cmd += " hidden";
	    break;
	case 0: // default
	default:
	    break;
	}
	this._counter++;
	this.commentstate = COMMENT_STATE_MOVIEINFO_BEGIN;
	let ismovieinfo = COMMENT_MSG_TYPE_MOVIEINFO;
	this.postCasterComment(sendstr,cmd,"",ismovieinfo);

	try{
	    sendstr = NicoLivePreference.videoinfo[this._counter].comment;
	} catch (x) {
	    sendstr = null;
	}
	if(!sendstr){
	    clearInterval(this._sendmusicid);
	    this._counter = -1;
	    this.commentstate = COMMENT_STATE_MOVIEINFO_DONE;
	}
    },

    /**
     * 動画情報を送信開始する.
     * @param resend 動画情報の再送信時に指定するフラグ
     */
    sendVideoInfo:function(resend){
	let func = function(){
	    clearInterval(NicoLiveHelper._sendmusicid);
	    clearInterval(NicoLiveHelper._revertcommentid); // 古い動画情報復帰は消しておこう.
	    NicoLiveHelper._counter = 0;
	    NicoLiveHelper._sendmusicid = setInterval( function(){ NicoLiveHelper._sendVideoInfo(); }, NicoLivePreference.videoinfo_interval*1000);
	    NicoLiveHelper._sendVideoInfo();
	};
	this.clearCasterCommentAndRun(func);

	if( !resend ){
	    if( NicoLivePreference.twitter.when_playmovie && NicoLiveHelper.iscaster ){
		let msg = this.replaceMacros(NicoLivePreference.twitter.play, this.musicinfo);
		NicoLiveTweet.tweet(msg);
	    }

	    try{
		if( 0 && this.community=="co154" ){
		    let msg = this.community + " " + this.title + " " + this.request_id +" で紹介されました。";
		    NicoLiveMylist.addDeflist( this.musicinfo.video_id, msg );
		}
	    } catch (x) {
		debugprint(x);
	    }
	}
    },

    // 動画情報を復元する.
    revertMusicInfo:function(){
	// 動画情報送信が終わっていないときは復元不要だし.
	if( this.commentstate!=COMMENT_STATE_MOVIEINFO_DONE ) return;
	let n = NicoLivePreference.revert_videoinfo;
	if(n<=0) return;
	let sendstr = NicoLivePreference.videoinfo[n-1].comment;
	if(!sendstr) return;
	let cmd = NicoLivePreference.videoinfo[n-1].command;
	if(!cmd) cmd = "";
	switch(NicoLivePreference.caster_comment_type){
	case 1: // /perm
	    sendstr = "/perm "+sendstr;
	    break;
	case 2: // hidden
	    cmd += " hidden";
	    break;
	case 3: // /perm + hidden
	    sendstr = "/perm "+sendstr;
	    cmd += " hidden";
	    break;
	case 0: // default
	default:
	    break;
	}
	// revertMusicInfoが直接呼ばれた場合タイマー動作は不要になるので.
	clearInterval( this._revertcommentid );
	let ismovieinfo = COMMENT_MSG_TYPE_MOVIEINFO;
	this.postCasterComment(sendstr,cmd,"",ismovieinfo);
    },

    // 再生コマンドを送ってもいいか判定.
    canPlayCommand:function(){
	let now = GetCurrentTime();
	if( this.musicinfo.error ) return true; // 再生失敗したときは再生コマンドを送るのは許可.
	if( this.musicinfo.length_ms < 5000 ) return true;  // 5秒未満の動画再生中は許可.
	if( (now - this._playmusictime) < 5 ){
	    // playVideo()を呼び出してから5秒未満は禁止.
	    ShowNotice(LoadString('STR_DONTPLAY_IN_SHORT_TERM'));
	    return false;
	}
/*
	if( !this.endtime ){
	    ShowNotice(LoadString('STR_CANT_PLAY_IN_LOSSTIME'));
	    return false;
	}
*/
	return true;
    },

    /**
     * 指定のリクエストを再生する
     * @param idx リクエストの番号(1〜n)
     */
    playVideo:function(idx){
	if( !NicoLiveHelper.canPlayCommand() ) return;

	this._comment_video_id = "";
	if(this.isOffline()) return;
	if(!this.iscaster) return;
	if(this.requestqueue.length<=0){
	    // リクなし.
	    clearInterval(this._playnext);
	    return;
	}

	let music = this.removeRequest(idx); // obtain music information from request-queue and remove it
	if(!music) return;

	clearInterval(this._playnext);
	this.musicinfo = music;
	this.musicinfo.mylist = NicoLiveMylist.isVideoExists(this.musicinfo.video_id);

	let str = "/play" + ($('menuid-soundonly').checked?"sound ":" ")+ this.musicinfo.video_id;
	if($('do-subdisplay').checked){
	    str += " sub"; // サブ画面で再生する.
	}
	// 再生コマンドに限らず、運営コメを投げてstatus=okになってもコメが飲み込まれてサーバからやってこないことがある.
	// その対策のために、一旦ここで次曲再生のタイマをしかけておく.
	// /playの場合、正しくサーバからやってくれば改めてタイマはセットされる.
	let l = this.musicinfo.length_ms;
	if( l > 60*1000) l = 60*1000;
	this.setupPlayNextMusic(l);

	this.postCasterComment(str,""); // 再生.

	// /playコマンドが飲み込まれたときに再生履歴から再生できるように記録.
	this.addPlayList(this.musicinfo,true); // without textlog.

	NicoLiveRequest.update(this.requestqueue);

	// 再生数をカウントアップ.
	if(!music.user_id) music.user_id = "1";
	if(!this.play_per_ppl[music.user_id]){ this.play_per_ppl[music.user_id] = 0; }
	this.play_per_ppl[music.user_id]++;

	// 再生されたストック曲はグレーにする.
	let i,item;
	for(i=0;item=this.stock[i];i++){
	    if(this.musicinfo.video_id == item.video_id){
		item.isplayed = true;
		item.error = false;
		break;
	    }
	}
	//NicoLiveRequest.updateStockView(this.stock);
	NicoLiveRequest.updateStockViewForPlayedVideo(this.stock);
	NicoLiveRequest.setTotalStockTime(NicoLiveHelper.getTotalStockTime());

	this.updateRemainRequestsAndStocks();
	this.saveAll();

	this._playmusictime = GetCurrentTime();
	this._prepared = "";
    },

    // 動画IDを元にメモリ内の動画情報を検索、返す.
    findVideoInfo:function(byid){
	let i,item;
	for(i=0; item=this.requestqueue[i]; i++){
	    if( item.video_id==byid ) return item;
	}
	for(i=0; item=this.stock[i]; i++){
	    if( item.video_id==byid ) return item;
	}
	for(i=0; item=this.playlist[i]; i++){
	    if( item.video_id==byid ) return item;
	}
	if(this.error_req["_"+byid]) return this.error_req["_"+byid];
	debugprint(byid+" is not found");
	return null;
    },

    // ステータスバーのリク数、ストック数の表示を更新
    updateRemainRequestsAndStocks:function(){
	$('statusbar-remain').label = "R/"+this.requestqueue.length +" "+"S/"+this.countRemainStock();
	let t = this.getTotalMusicTime(true);
	let str = "リクエスト再生時間:"+t.min+"分"+t.sec+"秒/"+NicoLiveHelper.requestqueue.length+"件";
	$('statusbar-remain').setAttribute("tooltiptext",str);
    },

    /**
     * 指定のストックを再生する.
     * @param idx ストックの番号(1〜n)
     * @param force 再生済みを無視するかどうかフラグ
     */
    playStock:function(idx,force){
	// force=trueは再生済みを無視して強制再生.
	if(this.isOffline() || !this.iscaster) return;
	if(idx>this.stock.length) return;

	if( !NicoLiveHelper.canPlayCommand() ) return;

	let playmusic = this.stock[idx-1];
	if(!playmusic) return;
	if(!force && this.isPlayedMusic(playmusic.video_id)) return;
	playmusic.isplayed = true;
	// ストックをリクエストキューの先頭に突っこんで再生.
	this.requestqueue.unshift(playmusic);
	this.playVideo(1);
    },
    // ストックから削除する.
    removeStock:function(idx){
	idx--;
	let removeditem = this.stock.splice(idx,1);
	//NicoLiveRequest.updateStockView(this.stock);
	NicoLiveRequest.deleteStockRow(idx);
	this.saveStock();
	this.updateRemainRequestsAndStocks();

	this.setUndo(
	    function(){
		NicoLiveHelper.stock.splice( idx, 0, removeditem[0] );
		NicoLiveRequest.updateStockView( NicoLiveHelper.stock );
		NicoLiveHelper.saveStock();
		NicoLiveHelper.updateRemainRequestsAndStocks();
	    }
	);

    },
    // ストックの最上位に移動.
    topToStock:function(idx){
	idx--;
	let t;
	t = this.stock.splice(idx,1);
	if(t){
	    this.stock.unshift(t[0]);
	    //NicoLiveRequest.updateStockView(this.stock);
	    NicoLiveRequest.topToStock(idx);
	    this.saveStock();
	}
    },
    // ストックの最下位に移動.
    bottomToStock:function(idx){
	idx--;
	let t;
	t = this.stock.splice(idx,1);
	if(t){
	    this.stock.push(t[0]);
	    //NicoLiveRequest.updateStockView(this.stock);
	    NicoLiveRequest.bottomToStock(idx);
	    this.saveStock();
	}
    },
    // ストックの上に浮かす.
    floatStock:function(idx){
	idx--; 
	if(idx<=0) return;
	let tmp = this.stock[idx-1];
	this.stock[idx-1] = this.stock[idx];
	this.stock[idx] = tmp;
	//NicoLiveRequest.updateStockView(this.stock);
	NicoLiveRequest.exchangeStockRow(idx-1,idx);
	NicoLiveRequest.updateStockViewForPlayedVideo(this.stock);
	this.saveStock();
    },
    // ストックの下に沈める.
    sinkStock:function(idx){
	if(idx>=this.stock.length) return;
	idx--;
	let tmp = this.stock[idx+1];
	this.stock[idx+1] = this.stock[idx];
	this.stock[idx] = tmp;
	//NicoLiveRequest.updateStockView(this.stock);
	NicoLiveRequest.exchangeStockRow(idx+1,idx);
	NicoLiveRequest.updateStockViewForPlayedVideo(this.stock);
	this.saveStock();
    },


    sortRequestStock:function(queue,type,order){
	// order:1だと昇順、order:-1だと降順.
	queue.sort( function(a,b){
			let tmpa, tmpb;
			switch(type){
			case 0:// 再生数.
			    tmpa = a.view_counter;
			    tmpb = b.view_counter;
			    break;
			case 1:// コメ.
			    tmpa = a.comment_num;
			    tmpb = b.comment_num;
			    break;
			case 2:// マイリス.
			    tmpa = a.mylist_counter;
			    tmpb = b.mylist_counter;
			    break;
			case 3:// 時間.
			    tmpa = a.length_ms;
			    tmpb = b.length_ms;
			    break;
			case 4:// 投稿日.
			default:
			    tmpa = a.first_retrieve;
			    tmpb = b.first_retrieve;
			    break;
			case 5:// マイリス率.
			    tmpa = a.mylist_counter / a.view_counter;
			    tmpb = b.mylist_counter / b.view_counter;
			    break;
			case 6:// タイトル.
			    if(a.title < b.title){
				return -order;
			    }else{
				return order;
			    }
			    break;
			case 7:// マイリス登録日.
			    tmpa = a.registerDate;
			    tmpb = b.registerDate;
			    break;
			case 8:// 宣伝ポイント.
			    tmpa = a.uadp;
			    tmpb = b.uadp;
			    break;
			case 9:
			    tmpa = a.highbitrate;
			    tmpb = b.highbitrate;
			    break;
			}
			return (tmpa - tmpb) * order;
		    });
    },

    sortRequest:function(type,order){
	this.sortRequestStock(this.requestqueue,type,order);
	NicoLiveRequest.update(this.requestqueue);
	this.saveRequest();	
    },

    // ストックソート.
    sortStock:function(type,order){
	this.sortRequestStock(this.stock,type,order);
	NicoLiveRequest.updateStockView(this.stock);
	this.saveStock();
    },

    /**
     * 
     */
    chooseNextMusicToPlay2:function(musiclist, isstock){
	let now = GetCurrentTime();
	let remain;
	if( this.endtime ){
	    remain = this.endtime - now;
	    if( this.musicendtime ){
		remain = this.endtime - this.musicendtime;
	    }
	}else{
	    let tmp = now-this.starttime;// 経過時間
	    if(tmp<0) tmp = 0;
	    remain = 30*60 - tmp;
	}
    },

    /*
     * 次に再生する動画をmusiclistから探し、1,2,3,...のインデックスを返す.
     */
    chooseNextMusicToPlay:function(musiclist,isstock){
	let now = GetCurrentTime();
	let remain; // sec.

	if( this.endtime ){
	    remain = this.endtime-now;
	    if( this.musicendtime ){
		remain = this.endtime - this.musicendtime;
	    }
	}else{
	    let tmp = now-this.starttime;  // 経過時間.
	    if(tmp<0) tmp = 0;
	    remain = 30*60 - tmp;
	}
	let limit30min = NicoLivePreference.limit30min;
	let carelosstime = NicoLivePreference.carelosstime;
	let notplayed = new Array();
	let i,item;
	let estlosstime = this.calcLossTime();

	// 再生できる動画リスト作成.
	for(i=0;item=musiclist[i];i++){
	    notplayed["_"+item.video_id] = i;

	    if( limit30min ){
		if(carelosstime && item.length_ms/1000 > remain+estlosstime){
		    // ロスタイムは自動で推定.
		    continue;
		}else if(!carelosstime && item.length_ms/1000 > remain){
		    // 30枠に収まらない動画.
		    continue;
		}
	    }
	    if( !isstock || (isstock && !item.isplayed ) ){
		notplayed.push(item);
	    }
	}
	if(notplayed.length<=0) return false; // 再生できるものなし.

	let n = 0;
	let stockplaystyle = $('stock-playstyle').value;

	let isrand;
	if( this.israndomplay && (!isstock || isstock && stockplaystyle==0) ||
	    isstock && stockplaystyle==2 ){
	    isrand = true;
	}

	if( isrand ){
	    // ・ランダム再生で、ストックの再生スタイルが指定なし
	    // ・ストックから選択するとき、ストック再生スタイルが2(ランダム)
	    //n = GetRandomInt(0,notplayed.length-1);
	    n = GetRandomIntLCG(0,notplayed.length-1);
	}
	if( this.isconsumptionrateplay && !isstock ){
	    // ストックにはリクエスト消費数がないので無視してok
	    let tmp = this.calcConsumptionRate();
	    for(let i=0;i<tmp.length;i++){
		// ストックの動画にはuser_idがないので、ここを処理しても必ず n = -1 になる.
		n = this.findRequestByUserId(notplayed, tmp[i].user_id);
		if(n>=0) break;
	    }
	}
	if(n<0) n=0;
	return notplayed["_"+notplayed[n].video_id]+1;
    },

    // リクエストから再生できる動画をピックアップして再生.
    chooseMusicFromRequestAndPlay:function(){
	let n;
	n = this.chooseNextMusicToPlay( this.requestqueue,false );
	if( n ){
	    this.playVideo( n );
	    return true;
	}
	return false;
    },

    // ストック内の再生されていない動画のうちどの動画を再生するか選択して再生する.
    chooseMusicFromStockAndPlay:function(){
	let n;
	n = this.chooseNextMusicToPlay( this.stock, true );
	if( n ){
	    this.playStock( n, true);
	    return true;
	}
	return false;
    },

    playFromPrepared:function(){
	let n;
	n = this.findRequestByVideoId(this._prepared);
	if( n>=0 ){
	    n++;
	    this.playVideo( n );
	    return true;
	}
	n = this.findStockByVideoId(this._prepared);
	if( n>=0 ){
	    n++;
	    this.playStock( n, true );
	    return true;
	}
	return false;
    },

    // 次曲を再生する.
    playNext: function(){
	if(!this.requestqueue) return;
	if(!this.stock) return;
	if(this.isOffline() || !this.iscaster) return;

	if( this.endtime ){
	    // ロスタイムじゃないときだけ次を再生できる.
	    if( this.israndomplay && this.playFromPrepared() ){
		return;
	    }
	    if(this.requestqueue.length){
		if( this.chooseMusicFromRequestAndPlay() ) return;
	    }
	    if(this.stock.length){
		if( this.chooseMusicFromStockAndPlay() ) return;
	    }
	}

	// リクもストックもない.
	clearInterval(this._playnext);
	ShowNotice(LoadString('STR_NO_PLAYABLEVIDEO'));
    },

    // 現在の動画が再生終了したときに、次曲再生についてチェックする.
    // 動画を再生すると、必ずここに来る.
    checkPlayNext:function(){
	if( $('do-pauseplay').checked ){
	    // 一時停止が押されているので自動で次曲に行かない.
	    clearInterval(this._playnext);
	    return;
	}
	if(this.isautoplay){
	    this.commentstate = COMMENT_STATE_NONE;
	    this.playNext();
	}else{
	    clearInterval(this._playnext);
	}
    },

    // 再生を止める.
    stopPlay:function(){
	let str = "/stop";
	if($('do-subdisplay').checked){
	    str += " sub";
	}
	this.postCasterComment(str,"");
	clearInterval(this._playnext);
    },

    dosoundonly:function(on){
	let str;
	if(on){
	    str = "/soundonly on";
	}else{
	    str = "/soundonly off";
	}
	if($('do-subdisplay').checked){
	    str += " sub";
	}
	debugprint(str);
	this.postCasterComment(str,"");
    },

    addPlayListText:function(item){
	let elem = $('played-list-textbox');
	if( GetCurrentTime()-this.starttime < 180 ){
	    // 放送開始して最初の再生らしきときには番組名と番組IDを付加.
	    if( !this._firstflag ){
		elem.value += "\n"+this.title+" "+this.request_id+" ("+GetFormattedDateString("%Y/%m/%d %H:%M",this.starttime*1000)+"-)\n";
		this._firstflag = true;
	    }
	}
	elem.value += item.video_id+" "+item.title+"\n";
	this.savePlaylist();
    },

    /**
     * プレイリストに追加する.
     * @param item 追加する動画情報
     * @param notext テキストとして記録するかどうかフラグ
     */
    addPlayList:function(item,notext){
	// プレイリストに追加する.
	let elem = $('played-list-textbox');
	if( GetCurrentTime()-this.starttime < 180 ){
	    // 放送開始して最初の再生らしきときには番組名と番組IDを付加.
	    if( !this._firstflag ){
		if( !notext ){
		    elem.value += "\n"+this.title+" "+this.request_id+" ("+GetFormattedDateString("%Y/%m/%d %H:%M",this.starttime*1000)+"-)\n";
		    this._firstflag = true;
		}
	    }
	}
	if(NicoLivePreference.do_classify){
	    let str = new Array();
	    for(let i=0,tag; tag=item.tags[i];i++){
		str.push(ZenToHan(tag.toLowerCase()));
	    }
	    if( item.overseastags ){
		for(let i=0,tag; tag=item.overseastags[i];i++){
		    str.push(ZenToHan(tag.toLowerCase()));
		}
	    }
	    item.classify = NicoLiveClassifier.classify(str);
	}
	let now = GetCurrentTime();
	item.playedtime = now;
	this.playlist.push(item); // 再生済みリストに登録.
	this.playlist["_"+item.video_id] = now;
	if( !notext ){
	    elem.value += item.video_id+" "+item.title+"\n";
	}
	NicoLiveHistory.addPlayList(item);
	this.savePlaylist();
    },

    // プレイリストをクリアする.
    clearPlayList:function(){
	let elem = $('played-list-textbox');

	let str = elem.value;
	let s = this.playlist;
	this.setUndo(
	    function(){
		NicoLiveHelper.playlist = s;
		for(let i=0,item; item=NicoLiveHelper.playlist[i];i++){
		    NicoLiveHistory.addPlayList( item );
		}
		$('played-list-textbox').value = str;
		NicoLiveHelper.savePlaylist();
	    }
	);

	elem.value = "";
	this.playlist = new Array();
	// ストックの再生済み情報をクリアする.
	for(let i=0,item;item=this.stock[i];i++){
	    item.isplayed = false;
	}
	//NicoLiveRequest.updateStockView(this.stock);
	clearTable( $('playlist-table') );
	NicoLiveRequest.updateStockViewForPlayedVideo(this.stock);
	this.savePlaylist();
    },
    // リクエストを消去する.
    clearRequest:function(){
	let s = this.requestqueue;
	this.setUndo(
	    function(){
		NicoLiveHelper.requestqueue = s;
		NicoLiveRequest.update( NicoLiveHelper.requestqueue );
		NicoLiveHelper.saveRequest();
		NicoLiveHelper.updateRemainRequestsAndStocks();
	    }
	);

	this.requestqueue = new Array();
	NicoLiveRequest.update(this.requestqueue);
	this.saveRequest();
	this.updateRemainRequestsAndStocks();
    },
    // 再生済みのリクエストを消去する.
    clearPlayedRequest:function(){
	let s = this.requestqueue;
	this.setUndo(
	    function(){
		NicoLiveHelper.requestqueue = s;
		NicoLiveRequest.update( NicoLiveHelper.requestqueue );
		NicoLiveHelper.saveRequest();
		NicoLiveHelper.updateRemainRequestsAndStocks();
	    }
	);

	let newrequest = new Array();
	for(let i=0,item; item=this.requestqueue[i]; i++){
	    if( !this.playlist["_"+item.video_id] ) newrequest.push(item);
	}
	this.requestqueue = newrequest;
	NicoLiveRequest.update(this.requestqueue);
	this.saveRequest();
	this.updateRemainRequestsAndStocks();
    },
    // ストックを消去する.
    clearStock:function(){
	let s = this.stock;
	this.setUndo(
	    function(){
		NicoLiveHelper.stock = s;
		NicoLiveRequest.updateStockView( NicoLiveHelper.stock );
		NicoLiveHelper.saveStock();
		NicoLiveHelper.updateRemainRequestsAndStocks();
	    }
	);

	this.stock = new Array();
	NicoLiveRequest.updateStockView(this.stock);
	this.saveStock();
	this.updateRemainRequestsAndStocks();
    },
    // 再生済みのストックを消去する.
    clearPlayedStock:function(){
	let s = this.stock;
	this.setUndo(
	    function(){
		NicoLiveHelper.stock = s;
		NicoLiveRequest.updateStockView( NicoLiveHelper.stock );
		NicoLiveHelper.saveStock();
		NicoLiveHelper.updateRemainRequestsAndStocks();
	    }
	);

	let newstock = new Array();
	for(let i=0,item; item=this.stock[i]; i++){
	    if( !item.isplayed ) newstock.push(item);
	}

	this.stock = newstock;
	NicoLiveRequest.updateStockView(this.stock);
	this.saveStock();
	this.updateRemainRequestsAndStocks();
    },

    /**
     * 15秒後に動画情報再送信を行う.
     */
    setupRevertMusicInfo:function(){
	clearInterval( this._revertcommentid );
	this._revertcommentid = setInterval(
	    function(){
		NicoLiveHelper.revertMusicInfo();
		clearInterval( NicoLiveHelper._revertcommentid );
	    }, 15*1000 );
    },

    /**
     * コメントタブからのコメント投稿ルールに基づくコメント投稿.
     */
    postCommentMain:function(str,mail,name){
	if(this.iscaster){
	    if( str.match(/^((sm|nm)\d+|\d{10})$/) ){
		//debugprint(str+'を手動再生しようとしています');
		this._comment_video_id = str;
		this.postCasterComment(str,mail,name,COMMENT_MSG_TYPE_NORMAL);
	    }else{
		if( $('overwrite-hidden-perm').checked ){
		    if( str.indexOf('/')==0 ){
			// コマンドだった場合/clsを送らない.
			this.postCasterComment(str,mail,name,COMMENT_MSG_TYPE_NORMAL);
		    }else{
			// 直前のコメがhidden+/permで、上コメ表示にチェックがされていたら、/clsを送ってから.
			let func = function(){
			    NicoLiveHelper.postCasterComment(str,mail,name,COMMENT_MSG_TYPE_NORMAL);
			};
			this.clearCasterCommentAndRun(func);
		    }
		}else{
		    this.postCasterComment(str,mail,name,COMMENT_MSG_TYPE_NORMAL);
		}
	    }
	}else{
	    if( this.user_id=="21693" ){
		let tmp;
		if( tmp = str.match(/:(\d+):(.*)/) ){
		    this.reserveListenerCommentSending( parseInt(tmp[1]), tmp[2], mail );
		    return;
		}
	    }
	    this.postListenerComment(str,mail);
	}
    },

    // コメント(主と視聴者を識別してそれぞれのコメント).
    postComment: function(comment,mail){
	comment = comment.replace(/\\([\\n])/g,function(s,p){switch(p){case "n": return "\n"; case "\\": return "\\"; default: return s;}});
	if(this.iscaster){
	    this.postCasterComment(comment,mail);
	}else{
	    this.postListenerComment(comment,mail);
	}
    },

    /**
     * 運営コメントを行う.
     * @param comment 運営コメント
     * @param mail コマンド(hiddenや色など)
     * @param name 名前欄に表示する名前
     * @param type コメント種別(undefined or null:自動応答, 1:動画情報, 2:普通の主コメ
     * @param retry 送信エラーになったときのリトライ時にtrue
     */
    postCasterComment: function(comment,mail,name,type,retry){
	if( !this.iscaster || this.isOffline() ) return;
	if( comment.length<=0 ) return;
	if( !mail ) mail = "";

	let f = function(xml, req){
	    if( req.readyState==4 && req.status==200 ){
		debugprint('castercomment:'+req.responseText);
		// status=error&error=0
		if( req.responseText.indexOf("status=error")!=-1 ){
		    // 世界の新着、生放送引用拒否動画は、/playコマンドはエラーになる.
		    let video_id;
		    try{
			video_id = comment.match(/^\/play(sound)*\s+((sm|nm)\d+)/)[1];
		    } catch (x) {
			video_id = "";
		    }
		    if( !retry ){ // 1回再送.
			debugprint('failed: '+comment);
			// ツール上からの5秒未満間隔での再生は禁止しているから、
			// すぐにリトライせずに時間置いても大丈夫なはず.
			let retrytimer = setInterval(function(){
							 NicoLiveHelper.postCasterComment(comment,mail,name,type,true);
							 clearInterval(retrytimer);
						     }, 2000 );
		    }
		    if(video_id && retry){
			// 再生に失敗.
			let str = NicoLivePreference.videoinfo_playfailed;
			NicoLiveHelper.postCasterComment(str,"");
			//$('played-list-textbox').value += str + "\n"; // これは要らないかな.
			// 再生エラータブ行き.
			if( video_id==NicoLiveHelper.musicinfo.video_id ){
			    // ルーツ上から再生したときは再生エラーリストに追加.
			    // コメントからの直接再生だと動画データがない可能性があるのでやらない.
			    NicoLiveHelper.musicinfo.error = true;
			    NicoLiveHelper.musicinfo.isplayed = true;
			    NicoLiveHelper.addErrorRequestList(NicoLiveHelper.musicinfo);
			}
			clearInterval(NicoLiveHelper._sendmusicid);
			if( NicoLiveHelper.endtime ){
			    NicoLiveHelper.checkPlayNext();
			}
		    }else if(retry){
			ShowNotice("コメント送信に失敗しました:"+comment);
		    }
		}else{
		}
	    }
	};
	comment = this.replaceMacros(comment,this.musicinfo);

	let anchor = comment.match(/>>(\d+)-(\d+)?(@(\d+))?/);
	if(anchor){
	    let start_cno = anchor[1];
	    let end_cno   = anchor[2] ? anchor[2] : 99999;
	    let num       = anchor[4] ? anchor[4] : 999;
	    this.anchor = {};
	    this.anchor.start = start_cno;
	    this.anchor.end   = end_cno;
	    this.anchor.num   = num;
	    this.anchor.counter = 0;
	    debugprint("アンカー受付:コメ番"+start_cno+"から"+end_cno+"まで"+num+"個");
	}
	if(comment.length<=0) return; // マクロ展開したあとにコメが空になったら.

	// 主コメは184=falseにしても効果がないので常時trueに.
	let data = new Array();
	data.push("body="+encodeURIComponent(comment));
	data.push("is184=true");
	if(name){
	    data.push("name="+encodeURIComponent(name));
	}
	data.push("token="+NicoLiveHelper.token);
	// コマンドは mail=green%20shita と付ける.
	data.push("mail="+encodeURIComponent(mail));
	NicoApi.broadcast( this.request_id, data, f );

	// 主コメ送信のレスポンスが来たときにセットアップしていたのをここに移動.
	switch( NicoLiveHelper.commentstate ){
	case COMMENT_STATE_MOVIEINFO_DONE:
	    try{
		if( type==COMMENT_MSG_TYPE_MOVIEINFO ) break;
		if( type!=COMMENT_MSG_TYPE_MOVIEINFO && comment.indexOf('/')==0 ) break;
		if( NicoLiveHelper._comment_video_id==comment ) break; // 主コメ経由で動画IDを流したときには動画情報の復元は不要.
		if( mail.indexOf("hidden")==-1 && NicoLiveHelper.commentview==COMMENT_VIEW_HIDDEN_PERM ){
		    // hiddenコメじゃなければ上コメは上書きされないので復帰必要なし.
		    break;
		}
		NicoLiveHelper.setupRevertMusicInfo();
	    } catch (x) {
		debugprint(x);
	    }
	    break;
	default:
	    break;
	}
    },

    /**
     * 運営コメント欄を/clsで消去したあと、指定の関数を実行する.
     * 消去の必要がない場合は消去せずに指定の関数を実行する.
     */
    clearCasterCommentAndRun:function(func){
	// /clsが飲み込まれて送られてこなかったらどうしよう.
	// というときのために、/clsを送る必要があるときは
	// /clsか/clearを受けとるまで6秒間隔で/clsを送信.
	if( 'function'!=typeof func ) return;

	let sendclsfunc = function(){
	    NicoLiveHelper.postCasterComment("/cls","");
	    NicoLiveHelper._clscounter++;
	    if(NicoLiveHelper._clscounter>=5){
		clearInterval(NicoLiveHelper._sendclsid);
		NicoLiveHelper.postclsfunc = null;
	    }
	};

	if( this.commentview==COMMENT_VIEW_HIDDEN_PERM ){
	    // hidden/permのときは先に/clsを送らないといけない.
	    if('function'!=typeof this.postclsfunc){
		// postclsfuncが空いているので、登録したのち/cls
		this.postclsfunc = func;
		this.postCasterComment("/cls","");
		clearInterval(this._sendclsid);
		this._clscounter = 0;
		this._sendclsid = setInterval( sendclsfunc, 6000 );
	    }else{
		// 1秒ごとにpost /cls関数が空いてないかチェック.
		let timer = setInterval(
		    function(){
			if( 'function'!=typeof NicoLiveHelper.postclsfunc ){
			    // postclsfuncが空いた.
			    if( NicoLiveHelper.commentview!=COMMENT_VIEW_HIDDEN_PERM ){
				// hidden/permじゃないので、/clsは不要.
				func();
			    }else{
				// 登録したのち/cls
				NicoLiveHelper.postclsfunc = func;
				NicoLiveHelper.postCasterComment("/cls","");
				clearInterval(NicoLiveHelper._sendclsid);
				NicoLiveHelper._clscounter = 0;
				NicoLiveHelper._sendclsid = setInterval( sendclsfunc, 6000 );
			    }
			    clearInterval(timer);
			}
		    }, 1000);
	    }
	}else{
	    func();
	}
    },

    // リスナーコメを送信する.
    postListenerComment: function(comment,mail){
	if(this.isOffline()) return;
	if(!comment) return;
	if(comment.length<=0) return;

	comment = comment.replace(/((...)[-](....)[-](.))/g,"$2=$3=$4");

	if(this.previouschat==comment){
	    ShowNotice("同じコメントの連投はできません");
	    return;
	}
	this._getpostkeycounter = 0;

	setTimeout(function(){
		       NicoLiveHelper._postListenerComment(comment,mail);
		   }, 0);
    },
    _postListenerComment: function(comment,mail){
	// <chat thread="1007128526" ticket="0x957fa28" vpos="17453" postkey="iFzMyJ74LVHI5tZ6tIY9eXijNKQ" mail=" 184" user_id="14369164" premium="0">一般ユーザーからのコメント発信てすと（主</chat>
	this.chatbuffer = comment;
	this.mailbuffer = mail;

	if(!this.postkey){
	    this.getpostkey(); // ポストキーがまだないときはまず取ってこないとね.
	    return;
	}
	let str;
	let vpos = Math.floor((GetCurrentTime()-this.opentime)*100);
	// mailアトリビュートに空白区切りでコマンド(shita greenとか)を付ける.
	str = "<chat thread=\""+this.thread+"\""
	    + " ticket=\""+this.ticket+"\""
	    + " vpos=\""+vpos+"\""
	    + " postkey=\""+this.postkey+"\""
	    + " mail=\""+mail+(NicoLivePreference.comment184?" 184\"":"\"")
	    + " user_id=\""+this.user_id+"\""
	    + " premium=\""+this.is_premium+"\" locale=\"jp\">"
	    + htmlspecialchars(comment)
	    + "</chat>\0";
	//debugprint(str);
	this.coStream.writeString(str);
    },

    // リスナーコメント投稿用のキーを取得してからコメ送信する.
    getpostkey:function(){
	if( this.isOffline() ) return;
	let thread = this.thread;
	if( !thread ) return;
	let block_no;
	if( this._getpostkeycounter<=0 ){
	    block_no = parseInt(this.last_res/100) + this._getpostkeycounter;
	    this._bk_block_no = block_no;
	}else{
	    block_no = this._bk_block_no + this._getpostkeycounter;
	}
	this._getpostkeycounter++;
	if( this._getpostkeycounter > 3){
	    // リトライは最大3回まで.
	    debugprint('getpostkey: retry failed\n');
	    return;
	}

	let f = function(xml,req){
	    if( req.readyState==4 && req.status==200 ){
		let tmp = req.responseText.match(/postkey=(.*)/);
		if(tmp){
		    NicoLiveHelper.postkey = tmp[1];
		    debugprint('postkey='+NicoLiveHelper.postkey);
		    if(NicoLiveHelper.postkey){
			// 取得終わったら、コメ送信する.
			NicoLiveHelper._postListenerComment(NicoLiveHelper.chatbuffer,NicoLiveHelper.mailbuffer);
		    }
		}else{
		    NicoLiveHelper.postkey = "";
		}
	    }
	};
	NicoApi.getpostkey( thread, block_no, f );
    },

    postUserPress:function(name,comment,color){
	if( !comment ) return;
	if( !name ) name = this.user_name;
	if( !color ) color = "#45bc38";
	if( !this.user_press_token ){
	    let tab = NicoLiveWindow.findTab(this.request_id) || NicoLiveWindow.findTab(this.community);
	    if( tab ){
		this.user_press_token = tab.linkedBrowser._contentWindow.window.document.getElementById('presscast_token').value;
	    }else{
		ShowNotice("生放送のページを開いていないため、BSPコメント用トークンを取得できませんでした");
	    }
	}

	let data = new Array();
	data.push("v="+this.request_id);
	data.push("body="+encodeURIComponent(comment));
	data.push("name="+encodeURIComponent(name));
	data.push("token="+encodeURIComponent(this.user_press_token));
	data.push("color="+encodeURIComponent(color));
	data.push("mode=json");

	let f = function(xml, req){
	    if( req.readyState==4 && req.status==200 ) {
		let result = JSON.parse(req.responseText);
		if(result.status=="error"){
		    ShowNotice("投稿エラーです");
		}
	    }
	};
	NicoApi.presscast( data, f );
    },

    // Twitterにtweetする(ニコ生API経由).
    postTweet:function(tweet){
	if( !this.twitterinfo.status || !this.twitterinfo.live_enabled ) return;
	let str = new Array();
	let url;
	str.push("entry_content="+encodeURIComponent(tweet));
	str.push("token="+this.twitterinfo.token);
	str.push("vid="+this.request_id);

	url = this.twitterinfo.api_url + "twitterpost";
	let req = CreateXHR("POST",url);
	if( !req ) return;
	req.onreadystatechange = function(){
	    if( req.readyState==4 && req.status==200 ){
	    }
	};
	req.setRequestHeader('Content-type','application/x-www-form-urlencoded');
	req.send(str.join('&'));
    },

    // BSPコメを使ってコメント(放送主のみ).
    postBSPComment:function(){
	if( !this.iscaster ) return;
	let msg = InputPrompt('バックステージパスコメントを入力してください','BSPコメント','');
	if(msg){
	    let str = "/press show green \""+msg+"\" \""+this.user_name+"\"";
	    this.postCasterComment(str,'');
	}
    },

    // リクエスト消費順にソート.
    calcConsumptionRate:function(){
	let rate = new Array();
	let tmp;
	for (ppl in this.request_per_ppl){
	    if(!this.play_per_ppl[ppl]){
		this.play_per_ppl[ppl]=0;
	    }
	    tmp = this.play_per_ppl[ppl];// / this.request_per_ppl[ppl];
	    rate.push( {"user_id":ppl, "rate":tmp } );
	}
	rate.sort( function(a,b){
		       return a.rate - b.rate;
		   } );
	return rate;
    },

    /**
     * ユーザーIDをキーに配列を検索して配列インデックス(0,1,2,...)を返す.
     * 見つからないときは -1 
     * @param arr 検索する配列
     * @param user_id 検索するユーザーID
     */
    findRequestByUserId:function(arr,user_id){
	for(let i=0,item; item=arr[i]; i++){
	    if( item.user_id == user_id ){
		return i;
	    }
	}
	return -1;
    },

    /**
     * リクエストから指定の動画IDを検索して 0〜n のインデックスを返す.
     * 見つからないときは -1 を返す.
     */
    findRequestByVideoId:function(vid){
	for(let i=0,item; item=this.requestqueue[i]; i++){
	    if( item.video_id == vid ){
		return i;
	    }
	}
	return -1;
    },
    /**
     * ストックから指定の動画IDを検索して 0〜n のインデックスを返す.
     * 見つからないときは -1 を返す.
     */
    findStockByVideoId:function(vid){
	for(let i=0,item; item=this.stock[i]; i++){
	    if( item.video_id == vid ){
		return i;
	    }
	}
	return -1;
    },

    setConsumptionRatePlay:function(b){
	this.isconsumptionrateplay = b;	
    },

    // 再生方式を指定.
    setPlayStyle:function(style){
	this.playstyle = style;
	this.setConsumptionRatePlay(false);

	switch(style){
	case 0:// 手動.
	    this.setAutoplay(0);
	    this.setRandomplay(false);
	    debugprint("手動順次");
	    break;
	case 1:// 自動順次
	    this.setAutoplay(1);
	    this.setRandomplay(false);
	    debugprint("自動順次");
	    break;
	case 2:// 自動ランダム
	    this.setAutoplay(1);
	    this.setRandomplay(true);
	    debugprint("自動ランダム");
	    break;
	case 3:// 手動ランダム.
	    this.setAutoplay(0);
	    this.setRandomplay(true);
	    debugprint("手動ランダム");
	    break;
	case 4:// 手動消化率.
	    this.setAutoplay(0);
	    this.setConsumptionRatePlay(true);
	    debugprint("手動消化率順");
	    break;
	case 5:// 自動消化率.
	    this.setAutoplay(1);
	    this.setConsumptionRatePlay(true);
	    debugprint("自動消化率順");
	    break;
	default:
	    break;
	}
	//NicoLivePreference.writePlayStyle();

	let e = evaluateXPath(document,"//*[@id='toolbar-playstyle']//*[@playstyle='"+this.playstyle+"']");
	if(e.length){
	    $('toolbar-playstyle').label = e[0].label;
	}
    },

    // 自動再生の設定をする.
    setAutoplay:function(flg){
	this.isautoplay = flg==1?true:false;
	if(this.isautoplay && !this.inplay){ // 自動再生オンにしたときに何も再生していなければ.
	    this.playNext();
	}
	debugprint(this.isautoplay?"Autoplay":"Non-autoplay");
    },
    // ランダム再生の設定をする.
    setRandomplay:function(flg){
	this.israndomplay = flg;
    },

    /**
     * リクエスト可否を切り替える.
     * @param flg 可否のフラグ
     * @param ev 押されているキーを取得するためのevent
     * @param nomsg リクエスト可否切り替え時に運営コメントしない
     */
    setAllowRequest:function(flg, ev, nomsg){
	this.allowrequest = flg;
	let str = flg ? NicoLivePreference.msg.requestok : NicoLivePreference.msg.requestng;
	let command = flg ? NicoLivePreference.msg.requestok_command : NicoLivePreference.msg.requestng_command;
	if(!command) command = "";
	if( ev && ev.ctrlKey ){
	    // CTRLキーが押されていたら運営コメントを入力して、それを使用.
	    let tmp = InputPrompt('リクエスト'+(flg?"許可":"不可")+'に切り替える時の運営コメントを入力してください','リクエスト可否切り替えコメントの入力',str);
	    if( tmp ) str = tmp;
	}
	if(str && !nomsg){
	    this.postCasterComment(str,command);
	}
	if( !flg ) this.anchor = {};
	let e = evaluateXPath(document,"//*[@id='toolbar-allowrequest']//*[@allowrequest='"+flg+"']");
	if(e.length){
	    $('toolbar-allowrequest').label = e[0].label;
	}
    },

    /**
     * @param start_no 開始コメ番
     * @param end_no 終了コメ番
     * @param num 受け付け個数
     * @param even trueのとき偶数のみ受け付け
     * @param odd trueのとき奇数のみ受け付け
     * @param comment アンカー指定するときに行うコメント
     */
    setAnchor:function(start_no,end_no,num,even,odd,comment){
	this.setAllowRequest(false,false,true);
	this.anchor = {};
	this.anchor.start = parseInt(start_no) || 1;
	this.anchor.end   = parseInt(end_no) || 99999;
	this.anchor.num   = parseInt(num) || 999;
	this.anchor.counter = 0;
	debugprint("アンカー受付:コメ番"+this.anchor.start+"から"+this.anchor.end+"まで"+this.anchor.num+"個");
	if( this.iscaster ){
	    this.postCommentMain(comment,"","");
	}
    },

    /** リクエストを返す.
     * @param idx 1,2,3,...,n
     */
    getRequestItem:function(idx){
	idx--;
	return this.requestqueue[idx];
    },

    // リクエストリストに追加する.
    addRequestQueue:function(item){
	if( !item || !item.video_id ) return;
	this.requestqueue.push(item);
	NicoLiveRequest.add(item);
	this.updateRemainRequestsAndStocks();
    },
    // リクエストリストから削除する.
    // idx: 1,2,3,...
    removeRequest:function(idx){
	idx--;
	let removeditem = this.requestqueue.splice(idx,1);
	NicoLiveRequest.update(this.requestqueue);
	this.saveRequest();
	this.updateRemainRequestsAndStocks();

	this.setUndo(
	    function(){
		NicoLiveHelper.requestqueue.splice( idx, 0, removeditem[0] );
		NicoLiveRequest.update( NicoLiveHelper.requestqueue );
		NicoLiveHelper.saveRequest();
		NicoLiveHelper.updateRemainRequestsAndStocks();
	    }
	);

	return removeditem[0];
    },
    // 指定のリクを先頭に移動する.
    // idx: 1,2,3,...
    topToRequest:function(idx){
	idx--;
	let t;
	t = this.requestqueue.splice(idx,1);
	if(t){
	    this.requestqueue.unshift(t[0]);
	    NicoLiveRequest.update(this.requestqueue);
	    this.saveRequest();
	}
    },
    // 指定の動画IDのリクを先頭に移動する.
    topToRequestById:function(video_id){
	let i,item;
	for(i=0;item=this.requestqueue[i];i++){
	    if(item.video_id==video_id){
		this.topToRequest(i+1);
		break;
	    }
	}
    },
    // リクエストを最後に移動する.
    // idx: 1,2,3,...
    bottomToRequest:function(idx){
	idx--;
	let t;
	t = this.requestqueue.splice(idx,1);
	if(t){
	    this.requestqueue.push(t[0]);
	    NicoLiveRequest.update(this.requestqueue);
	    this.saveRequest();
	}
    },
    // リクを1つ上に移動.
    // idx: 1,2,3,...
    floatRequest:function(idx){
	idx--; 
	if(idx<=0) return;
	let tmp = this.requestqueue[idx-1];
	this.requestqueue[idx-1] = this.requestqueue[idx];
	this.requestqueue[idx] = tmp;
	NicoLiveRequest.update(this.requestqueue);
	this.saveRequest();
    },
    // リクを1つ下に移動.
    // idx: 1,2,3,...
    sinkRequest:function(idx){
	if(idx>=this.requestqueue.length) return;
	idx--;
	let tmp = this.requestqueue[idx+1];
	this.requestqueue[idx+1] = this.requestqueue[idx];
	this.requestqueue[idx] = tmp;
	NicoLiveRequest.update(this.requestqueue);
	this.saveRequest();
    },

    // コメ番順にソート.
    sortRequestByCommentNo:function(){
	// order:1だと昇順、order:-1だと降順.
	let order = 1;
	this.requestqueue.sort( function(a,b){
				    if(b.cno==undefined) return -1;
				    if(a.cno==undefined) return 1;
				    try{
					let a_cno = parseInt((""+a.cno).split(",")[0]);
					let b_cno = parseInt((""+b.cno).split(",")[0]);
					return (a_cno - b_cno) * order;
				    } catch (x) {
					debugprint(x);
					return 0;
				    }
				});
	NicoLiveRequest.update(this.requestqueue);
	this.saveRequest();
    },

    /** リクエストのコンパクションを行う.
     * @param idx 1,2,3,...,n
     */
    compactRequest:function(idx){
	idx--;
	let newarray = new Array();
	let indexlist = new Object();
	let len = this.requestqueue.length;

	for(let i=idx; i<idx+len; i++){
	    let n = i % len;
	    let vinfo = this.requestqueue[n];
	    if( indexlist["_"+vinfo.video_id]!=undefined ){
		newarray[ indexlist["_"+vinfo.video_id] ].cno += ", "+vinfo.cno;
	    }else{
		indexlist["_"+vinfo.video_id] = newarray.length;
		newarray.push( vinfo );
	    }
	}
	this.requestqueue = newarray;
    },

    // ストックリストに追加.
    addStockQueue:function(item){
	if( !item || !item.video_id ) return;
	if(this.isStockedMusic(item.video_id)) return;
	this.stock.push(item);
	NicoLiveRequest.addStockView(item);
	this.updateRemainRequestsAndStocks();
	this.saveStock();
    },
    // ストックからリクエストキューに追加.
    // idx: 1,2,3....
    addRequestFromStock:function(idx){
	if(idx>this.stock.length) return;

	idx--;
	let music = this.stock[idx];
	if(this.isRequestedMusic(music.video_id)){
	    ShowNotice( LoadFormattedString('STR_FAILED_TO_ADD_REQUEST_FROM_STOCK',[music.video_id]) );
	    return;
	}
	this.addRequestQueue(music);
    },
    // エラーリクエストリストに追加
    addErrorRequestList:function(item){
	if(!item || !item.video_id) return;
	let k = "_" + item.video_id;
	if( this.error_req[k] && this.error_req[k].cno ){
	    if( item.cno ){
		this.error_req[k].cno += ", "+item.cno;
	    }
	}else{
	    this.error_req[k] = item;
	}
	NicoLiveRequest.updateErrorRequest(this.error_req);
    },
    removeErrorRequest:function(video_id){
	delete this.error_req["_"+video_id];	
	NicoLiveRequest.updateErrorRequest(this.error_req);
    },
    removeErrorRequestAll:function(){
	this.error_req = new Object();
	NicoLiveRequest.updateErrorRequest(this.error_req);
    },

    getTotalPlayTime:function(list,excludeplayed,checkmaxplay){
	let t=0;
	let maxplay = parseInt(NicoLivePreference.max_movieplay_time*60*1000);
	let s;
	for(let i=0,item;item=list[i];i++){
	    if( excludeplayed && item.isplayed ) continue;
	    if( maxplay>0 && checkmaxplay ){
		s = maxplay>item.length_ms?item.length_ms:maxplay;
	    }else{
		s = item.length_ms;
	    }
	    t += s;
	}
	t /= 1000;
	let min,sec;
	min = parseInt(t/60);
	sec = t%60;
	return {"min":min, "sec":sec};
    },
    // リクエスト曲の総再生時間を返す.
    getTotalMusicTime:function(flg){
	return this.getTotalPlayTime( this.requestqueue, false,flg );
    },
    getTotalStockTime:function(){
	return this.getTotalPlayTime( this.stock, true );
    },
    // 残り未再生ストック数を数える.
    countRemainStock:function(){
	let i,item,t=0;
	for(i=0;item=this.stock[i];i++){
	    if(!item.isplayed){
		t++;
	    }
	}
	return t;
    },

    // リクエストをシャッフル(てきとー実装).
    shuffleRequest: function(){
	let s = JSON.stringify(this.requestqueue);
	this.setUndo(
	    function(){
		NicoLiveHelper.requestqueue = JSON.parse(s);
		NicoLiveRequest.update( NicoLiveHelper.requestqueue );
		NicoLiveHelper.saveRequest();
	    }
	);

	let i = this.requestqueue.length;
	while(i){
	    let j = Math.floor(Math.random()*i);
	    let t = this.requestqueue[--i];
	    this.requestqueue[i] = this.requestqueue[j];
	    this.requestqueue[j] = t;
	}
	NicoLiveRequest.update(this.requestqueue);
	this.saveRequest();
    },
    shuffleStock:function(){
	let s = JSON.stringify(this.stock);
	this.setUndo(
	    function(){
		NicoLiveHelper.stock = JSON.parse(s);
		NicoLiveRequest.updateStockView( NicoLiveHelper.stock );
		NicoLiveHelper.saveStock();
	    }
	);

	let i = this.stock.length;
	while(i){
	    let j = Math.floor(Math.random()*i);
	    let t = this.stock[--i];
	    this.stock[i] = this.stock[j];
	    this.stock[j] = t;
	}
	NicoLiveRequest.updateStockView(this.stock);
	this.saveStock();
    },

    /* getElementsByTagNameでrootから毎回辿るより
     * Breadth-first searchかDepth-first searchで高速化しようと思ったけど
     * 情報が全部同じ階層にあるのでループまわした方が速いか.
     * ずいぶんとすっきりした.
     */
    xmlToMovieInfo: function(xml){
	// ニコニコ動画のgetthumbinfoのXMLから情報抽出.
	let info = {};
	info.cno = undefined;
	info.tags = [];
	info.no_live_play = 0;

	let root;
	try{
	    root = xml.getElementsByTagName('thumb')[0];
	} catch (x) {
	    return null;
	}
	if( !root ) return null;
	try{
	    for(let i=0,elem; elem=root.childNodes[i]; i++){	    	
		switch( elem.tagName ){
		case "user_id":
		    // user_id は先にリク主に使ってしまったので
		    // 投稿者のuser_idはこちらに
		    info.posting_user_id = elem.textContent;
		    break;

		case "video_id":
		    info.video_id = elem.textContent;
		    break;
		case "title":
		    info.title = restorehtmlspecialchars(elem.textContent);
		    break;
		case "description":
		    info.description = restorehtmlspecialchars(elem.textContent).replace(/　/g,' ');
		    break;
		case "thumbnail_url":
		    info.thumbnail_url = elem.textContent;
		    break;
		case "first_retrieve":
		    info.first_retrieve = elem.textContent;
		    let date = info.first_retrieve.match(/\d+/g);
		    let d = new Date(date[0],date[1]-1,date[2],date[3],date[4],date[5]);
		    info.first_retrieve = d.getTime() / 1000; // seconds from epoc.
		    break;
		case "length":
		    if( this._videolength["_"+info.video_id] ){
			info.length = this._videolength["_"+info.video_id];
		    }else{
			info.length = elem.textContent;
		    }
		    let len = info.length.match(/\d+/g);
		    info.length_ms = (parseInt(len[0],10)*60 + parseInt(len[1],10))*1000;
		    break;
		case "view_counter":
		    info.view_counter = parseInt(elem.textContent);
		    break;
		case "comment_num":
		    info.comment_num = parseInt(elem.textContent);
		    break;
		case "mylist_counter":
		    info.mylist_counter = parseInt(elem.textContent);
		    break;
		case "tags":
		    // attribute domain=jp のチェックが必要.
		    // また、半角に正規化.
		    if( elem.getAttribute('domain')=='jp' ){
			let tag = elem.getElementsByTagName('tag');// DOM object
			info.tags = new Array();
			for(let i=0,item;item=tag[i];i++){
			    info.tags[i] = restorehtmlspecialchars(ZenToHan(item.textContent)); // string
			}
		    }else{
			let domain = elem.getAttribute('domain');
			let tag = elem.getElementsByTagName('tag');
			if( !info.overseastags ){
			    info.overseastags = new Array();
			    info.overseastags2 = new Object();
			}
			info.overseastags2[domain] = new Array();
			for(let i=0,item;item=tag[i];i++){
			    let tag = restorehtmlspecialchars(ZenToHan(item.textContent));
			    info.overseastags.push( tag );
			    info.overseastags2[domain].push(tag);
			}
		    }
		    break;
		case "size_high":
		    info.filesize = parseInt(elem.textContent);
		    info.highbitrate = elem.textContent;
		    info.highbitrate = (info.highbitrate*8 / (info.length_ms/1000) / 1000).toFixed(2); // kbps "string"
		    break;
		case "size_low":
		    info.lowbitrate = elem.textContent;
		    info.lowbitrate = (info.lowbitrate*8 / (info.length_ms/1000) / 1000).toFixed(2); // kbps "string"
		    break;
		case "movie_type":
		    info.movie_type = elem.textContent;
		    break;
		case "no_live_play":
		    info.no_live_play = parseInt(elem.textContent);
		    break;
		default:
		    break;
		}
	    }
	} catch (x) {
	    info.video_id = null;
	    debugprint('error occured in xmlToMovieInfo:'+x);
	}

	// video_id がないときはエラーとしておこう、念のため.
	if( !info.video_id ) return null;

	try{
	    info.pname = this.getPName(info);
	} catch (x) {
	    info.pname = "";
	}

	try{
	    info.mylistcomment = NicoLiveMylist.mylist_itemdata["_"+info.video_id].description;
	    info.registerDate = NicoLiveMylist.mylist_itemdata["_"+info.video_id].pubDate;
	} catch (x) {
	    info.mylistcomment = "";
	    info.registerDate = 0; // Unix time
	}
	try{
	    info.uadp = this._uadp["_"+info.video_id];
	} catch (x) {}

	try{
	    info.product_code = this.product_code["_"+info.video_id];
	} catch (x) {}
	return info;
    },

    /**
     * 動画をストックに追加する.
     */
    addStock: function(sm){
	if(sm.length<3) return;
	if(this.isStockedMusic(sm)) return;

	let non_db = $('add-non-db-video').hasAttribute('checked');
	if( non_db ){
	    if( NicoLiveDatabase.isInDB(sm) ){
		debugprint(sm+"は動画DBにあるため追加されませんでした");
		return;
	    }
	}

	let f = function(xml, req){
	    if( req.readyState==4 && req.status==200 ){
		// ストックでもリクエスト縛り要件を満たすかチェックする.
		let ans = NicoLiveHelper.checkToAcceptRequest(req.responseXML, 0);
		switch(ans.code){
		case 0:
		case -2: // リク受けつけてない.
		case -4: // 再生済み.
		case -5: // リク済み.
		case -7: // 枠に収まらない.
		    ans.movieinfo.iscasterselection = true; // ストックは主セレ扱い.
		    ans.movieinfo.video_id = sm;
		    if(NicoLiveHelper.isPlayedMusic(ans.movieinfo.video_id)){
			ans.movieinfo.isplayed = true;
		    }
		    ans.movieinfo.user_id = "1";
		    NicoLiveHelper.addStockQueue(ans.movieinfo);
		    break;
		case -1:
		    break;
		default:
		    //debugprint(sm+'/'+ans.msg);
		    ans.movieinfo.error = true;
		    NicoLiveHelper.addErrorRequestList(ans.movieinfo);
		    break;
		}
	    }
	};
	NicoApi.getthumbinfo( sm, f );
    },

    // 現在のリクエスト処理キューをクリアする.
    clearRequestProcessingQueue:function(){
	this.requestprocessingqueue = new Array();
	this.showRequestProgress();
    },

    // リクエスト処理キューを先頭から処理する.
    processRequest:function(){
	let q;
	let cnt = 0;
	while( NicoLiveHelper.requestprocessingqueue.length && NicoLiveHelper.requestprocessingqueue[0].xml!=null ){
	    cnt++;
	    q = NicoLiveHelper.requestprocessingqueue.shift();

	    let ans = NicoLiveHelper.checkToAcceptRequest( q.xml, q.comment_no, q.is_self_request );
	    ans.movieinfo.iscasterselection = q.comment_no==0?true:false; // コメ番0はリクエストではなくて主セレ扱い.
	    ans.movieinfo.selfrequest = q.is_self_request;

	    // 動画情報にはコメ番とリク主のユーザーIDを含む.
	    ans.movieinfo.cno = q.comment_no;
	    ans.movieinfo.user_id = q.user_id;

	    ans.movieinfo.video_id = q.video_id;

	    if(ans.code==0){
		let checker = NicoLiveHelper.runRequestCheckerScript(ans.movieinfo);
		if(checker!=null){
		    ans.code = checker.code;
		    ans.msg = checker.msg;
		}
	    }

	    // リクエスト制限数をチェック.
	    let nlim = NicoLivePreference.nreq_per_ppl;
	    if(!NicoLiveHelper.request_per_ppl[q.user_id]){
		NicoLiveHelper.request_per_ppl[q.user_id] = 0;
	    }
	    if( ans.code==0 && !q.is_self_request){
		// 自貼りはカウントしなくてOK.
		NicoLiveHelper.request_per_ppl[q.user_id]++;
	    }

	    let n = NicoLiveHelper.request_per_ppl[q.user_id];
	    if(ans.code==0 && n>nlim && nlim>0){
		NicoLiveHelper.request_per_ppl[q.user_id]--;
		ans.msg = NicoLivePreference.msg.limitnumberofrequests;
		ans.code = -2;
		if(NicoLiveHelper.anchor.counter>0) NicoLiveHelper.anchor.counter--;
	    }

	    ans.movieinfo.request_id = NicoLiveHelper.request_id;

	    if( this.iscaster && NicoLivePreference.getusername ){
		this.getUserName( ans.movieinfo.posting_user_id );
	    }

	    switch(ans.code){
	    case 0:
		ans.movieinfo.error = false;
		NicoLiveHelper.addRequestQueue(ans.movieinfo);
		break;
	    case -1:
		ans.movieinfo.error = true;
		break;
	    default:
		ans.movieinfo.error = true;
		NicoLiveHelper.addErrorRequestList(ans.movieinfo);
		break;
	    }
	    if(NicoLivePreference.isautoreply && ans.msg){
		// 返答メッセージが指定してあれば主コメする.
		let info = ans.movieinfo;
		info.restrict = NicoLivePreference.restrict;
		ans.msg = NicoLiveHelper.replaceMacros(ans.msg, info);
		if( ans.msg ){
		    let msg;
		    if( ans.msg.indexOf("/")!=0 ){
			msg = ">>"+q.comment_no+" " + ans.msg;
		    }else{
			msg = ans.msg;
		    }
		    if( q.comment_no!=0 ){
			if( NicoLivePreference.show_autoreply ){
			    let func = function(){
				NicoLiveHelper.postCasterComment(msg,"");
			    };
			    NicoLiveHelper.clearCasterCommentAndRun(func);
			}else{
			    NicoLiveHelper.postCasterComment(msg,"");
			}
		    }
		    debugprint(msg);
		}
	    }
	    NicoLiveHelper.updateRemainRequestsAndStocks();
	}// end of while	
	if( cnt ){
	    NicoLiveHelper.saveRequest();
	}
	NicoLiveHelper.showRequestProgress();
    },

    // リクエストの処理状況を表示する.
    showRequestProgress:function(){
	if( this.requestprocessingqueue.length==0 ){
	    $('request-progress').style.display = 'none';
	}else{
	    let processlist = "";
	    for(let i=0,item; (item=this.requestprocessingqueue[i]) && i<10; i++){
		processlist += item.video_id + " ";
	    }
	    $('request-progress-label').value = processlist;
	    $('request-progress').style.display = '';
	}
    },

    /**
     * 動画をリクエストに追加する.
     * @param vid 動画ID
     * @param cno コメント番号
     * @param userid リク主のユーザID
     * @param is_self_request 自貼りか否か.
     * @param retry getthumbinfoをリトライ
     */
    addRequest: function(vid,cno,userid, is_self_request, retry){
	if(vid.length<3) return;

	if( !retry ){
	    let request = new Object();
	    request.video_id = vid;
	    request.comment_no = cno;
	    request.user_id = userid;
	    request.is_self_request = is_self_request;
	    request.xml = null;
	    request.time = GetCurrentTime();
	    this.requestprocessingqueue.push(request);

	    this.showRequestProgress();
	}

	let f = function( xml, req ){
	    let i,q;
	    if( req.status!=200 && !retry ){
		setTimeout( function(){
				NicoLiveHelper.addRequest(vid,cno,userid,is_self_request,true);
			    }, 2000 );
		ShowNotice(vid+"の動画情報取得に失敗したため、リトライします(code="+req.status+")");
		return;
	    }

	    for(i=0;q=NicoLiveHelper.requestprocessingqueue[i];i++){
		if(q.video_id==vid && q.comment_no==cno && q.xml==null){
		    if( req.status==200 ){
			q.xml = req.responseXML;
		    }else{
			// HTTPエラーのときはリクエスト処理キューから削除してあげる.
			// 実験したところ、タイムアウトもこっちでokみたい.
			NicoLiveHelper.requestprocessingqueue.splice(i,1);
			ShowNotice(q.video_id+"の動画情報取得に失敗したため、リクエストから削除します(code="+req.status+")");
		    }
		    break;
		}
	    }
	    NicoLiveHelper.processRequest();
	};

	NicoApi.getthumbinfo( vid, f );
    },

    /**
     * リクエストチェックスクリプトを走らせる.
     * @param info 動画情報
     * @return リクエスト拒否メッセージを返す. 何も返さないとチェックはパスしたものとする.
     */
    runRequestCheckerScript:function(info){
	if( NicoLivePreference.do_customscript && NicoLivePreference.customscript.requestchecker ){
	    let r;
	    try{
		r = eval( NicoLivePreference.customscript.requestchecker );
	    } catch (x) {
		// eval失敗時はチェックをパスしたものとする.
		r = null;
	    }
	    if('string'==typeof r){
		return {"code":-2,"msg":r};
	    }
	}
	return null;
    },

    // 再生済みかどうか.
    isPlayedMusic:function(video_id){
	if(this.musicinfo && this.musicinfo.video_id==video_id){
	    // 現在再生している曲.
	    return true;
	}
	if(this.playlist["_"+video_id]) return true;
	return false;
    },

    // ストックの再生済みステータスを解除する.
    offPlayedStatus:function(video_id){
	this.playlist["_"+video_id] = 0;
	for(let i=0,item; item=this.stock[i];i++){
	    if(item.video_id==video_id){
		item.isplayed = false;
	    }
	}
    },

    setSelfRequestFlag:function(video_id){
	let b = false;
	let i,item;
	for(i=0;item=this.requestqueue[i];i++){
	    if(item.video_id==video_id){
		item.selfrequest = true;
		b = true;
		break;
	    }
	}
	if(b){
	    let requestelems = evaluateXPath(document,"//*[@id='request-table']/html:tbody/html:tr");
	    requestelems[i].className = "table_selfreq";
	    //NicoLiveRequest.update(this.requestqueue);
	    this.saveRequest();
	}
    },

    // リクエスト済みチェック.
    isRequestedMusic:function(video_id){
	if( NicoLivePreference.allow_duplicative ){ return false; } // リクエスト重複許可なので、リク済みは常にfalse

	for(let i=0,item;item=this.requestqueue[i];i++){
	    // リクエストキューに既にある動画.
	    if(item.video_id==video_id){
		return true;
	    }
	}
	return false;
    },
    isStockedMusic:function(video_id){
	for(let i=0,item;item=this.stock[i];i++){
	    // ストックキューに既にある動画.
	    if(item.video_id==video_id){
		return true;
	    }
	}
	return false;
    },

    // コメントサーバからやってくる行を処理する.
    processLine: function(line){
	//debugprint(line);
	if(line.match(/^<chat\s+.*>/)){
	    //debugprint(line);
	    let parser = new DOMParser();
	    let dom = parser.parseFromString(line,"text/xml");
	    let chat = this.extractComment(dom.getElementsByTagName('chat')[0]);
	    this.processComment(dom.getElementsByTagName('chat')[0]); // this line is used for old-version of extra extensions.
	    this.processComment2(chat);
	    return;
	}

	let dat;
	dat = line.match(/<chat_result.*status=\"(\d+)\".*\/>/);
	if(dat){
	    let r = parseInt(dat[1]);
	    debugprint("chat result="+r);
	    switch(r){
	    case 0: // success
		this.previouschat = this.chatbuffer;
		break;
	    case 4: // need getpostkey
		this.getpostkey();
		break;
	    case 1: // リスナーコメ投稿規制.
		ShowNotice(LoadString('STR_FAILED_TO_COMMENT_BY_CONTROL'));
		break;
	    default:
		break;
	    }
	    return;
	}
	// 16進数表すキーワードってなんだったっけ….
	dat = line.match(/<thread.*ticket=\"([0-9a-fA-Fx]*)\".*\/>/);
	if( dat ){
	    if( this.ticket != dat[1] ){
		ShowNotice("コメントサーバに接続しました");
		if( $('automatic-broadcasting').hasAttribute('checked') ){
		    debugprint("自動放送モードにより、放送を自動開始します。");
		    NicoLiveHelper.beginLive( NicoLiveHelper.token );
		}
	    }
	    this.ticket = dat[1];
	    debugprint('ticket='+this.ticket);
	    // <ping>EOT</ping>
	    //this.coStream.writeString("<ping>EOT</ping>");
	}
	dat = line.match(/<thread.*last_res=\"([0-9a-fA-Fx]*)\".*\/>/);
	if(dat){
	    this.last_res = parseInt(dat[1]);
	    debugprint('last_res='+this.last_res);
	}

	dat = line.match(/<ping>.*<\/ping>/i);
	if(dat){
	    //this.coStream.writeString("<ping>EOT</ping>");
	}
    },

    /** コメントサーバに接続.
     * @param server サーバ.
     * @param port ポート.
     * @param thread スレッド番号.
     * このメソッドはgetplayerstatusでコメントサーバを調べたあとに呼ばれる.
     * コメントサーバに接続すると、コメント要求を行う.
     */
    connectCommentServer: function(server,port,thread){
	//<thread thread="1005799549" res_from="-50" version="20061206"/>
	this.connecttime = new Date();
	this.connecttime = this.connecttime.getTime()/1000; // convert to second from epoc.

	let dataListener = {
	    line: "",
	    onStartRequest: function(request, context){},
	    onStopRequest: function(request, context, status){
		try{
		    if( !NicoLiveHelper._donotshowdisconnectalert ){
			let musictime = $('statusbar-music-name');
			musictime.label="コメントサーバから切断されました。";
			PlayAlertSound();
			ShowNotice('コメントサーバから切断されました。',true);

			setTimeout( function(){
					AlertPrompt('コメントサーバから切断されました。(code='+status+')',NicoLiveHelper.request_id);
				    }, 5000 );

		    }
		    NicoLiveHelper.close();
		} catch (x) {
		}
	    },
	    onDataAvailable: function(request, context, inputStream, offset, count) {
		let lineData = {};
		let r;
		while(1){
		    // まとめて読むと、行単位の区切り付けるのメンドイんで.
		    try{
			r = NicoLiveHelper.ciStream.readString(1,lineData);
		    } catch (x) { debugprint(x); return; }
		    if( !r ){ break; }
		    if( lineData.value=="\0" ){
			try{
			    NicoLiveHelper.processLine(this.line);
			} catch (x) {
			    AlertPrompt(x);
			}
			this.line = "";
			continue;
		    }
		    this.line += lineData.value;
		}
	    }
	};

	let iostream = TcpLib.connectTcpServer( server, port, dataListener );
	this.coStream = iostream.ostream;
	this.ciStream = iostream.istream;

	let lines;
	try{
	    lines = NicoLivePreference.getBranch().getIntPref("comment.log") * -1;
	} catch (x) {
	    lines = -100;
	}
	let str = "<thread thread=\""+thread+"\" res_from=\""+lines+"\" version=\"20061206\"/>\0";
	if( 0 && this._timeshift ){
	    // タイムシフトで時間軸で順次コメント取ってくるのは面倒.
	    // <thread thread="1016805032" res_from="-1000" version="20061206" when="1268170184" waybackkey="1268236432.bWafikc3gow8SXZxrBHPyNYM0bk" user_id="21693"/>
	    str = "<thread thread=\""+thread+"\" res_from=\"-1000\" version=\"20061206\" when=\""+(this.starttime+240)+"\" waybackkey=\""+this.waybackkey+"\" user_id=\""+this.user_id+"\"/>\0";
	    debugprint(str);
	    this.starttime = GetCurrentTime();
	    this.serverconnecttime = 0;
	    this.connecttime = 0;
	}
	this.coStream.writeString(str);

	this._updateprogressid = setInterval( function(){
						  NicoLiveHelper.update();
					      }, 1000);
	// 3分に1回送ってればいいのかね.
	this._keepconnection = setInterval( function(){
						NicoLiveHelper.keepConnection();
					    }, 1000*60*3);
	//this.heartbeat();
	this._heartbeat = setInterval( function(){
					   NicoLiveHelper.heartbeat();
				       }, 1*60*1000);
	this.sendStartupComment();
	if( NicoLivePreference.isjingle ) this.playJingle();

	let prefs = NicoLivePreference.getBranch();
	if(prefs.getBoolPref("savecomment")){
	    try{
		NicoLiveComment.openFile(this.request_id, this.community);
	    } catch (x) {
		debugprint(x);
	    }
	}
	// NicoLiveComment.getNGWords();// obtain NG words list.

	debugprint('Server clock:'+GetDateString(this.serverconnecttime*1000));
	debugprint('PC clock:'+GetDateString(this.connecttime*1000));
	// サーバ時刻にしておけば間違いないかな.
	this.connecttime = this.serverconnecttime;
    },

    // コメントサーバーに接続する前に必要な一仕事をしてから接続する.
    preprocessConnectServer:function(){
	NicoLiveHelper.getToken(NicoLiveHelper.request_id,
					function(){
					    NicoLiveHelper.connectCommentServer(NicoLiveHelper.addr,NicoLiveHelper.port,NicoLiveHelper.thread);
					});
    },

    keepConnection:function(){
	let str = "<thread thread=\""+this.thread+"\" res_from=\"0\" version=\"20061206\"/>\0";
	//let str = "<ping>PING</ping>";
	this.coStream.writeString(str);
    },

    // 接続を閉じる.
    close: function(){
	try{
	    clearInterval(this._updateprogressid);
	    clearInterval(this._playnext);
	    clearInterval(this._sendmusicid);
	    clearInterval(this._prepare);
	    clearInterval(this._heartbeat);
	} catch (x) {
	}

	if( this.coStream ){
	    debugprint("delete output stream");
	    this.coStream.close();
	    delete this.coStream;
	}
	if( this.ciStream ){
	    debugprint("delete input stream");
	    this.ciStream.close();
	    delete this.ciStream;
	}
    },
    updatePNameWhitelist:function(){
	let pnames = NicoLiveDatabase.loadGPStorage('nicolive_pnamewhitelist','');
	pnames = pnames.split(/[\r\n]/gm);
	for(let i=0,pname;pname=pnames[i];i++){
	    if(pname){
		pname_whitelist["_"+ZenToHan(pname)] = true;
	    }
	}
	debugprint('update PName Whitelist');
    },

    // 残り時間が n 分 になったときの通知処理.
    showNotice3minleft:function(){
	let str;
	str = NicoLivePreference.getBranch().getUnicharPref('notice.message');
	str = this.replaceMacros(str,this.musicinfo);
	if( NicoLivePreference.notice.area ){
	    ShowNotice(str);
	}
	if( NicoLivePreference.notice.comment ){
	    this.postCasterComment(str,"");
	}
	if( NicoLivePreference.notice.dialog ){
	    AlertPrompt(str, this.request_id+":"+this.title);
	}

	if( NicoLivePreference.notice.popup ){
	    ShowPopupNotification("http://icon.nimg.jp/community/"+this.community, this.title, str, this.request_id);
	}
	if( NicoLivePreference.notice.sound ){
	    try{
		let IOService = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService);
		let localFile = Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsILocalFile);
		let sound = Cc["@mozilla.org/sound;1"].createInstance(Ci.nsISound);
		let url = NicoLivePreference.notice.soundfile;
		localFile.initWithPath(url);
		sound.play(IOService.newFileURI(localFile));
	    } catch (x) {
		debugprint("failed to play sound:"+x);
	    }
	}
	if( NicoLivePreference.notice.infobar ){
	    this.addInformationBar(str);
	}
    },

    // ニコニコ生放送の情報バーを用いて通知する.
    addInformationBar:function(str){
	try{
	    let tab = NicoLiveWindow.findTab(this.request_id) || NicoLiveWindow.findTab(this.community);
	    let Nicolive = tab.linkedBrowser._contentWindow.wrappedJSObject.Nicolive;
	    Nicolive.Liveinfo.prototype._infoTypes[100] = "nlh";
	    Nicolive.Liveinfo.prototype._infoTypesInverted["nlh"] = 100;
	    Nicolive.Liveinfo.prototype._infoTypeHeaders["nlh"] = "【NicoLive Helper】";
	    Nicolive.Liveinfo.liveinfoArea._defaultLiveinfoConf.infoTypeEnableFlags["nlh"] = true;
	    Nicolive.Liveinfo.liveinfoArea.addInfo(100,str);
	} catch (x) {
	}
    },

    // ステータスバーの表示を更新.
    updateStatusBar:function(){
	let currentmusic = $('statusbar-currentmusic');
	let playprogress = $('statusbar-music-progressmeter');
	let musictime = $('statusbar-music-name');
	let progress,progressbar;
	let liveprogress = $('statusbar-live-progress');
	let now = GetCurrentTime();
	let p = now - this.starttime;  // Progress
	let n = Math.floor(p/(30*60)); // 30分単位に0,1,2,...
	let remaintime = this.endtime - now;
	
	switch( this.type_of_live_time_format ){
	case 0:
	    liveprogress.label = GetTimeString(p);
	    break;
	case 1:
	    if( remaintime<0 ){
		liveprogress.label = GetTimeString( -1*remaintime );
	    }else{
		liveprogress.label = "-"+GetTimeString(remaintime);
	    }
	    break;
	default:
	    liveprogress.label = GetTimeString(p);
	    break;
	}

	if(!this.musicinfo.length_ms){ currentmusic.setAttribute("tooltiptext",""); return; }

	// 再生中動画の更新
	let str;
	str = "投稿日/"+GetDateString(this.musicinfo.first_retrieve*1000)
	    + " 再生数/"+this.musicinfo.view_counter
	    + " コメント/"+this.musicinfo.comment_num
	    + " マイリスト/"+this.musicinfo.mylist_counter+"\n"
	    + "タグ/"+this.musicinfo.tags.join(',');
	if(this.musicinfo.mylist!=null){
	    str = "マイリスト登録済み:"+this.musicinfo.mylist + "\n"+str;
	}
	currentmusic.setAttribute("tooltiptext",str);

	let w = window.innerWidth - $('statusbar-remain').clientWidth - $('statusbar-n-of-listeners').clientWidth - $('statusbar-live-progress').clientWidth;
	w-=16;
	musictime.style.maxWidth = w + "px";

	progress = GetCurrentTime()-this.musicstarttime;
	progressbar = Math.floor(progress / (this.musicinfo.length_ms/1000) * 100);
	if(this.inplay){ // 再生中のプログレスバーのツールチップ設定.
	    playprogress.value = progressbar;
	    let remain = this.musicinfo.length_ms/1000 - progress;
	    if(remain<0){
		remain = 0;
		progress = this.musicinfo.length_ms/1000;
	    }
	    str = this.musicinfo.title
		+ "("+(this.flg_displayprogresstime ? GetTimeString(progress) : "-"+GetTimeString(remain))
		+ "/"+this.musicinfo.length+")";
	    musictime.label = str;
	}else{
	    playprogress.value = 0;
	    musictime.label = "";
	}
    },

    /**
     * 現在の再生曲の再生時間と、生放送の経過時間をプログレスバーで表示するために、
     * 1秒間隔で呼び出し
     */
    update:function(){
	let now = GetCurrentTime();
	let p = now - this.starttime;  // Progress
	let n = Math.floor(p/(30*60)); // 30分単位に0,1,2,...
	let remaintime = this.endtime - now;

	this.updateStatusBar();

	if( this.iscaster && (p%60)==0 && this._exclude ){
	    // 配信開始していない間は1分ごとにステータスチェック.
	    this.getToken(this.request_id);
	}

	if(p<0) p = 0;

	// 自動無料延長処理
	if( this.iscaster && this.endtime ){
	    // 残り時間3分を切ると、15秒ごとに自動無料延長を試みる.
	    if( remaintime>0 && remaintime<=180 ){
		if( $('auto-freeextend').hasAttribute('checked') ){
		    if( 180-remaintime > this._extendcnt*15 ){
			this._extendcnt = parseInt( (180-remaintime) / 15 + 1 );
			//this._extendcnt++;
			if( this._extendcnt<=6 ){
			    this.getsalelist(true);
			    debugprint("自動無料延長を行います");
			}
		    }
		}
	    }
	}

	// 残り時間の通知
	let nt = NicoLivePreference.notice.time;
	if( (this.endtime && remaintime>0 && remaintime < nt*60) ||
	    (!this.endtime && n>=0 && p > (30-nt)*60 + 30*60*n) ){
	    // 終了時刻が分かっているのであれば終了時刻から残り3分未満を見る.
	    // 分からないときは 27分+30分*n(n=0,1,2,...)越えたら.
	    if(!this.isnotified[n]){
		this.showNotice3minleft();
		this.isnotified[n] = true;
	    }
	}

	// 終了時刻の更新
	if( !this._timeshift ){
	    if( this.endtime && this.endtime<now ){
		// 終了時刻を越えたら新しい終了時刻が設定されているかどうかを見にいく.
		this.endtime = 0;
		this.getToken(this.request_id);
		if( !this.iscaster ){
		    this.updateEndTime(this.request_id);
		}
		this._enterlosstime = now;
	    }
	    if( this.endtime==0 ){
		if( (now-this._enterlosstime) > 2*60 ){
		    if( (playprogress.value>=99 || !this.inplay) && this.isAutoWindowClose() ){
			// ロスタイムに入って2分経ったら自動で終了にする.
			// ただし再生中は保留.
			this.finishBroadcasting();
		    }
		}
	    }
	}

    },

    // プログレスバーの現在の動画の再生時間表示で、progressとremainの表示を切り替え.
    changeDisplayProgressTime:function(event){
	event = event || window.event;
	let btnCode;
	if ('object' == typeof event){
	    btnCode = event.button;
	    switch (btnCode){
	    case 0: // left
                break;
	    case 1: // middle
	    case 2: // right
	    default: // unknown
		return;
	    }
	}
	this.flg_displayprogresstime = !this.flg_displayprogresstime;
	this.updateStatusBar();
    },

    // 生放送時間表示の変更
    changeLiveTimeFormat:function(event){
	event = event || window.event;
	let btnCode;
	if ('object' == typeof event){
	    btnCode = event.button;
	    switch (btnCode){
	    case 0: // left
                break;
	    case 1: // middle
	    case 2: // right
	    default: // unknown
		return;
	    }
	}
	if( this.type_of_live_time_format==undefined ) this.type_of_live_time_format = 0;
	this.type_of_live_time_format++;
	this.type_of_live_time_format %= 2;
	this.updateStatusBar();
    },

    disconnectFromNicoLiveAlert:function(){
	NicoLiveAlertModule.closeConnection();
    },

    // 次枠自動接続のトグル
    changeAutoNextLiveSetting:function(event){
	if( this.isOffline() ) return;
	if( !this.community ) return;
	event = event || window.event;
	let btnCode;
	if ('object' == typeof event){
	    btnCode = event.button;
	    switch (btnCode){
	    case 0: // left
                break;
	    case 1: // middle
	    case 2: // right
	    default: // unknown
		return;
	    }
	}

	if( NicoLiveAlertModule.isRegistered( this.community ) ){
	    NicoLiveAlertModule.unregisterTarget( this.community );
	}else{
	    NicoLiveAlertModule.registerTarget( this.community, this );
	}
	this.setAutoNextLiveIcon();
    },
    setAutoNextLiveIcon:function(){
	if( NicoLiveAlertModule.isRegistered( this.community ) ){
	    $('statusbar-autonext').setAttribute('src','chrome://nicolivehelper/content/data/next.png');
	    if( !this.isOffline() ){
		NicoLiveAlertModule.connect( new XMLHttpRequest() );
	    }
	}else{
	    $('statusbar-autonext').setAttribute('src','chrome://nicolivehelper/content/data/next-mono.png');
	}
    },

    // タイムシフト用.
    getwaybackkey:function(req_id){
	if(this.isOffline()) return;
	let f = function(xml, req){
	    if( req.readyState==4 && req.status==200 ){
		let tmp = req.responseText.match(/waybackkey=(.*)/);
		if(tmp){
		    NicoLiveHelper.waybackkey = tmp[1];
		    debugprint('waybackkey='+NicoLiveHelper.waybackkey);
		    NicoLiveHelper.connectCommentServer(NicoLiveHelper.addr,NicoLiveHelper.port,NicoLiveHelper.thread);
		}else{
		    NicoLiveHelper.waybackkey = undefined;
		    debugalert('タイムシフト放送への接続に失敗しました');
		}
	    }
	};
	NicoApi.getwaybackkey( this.thread, f );
    },

    // タイムシフトのときに再生された動画を全部、プレイリスト(テキスト)に.
    construct_playlist_for_timeshift:function(xml){
	this._timeshift = true;
	let que = evaluateXPath(xml,"//quesheet/que");
	let elem = $('played-list-textbox');
	elem.value += this.title+" "+this.request_id+" ("+GetFormattedDateString("%Y/%m/%d %H:%M",this.starttime*1000)+"-)\n";
	for(let i=0,item;item=que[i];i++){
	    //debugprint(item.textContent);
	    let dat = item.textContent.match(/^\s*\/play(sound)*\s*smile:(((sm|nm|ze|so)\d+)|\d+)\s*(main|sub)\s*\"?(.*)\"?$/);
	    if(dat){
		let vid = dat[2];
		let title = dat[6];
		elem.value += vid+" "+title+"\n";
	    }
	}
	this.getwaybackkey(this.request_id);
    },

    // getplayerstatus APIから生放送情報を取得する.
    connectLive: function(req_id){
	let f = function(xml, req){
	    if( req.readyState!=4 || req.status!=200 ) return;
	    if( xml.getElementsByTagName('code').length ){
		debugalert("番組情報を取得できませんでした. CODE="+ xml.getElementsByTagName('code')[0].textContent );
		return;
	    }
	    try {
		NicoLiveHelper.request_id = xml.getElementsByTagName('id')[0].textContent;
		NicoLiveHelper.owner_name = xml.getElementsByTagName('owner_name')[0].textContent;
		if( !NicoLiveHelper.title ){
		    NicoLiveHelper.title  = xml.getElementsByTagName('title')[0].textContent;
		}
		if( NicoLivePreference.isSingleWindowMode() ){
		    document.title = NicoLiveHelper.request_id+":"+NicoLiveHelper.title+" ("+NicoLiveHelper.owner_name+"/Single Window)";
		}else{
		    document.title = NicoLiveHelper.request_id+":"+NicoLiveHelper.title+" ("+NicoLiveHelper.owner_name+")";
		}
		NicoLiveHelper.user_id    = xml.getElementsByTagName('user_id')[0].textContent;
		NicoLiveHelper.user_name  = xml.getElementsByTagName('nickname')[0].textContent;
		NicoLiveHelper.is_premium = xml.getElementsByTagName('is_premium')[0].textContent;
		NicoLiveHelper.addr       = xml.getElementsByTagName('addr')[0].textContent;
		NicoLiveHelper.port       = xml.getElementsByTagName('port')[0].textContent;
		NicoLiveHelper.thread     = xml.getElementsByTagName('thread')[0].textContent;
		NicoLiveHelper.iscaster   = xml.getElementsByTagName('is_owner')[0].textContent;
		NicoLiveHelper.opentime   = parseInt(xml.getElementsByTagName('open_time')[0].textContent); // 開場時刻.
		NicoLiveHelper.starttime  = parseInt(xml.getElementsByTagName('start_time')[0].textContent);// 開演時刻.
		NicoLiveHelper.endtime   = parseInt(xml.getElementsByTagName('end_time')[0].textContent); // 閉場時刻.
		NicoLiveHelper.community  = xml.getElementsByTagName('default_community')[0].textContent;
		if( NicoLiveHelper.iscaster!="0" ){
		    NicoLiveHelper.iscaster=true;
		    debugprint('あなたは生放送主です');
		}else{
		    NicoLiveHelper.iscaster = false;
		    debugprint('あなたは視聴者です');
		}
		// 新しいインスタンスを渡すため
		if( NicoLiveAlertModule.isRegistered( NicoLiveHelper.community ) ){
		    NicoLiveAlertModule.registerTarget( NicoLiveHelper.community, NicoLiveHelper );
		}
		
		NicoLiveHelper.setAutoNextLiveIcon();
		NicoLiveHttpObserver.init();
		NicoLiveHelper._register_http_observer = true;

		// 現在再生している動画を調べる.
		// mainとsubの両方でsm/nm動画を再生しているときは、mainを優先させる.
		let contents = xml.getElementsByTagName('contents');
		for(let i=0,currentplay;currentplay=contents[i];i++){
		    let st = currentplay.attributes.getNamedItem('start_time'); // 再生開始時刻.
		    let du = currentplay.attributes.getNamedItem('duration');   // 動画の長さ.
		    st = st && parseInt(st.nodeValue) || 0;
		    du = du && parseInt(du.nodeValue) || 0;
		    if(du){
			// 動画の長さが設定されているときは何か再生中.
			let remain;
			remain = (st+du)-GetCurrentTime(); // second.
			remain *= 1000; // convert to ms.
			remain = Math.floor(remain);
			if( NicoLiveHelper.iscaster ){
			    // 生主モードなら次曲再生できるようにセット.
			    NicoLiveHelper.setupPlayNextMusic(remain);
			}
			// 再生中の動画情報をセット.
			let tmp = currentplay.textContent.match(/(sm|nm|ze)\d+|\d{10}/);
			if(tmp){
			    NicoLiveHelper.musicstarttime  = st;
			    NicoLiveHelper.current_video_id = tmp[0];
			    NicoLiveHelper.setCurrentVideoInfo(tmp[0],false);
			    NicoLiveHelper.inplay = true;
			}
			break;
		    }
		}
		// サーバ時刻を調べる.
		//let serverdate = req.getResponseHeader("Date");
		let serverdate = evaluateXPath(xml,"/getplayerstatus/@time");
		if(serverdate.length){
		    serverdate = serverdate[0].textContent;
		}else{
		    serverdate = GetCurrentTime();
		}
		serverdate = new Date(serverdate*1000);
		NicoLiveHelper.serverconnecttime = serverdate.getTime()/1000;

		// Twitter投稿について調べる.
		let tw;
		tw = evaluateXPath(xml,"/getplayerstatus/user/twitter_info/status");
		if( tw.length ) NicoLiveHelper.twitterinfo.status = tw[0].textContent=="enabled"?true:false;
		tw = evaluateXPath(xml,"/getplayerstatus/user/twitter_info/tweet_token");
		if( tw.length ) NicoLiveHelper.twitterinfo.token = tw[0].textContent;
		tw = evaluateXPath(xml,"/getplayerstatus/twitter/live_enabled");
		if( tw.length ) NicoLiveHelper.twitterinfo.live_enabled = tw[0].textContent;
		tw = evaluateXPath(xml,"/getplayerstatus/twitter/live_api_url"); // + "twitterpost"
		if( tw.length ) NicoLiveHelper.twitterinfo.api_url = tw[0].textContent;
		tw = evaluateXPath(xml,"/getplayerstatus/stream/twitter_tag");
		if( tw.length ) NicoLiveHelper.twitterinfo.hashtag = tw[0].textContent;


		try{
		    NicoLiveHelper.user_id = evaluateXPath(xml,"/getplayerstatus/user/user_id")[0].textContent;
		} catch (x) {
		    NicoLiveHelper.user_id = "";
		}

		debugprint("addr:"+NicoLiveHelper.addr);
		debugprint("port:"+NicoLiveHelper.port);
		debugprint("thread:"+NicoLiveHelper.thread);

		NicoLiveHelper._donotshowdisconnectalert = false;
		if( evaluateXPath(xml,"//quesheet").length ){
		    // タイムシフトの場合プレイリストを再構築.
		    NicoLiveHelper.construct_playlist_for_timeshift(xml);
		}else{
		    // 主コメトークンを取得してから接続.
		    NicoLiveHelper.preprocessConnectServer();
		}

		NicoLiveHelper.setLiveProgressBarTipText();
		if( !NicoLiveHelper.iscaster ){
		    $('textbox-comment').setAttribute('maxlength','64');
		}

		NicoLiveHelper.getPlayLog();
	    } catch (x) {
		debugalert('コメントサーバに接続中、エラーが発生しました. '+x);
	    }
	};
	this._donotshowdisconnectalert = true;
	this.close();

	NicoApi.getplayerstatus( req_id, f );
    },

    // 初音ミクコミュのプレイログを取得する.
    // 生主が変わったのをいいことに同じ曲を何度もリクするのがいるので.
    getPlayLog:function(){
	if( this.community!="co154" ) return;
	let checking = $('mikulive-recently-played-check').hasAttribute('checked');
	if( !checking ) return;

	debugprint("downloading playlog of co154...");

	let req = new XMLHttpRequest();
	if( !req ) return;
	req.open("GET","http://183.181.4.48/~amano/co154/playlog-json.pl");
	req.onreadystatechange = function(){
	    if( req.readyState==4 && req.status==200 ){
		NicoLiveHelper._playlog = new Object();
		debugprint("playlog of co154 has downloaded.");

		let log = JSON.parse(req.responseText);
		debugprint("length="+log.length);
		for(let i=0,item; item=log[i]; i++){
		    NicoLiveHelper._playlog["_"+item.video_id] = (new Date(item.date)).getTime()/1000;
		}
	    }
	};
	req.send("");
    },

    // 生放送の経過時間表示のツールチップテキストを設定する.
    setLiveProgressBarTipText:function(){
	let str;
	str = 'ロスタイム:'+this.calcLossTime()+'秒';
	if( this.endtime ){
	    let date = new Date(this.endtime*1000);
	    let y,m,d,h,min,sec;
	    y = date.getFullYear();
	    m = date.getMonth() + 1;
	    d = date.getDate();
	    h = date.getHours();
	    min = date.getMinutes();
	    sec = date.getSeconds();
	    str += "\n" + "放送終了時刻:" + y + "/" + m + "/" + d;
	    str += " " + h + ":" + (min<10?"0"+min:min) + ":" + (sec<10?"0"+sec:sec);
	}
	$('statusbar-live-progress').setAttribute("tooltiptext",str);
    },

    /** getplayerstatusを使用して終了時刻を更新.
     * 生主はgetpublishstatusにて更新しているので延長しても大丈夫だけど、
     * リスナーは前述APIを使用できないのでgetplayerstatusを使用して終了時刻endtimeを更新する.
     * @param req_id 放送ID(lvXXXXX)
     */
    updateEndTime:function(req_id){
	debugprint("get getplayerstatus to obtain end_time.");
	let f = function(xml, req){
	    if( req.readyState!=4 || req.status!=200 ) return;
	    let xml = req.responseXML;
	    try{
		NicoLiveHelper.endtime = parseInt(xml.getElementsByTagName('end_time')[0].textContent); // 閉場時刻.
	    } catch (x) {
		NicoLiveHelper.endtime = 0;
	    }
	    if( NicoLiveHelper.endtime < GetCurrentTime() ){
		NicoLiveHelper.endtime = 0;
	    }
	    debugprint("New endtime="+NicoLiveHelper.endtime);
	    NicoLiveHelper.setLiveProgressBarTipText();
	};
	NicoApi.getplayerstatus( req_id, f );
    },

    // duミリ秒後に次曲再生のタイマをしかける.
    setupPlayNextMusic:function(du){
	// du(duration)にはミリ秒を渡す.
	clearInterval(this._playnext);
	clearInterval(this._prepare);
	clearInterval(this._playend);

	let interval = parseInt(NicoLivePreference.nextplay_interval*1000);
	let maxplay  = parseInt(NicoLivePreference.max_movieplay_time*60*1000);

	this._playend = setInterval(
	    function(){
		NicoLiveHelper.inplay = false;
		NicoLiveHelper.commentstate = COMMENT_STATE_NONE;
		clearInterval(NicoLiveHelper._playend);
		// 曲が終わるときに動画情報復帰も停止.
		clearInterval(NicoLiveHelper._revertcommentid);
	    }, du );

	if( this.isautoplay && maxplay>0 && du > maxplay ){
	    // 自動再生のときだけ最大再生時間に合わせる.
	    du = maxplay;
	}

	let next_time = du+interval;
	this._playnext = setInterval(
	    function(){
		NicoLiveHelper.checkPlayNext();
	    }, next_time );
	debugprint( parseInt((next_time)/1000)+'秒後に次曲を再生します');

	let prepare_time1 = next_time - NicoLivePreference.prepare_timing*1000;
	let prepare_time2 = next_time - 40*1000;
	// 40秒の先読み時間を取れないときは実行しない.
	if( prepare_time2<0 ) return;
	if( prepare_time1<0 ) prepare_time1 = 1*1000;
	let prepare_time = prepare_time1;

	this._prepare = setInterval(
	    function(){
		clearInterval(NicoLiveHelper._prepare);
		if( !NicoLivePreference.doprepare ) return; // /prepareしない.

		if(NicoLiveHelper.requestqueue.length){
		    let seed = rand();
		    srand(seed);
		    let n = NicoLiveHelper.chooseNextMusicToPlay(NicoLiveHelper.requestqueue, false);
		    srand(seed);
		    if(n){
			let vid = NicoLiveHelper.requestqueue[n-1].video_id;
			NicoLiveHelper.postCasterComment("/prepare "+vid,"");
			NicoLiveHelper._prepared = vid;
			return;
		    }
		}
		if(NicoLiveHelper.stock.length){
		    let seed = rand();
		    srand(seed);
		    let n = NicoLiveHelper.chooseNextMusicToPlay(NicoLiveHelper.stock, true);
		    srand(seed);
		    if(n){
			let vid = NicoLiveHelper.stock[n-1].video_id;
			NicoLiveHelper.postCasterComment("/prepare "+vid,"");
			NicoLiveHelper._prepared = vid;
			return;
		    }
		}
	    }, prepare_time );
    },

    // ロスタイムを秒で返す.
    calcLossTime:function(){
	return 60; // やっぱり1分固定の予感が.

	// どうも新バージョンでもロスタイム時間は以下の式でOKみたい.
	let tmp = 120 - (this.starttime % 60);
	if( tmp>115 ) tmp = 60;
	tmp = Math.floor(tmp/10)*10; // 10秒未満の端数は切り捨て.
	return tmp;
    },

    heartbeat:function(){
	let f = function(xml,req){
	    if( req.readyState==4 && req.status==200 ){
		let xml = req.responseXML;
		try{
		    let watcher = xml.getElementsByTagName('watchCount')[0].textContent;
		    $('statusbar-n-of-listeners').label = LoadFormattedString('STR_WATCHER',[watcher]);
		} catch (x) {
		}
	    }
	};
	let data = new Array();
	data.push("v="+this.request_id);
	NicoApi.heartbeat( data, f );
    },

    // 配信開始する前に配信タイプを指定する必要があるので、
    // 従来の配信開始configureStreamの前ってことで 0 を付けただけ.
    beginLive:function(token){
	if( !this.iscaster ) return;

	let f = function(xml,req){
	    if( req.readyState==4 ){
		if( req.status==200 ){
		    let confstatus = req.responseXML.getElementsByTagName('response_configurestream')[0];
		    if( confstatus.getAttribute('status')=='ok' ){
			NicoLiveHelper.setLiveStartingStatus(token);
		    }else{
			debugalert(LoadString('STR_FAILED_TO_START_BROADCASTING'));
		    }
		}else{
		    debugalert(LoadString('STR_FAILED_TO_START_BROADCASTING'));
		}
	    }
	};
	NicoApi.configurestream( this.request_id, "key=hq&value=0&version=2&token="+token, f );
    },

    // 配信開始ステータスに変える.
    setLiveStartingStatus:function(token){
	if( !this.iscaster ) return;
	// exclude=0ってパラメタだから
	// 視聴者を排除(exclude)するパラメタをOFF(0)にするって意味だろうな.
	// 新バージョンは version=2 を渡して、開演、終了時刻を知る必要がある.
	// 配信開始前にこれがある
	// 外部配信 http://watch.live.nicovideo.jp/api/configurestream/lv25214688?token=39cf24389dfda675eb2ba996934627794c86fd9b&key=hq&value=1&version=2
	// 簡易配信 http://watch.live.nicovideo.jp/api/configurestream/lv25214688?token=39cf24389dfda675eb2ba996934627794c86fd9b&key=hq&value=0&version=2
	// 配信終了 http://watch.live.nicovideo.jp/api/configurestream/lv25353436?token=8c1fdb8790312869e872ae6617a3ddf43de8eb5b&version=2&key=end%5Fnow

	let f = function(xml,req){
	    if( req.readyState==4 ){
		if( req.status==200 ){
		    let confstatus = req.responseXML.getElementsByTagName('response_configurestream')[0];
		    if( confstatus.getAttribute('status')=='ok' ){
			if( NicoLivePreference.twitter.when_beginlive ){
			    let msg = NicoLiveHelper.replaceMacros(NicoLivePreference.twitter.beginlive, this.musicinfo);
			    NicoLiveTweet.tweet(msg);
			}
			try{
			    NicoLiveHelper.starttime = parseInt(req.responseXML.getElementsByTagName('start_time')[0].textContent);
			    NicoLiveHelper.endtime = parseInt(req.responseXML.getElementsByTagName('end_time')[0].textContent);
			} catch (x) {
			    debugprint(x);
			}
		    }else{
			debugalert(LoadString('STR_FAILED_TO_START_BROADCASTING'));
		    }
		}else{
		    debugalert(LoadString('STR_FAILED_TO_START_BROADCASTING'));
		}
	    }
	};
	NicoApi.configurestream( this.request_id, "key=exclude&value=0&version=2&token="+token, f );
    },

    // 配信開始.
    startBroadcasting:function(){
	// getpublishstatus + configurestream
	if( !this.request_id || this.request_id=="lv0" ) return;
	this.getToken( this.request_id,
			       function(){
				   NicoLiveHelper.beginLive( NicoLiveHelper.token );
			       } );
    },

    /** 放送主専用トークン(token)、開演時刻(start_time)、終了時刻(end_time)を取得する.
     * postfuncが指定されていた場合、通信終了時に指定の関数を呼び出す.
     */
    getToken:function( request_id, postfunc ){
	if( !this.iscaster || !request_id || request_id=="lv0" ){
	    if( 'function'==typeof postfunc){
		postfunc();
	    }
	    return;
	}

	let f = function(xml, req){
	    if( req.readyState==4 && req.status==200 ){
		let publishstatus = req.responseXML;
		NicoLiveHelper.token = publishstatus.getElementsByTagName('token')[0].textContent;
		NicoLiveHelper.starttime = parseInt(publishstatus.getElementsByTagName('start_time')[0].textContent);
		let tmp = parseInt(publishstatus.getElementsByTagName('end_time')[0].textContent);
		if( GetCurrentTime() <= tmp ){
		    // 取得した終了時刻がより現在より未来指していたら更新.
		    NicoLiveHelper.endtime = tmp;
		}else{
		    NicoLiveComment.releaseReflector(); // ロスタイム突入なので全解放する.
		}
		NicoLiveHelper._exclude = parseInt(publishstatus.getElementsByTagName('exclude')[0].textContent);
		debugprint('token='+NicoLiveHelper.token);
		debugprint('starttime='+NicoLiveHelper.starttime);
		debugprint('endtime='+NicoLiveHelper.endtime);
		debugprint('exclude='+NicoLiveHelper._exclude);
		if( 'function'==typeof postfunc){
		    postfunc();
		}
		NicoLiveHelper.setLiveProgressBarTipText();
	    }
	};

	NicoApi.getpublishstatus( request_id, f );
    },

    /** 残りニコニコポイントを取得して、成功したら延長メニューを取得する.
     */
    getremainpoint:function(){
	if( this.isOffline() || !this.iscaster ) return;

	$('btn-update-extend-menu').disabled = true;
	let f = function(xml,req){
	    if( req.readyState==4 ){
		$('btn-update-extend-menu').disabled = false;
		if( req.status==200 ){
		    let remain = req.responseXML;
		    try{
			NicoLiveHelper.remainpoint = remain.getElementsByTagName("remain")[0].textContent;
			debugprint("remain point="+NicoLiveHelper.remainpoint);
			$('controlpanel-remain-point').value = "所持ニコニコポイント:"+NicoLiveHelper.remainpoint;
			NicoLiveHelper.getsalelist();
		    } catch (x) {
			NicoLiveHelper.remainpoint = 0;
		    }
		}
	    }
	};
	NicoApi.getremainpoint( f );
    },

    /** 延長メニューを更新.
     * 自分の所持ポイントを取得して延長メニューを取得.
     */
    updateExtendMenu:function(){
	this.getremainpoint();
    },

    /**
     * 自動無料延長の有無を指定する.
     */
    setAutoFreeExtend:function(flg){
	if( flg ){
	    $('controlpanel-auto-free-extend').setAttribute('checked',true);
	    $('auto-freeextend').setAttribute('checked',true);
	}else{
	    $('controlpanel-auto-free-extend').removeAttribute('checked');
	    $('auto-freeextend').removeAttribute('checked');
	}
	ShowNotice(flg?'自動無料延長を有効にしました':'自動無料延長を無効にしました');
    },

    // コントロールパネルの延長ボタンを押した.
    pressExtendButtonOfControlPanel:function(){
	let event = new Object();
	event.target = $('controlpanel-menu-live-extend-menulist').selectedItem;
	this.onLiveExtend(event);
    },

    // 延長メニューを選んだとき.
    onLiveExtend:function(event){
	let menu = event.target;
	let price = menu.getAttribute("nico-price");
	let num = menu.getAttribute("nico-num");
	let code = menu.getAttribute("nico-code");
	let item = menu.getAttribute("nico-item");
	let coupon = menu.getAttribute("nico-coupon_id");
	if( parseInt(this.remainpoint) < parseInt(price) ){
	    debugalert('延長するにはポイントが足りません。\n所持ポイント:'+this.remainpoint);
	    return;
	}
	let msg;
	msg = "延長処理を行いますか？ (所持ポイント:"+this.remainpoint+")\n\n"
	    + menu.label + "\n"
	    + "使用するポイント:" + price + "\n";
	if( ConfirmPrompt(msg,'延長処理') ){
	    debugprint('延長処理を行います');
	    this.liveExtend(num,code,item,coupon);
	}else{
	    debugprint("延長処理をキャンセルしました");
	}
    },

    // getsalelistの内容でメニューを更新.
    updateSaleListMenu:function(xml){
	let menu = $('menu-live-extend');
	let controlpanel_menu = $('controlpanel-menu-live-extend');
	let parentitems = evaluateXPath(xml,"/getsalelist/item[item!='freeextend_guide']");
	let labels = evaluateXPath(xml,"/getsalelist/item[item!='freeextend_guide']/label");
	let prices = evaluateXPath(xml,"/getsalelist/item[item!='freeextend_guide']/price");
	let nums = evaluateXPath(xml,"/getsalelist/item[item!='freeextend_guide']/num");
	let codes = evaluateXPath(xml,"/getsalelist/item[item!='freeextend_guide']/code");
	let items = evaluateXPath(xml,"/getsalelist/item[item!='freeextend_guide']/item");
	let coupon_id = evaluateXPath(xml,"/getsalelist/item[item!='freeextend_guide']/coupon_id");

	while(menu.childNodes[1]){
	    menu.removeChild(menu.childNodes[1]);
	}
	menu.childNodes[0].setAttribute('label','更新(所持ポイント:'+(this.remainpoint?this.remainpoint:'不明')+')');

	while(controlpanel_menu.childNodes[0]){
	    controlpanel_menu.removeChild(controlpanel_menu.childNodes[0]);
	}

	for(let i=0;i<labels.length;i++){
	    let menuitem = CreateMenuItem(labels[i].textContent,'');
	    menuitem.setAttribute("nico-price", prices[i].textContent);
	    menuitem.setAttribute("nico-num", nums[i].textContent);
	    menuitem.setAttribute("nico-code", codes[i].textContent);
	    menuitem.setAttribute("nico-item", items[i].textContent);
	    try{
		coupon_id = evaluateXPath(parentitems[i],"coupon_id");
		menuitem.setAttribute("nico-coupon_id", coupon_id[0].textContent);
		debugprint(i+":coupon_id="+coupon_id[0].textContent);
	    } catch (x) {
	    }
	    menuitem.setAttribute("oncommand","NicoLiveHelper.onLiveExtend(event);");
	    menu.appendChild(menuitem);

	    menuitem = menuitem.cloneNode(true);
	    menuitem.removeAttribute('oncommand');
	    controlpanel_menu.appendChild(menuitem);
	}
    },

    /** 延長アイテムを取得し、必要があれば無料延長を行います.
     * @param do_freeextend trueにすると無料延長を実行する.
     */
    getsalelist:function( do_freeextend ){
	if( !this.iscaster || this.isOffline() ) return;
	let f = function( xml, req ){
	    if( req.readyState==4 ){
		if( req.status==200 ){
		    //debugprint(req.responseText);
		    // price=0 で item=freeextend な item を得る.
		    let freeitem = evaluateXPath(req.responseXML,"/getsalelist/item[item='freeextend' and price=0]");
		    // 予約枠で無料延長特典があるなら、freeextendかつ0ポイントが 1個ある.
		    if( freeitem.length==1 ){
			debugprint("a free extendable item is found.");
			let num = freeitem[0].getElementsByTagName('num')[0].textContent;
			let code = freeitem[0].getElementsByTagName('code')[0].textContent;
			debugprint("num="+num);
			debugprint("code="+code);
			if( do_freeextend ){
			    NicoLiveHelper.freeExtend(num, code);
			}
		    }else{
			ShowNotice("無料延長メニューはありませんでした");
		    }
		    NicoLiveHelper.updateSaleListMenu(req.responseXML);
		}
	    }
	};
	NicoApi.getsalelist( this.request_id, f );
    },

    // 生放送を延長する.
    liveExtend:function(num, code, item, coupon){
	if( this.isOffline() || !this.iscaster ) return;

	$('btn-extend-live').disabled = true;
	let f = function(xml, req){
	    if( req.readyState==4 ){
		$('btn-extend-live').disabled = false;
		if( req.status==200 ){
		    let xml = req.responseXML;
		    try{
			if( xml.getElementsByTagName('usepoint')[0].getAttribute('status')=='ok' ){
			    NicoLiveHelper.endtime = parseInt(xml.getElementsByTagName('new_end_time')[0].textContent);
			    debugprint("New endtime="+NicoLiveHelper.endtime);
			    NicoLiveHelper._extendcnt = 0;
			    let str = NicoLivePreference.getBranch().getUnicharPref('notice.extend');
			    NicoLiveHelper.postCasterComment(str,"");
			    ShowNotice(str);
			}else{
			    ShowNotice("延長に失敗しました");
			}
			NicoLiveHelper.setLiveProgressBarTipText();
		    } catch (x) {
			debugprint(x);
			ShowNotice("延長に失敗しました");
		    }
		}else{
		    ShowNotice("延長に失敗しました(HTTPエラー)");
		}
	    }
	};

	let data = new Array();
	let now = GetCurrentTime();
	let remain = this.endtime - now;
	data.push("token="+this.token);
	data.push("remain="+remain);  // 残り秒数
	data.push("date="+now); // 現在日時
	data.push("num="+num); // セールスリストの番号.
	data.push("code="+code); // セールスリストのコード.
	data.push("item="+item); // 延長.
	data.push("v="+this.request_id);
	if( coupon ){
	    data.push("coupon_id="+coupon);
	}
	debugprint('extend:'+data.join(','));

	NicoApi.usepoint( data, f );
    },

    // 無料延長.
    // liveExtend関数で有料・無料延長一本化できるけど、
    // 今までの無料延長処理の安全のために残しておく.
    freeExtend:function(num, code){
	if( this.isOffline() || !this.iscaster ) return;

	let f = function(xml,req){
	    if( req.readyState==4 ){
		if( req.status==200 ){
		    try{
			if( xml.getElementsByTagName('usepoint')[0].getAttribute('status')=='ok' ){
			    NicoLiveHelper.endtime = parseInt(xml.getElementsByTagName('new_end_time')[0].textContent);
			    debugprint("New endtime="+NicoLiveHelper.endtime);
			    NicoLiveHelper._extendcnt = 0;
			    let str = NicoLivePreference.getBranch().getUnicharPref('notice.extend');
			    NicoLiveHelper.postCasterComment(str,"");
			    ShowNotice(str);
			}else{
			    ShowNotice("無料延長に失敗しました");
			}
			NicoLiveHelper.setLiveProgressBarTipText();
		    } catch (x) {
			debugprint(x);
			ShowNotice("無料延長に失敗しました");
		    }
		}else{
		    ShowNotice("無料延長に失敗しました(HTTPエラー)");
		}
	    }
	};

	let data = new Array();
	let now = GetCurrentTime();
	let remain = this.endtime - now;
	data.push("token="+this.token);
	data.push("remain="+remain);  // 残り秒数
	data.push("date="+now); // 現在日時
	data.push("num="+num); // セールスリストの番号.
	data.push("code="+code); // セールスリストのコード.
	data.push("item=freeextend"); // 無料延長.
	data.push("v="+this.request_id);
	debugprint('free-extend:'+data.join(','));
	NicoApi.usepoint( data, f );
    },

    // スタートアップコメントを送信開始する.
    sendStartupComment:function(){
	if( !this.iscaster ) return;
	if( GetCurrentTime()-this.starttime > 180 ) return;
	if( this.inplay ) return; // 何か再生中はスタートアップコメントを行わない.

	this.startup_comments = NicoLivePreference.startup_comment.split(/\n|\r|\r\n/);
	if(this.startup_comments.length){
	    this._startupcomment = setInterval( function(){
						    NicoLiveHelper._sendStartupComment();
						}, 5000);
	}
    },
    _sendStartupComment:function(){
	if( this.startup_comments.length ){
	    let str = this.startup_comments.shift();
	    debugprint('startupcomment:'+str);
	    this.postCasterComment(str,"");
	}else{
	    clearInterval(this._startupcomment);
	}
    },

    // ジングルを再生する.
    playJingle:function(){
	// コメントサーバ接続時、
	// 放送開始から3分未満、
	// 何も再生していないときに、ジングルを再生開始する.
	let jingle = NicoLivePreference.jinglemovie;
	if( !jingle ){ debugprint('ジングル動画が指定されていないので再生しない'); return; }

	// sm0 sm1/co154 sm3/co154 sm2/co13879
	let jingles = jingle.split(/\s+/);
	let candidates = new Array();
	let all = new Array();
	for(let i=0,s;s=jingles[i];i++){
	    let tmp;
	    tmp = s.split(/\//);
	    if(tmp.length==2){
		if(tmp[1]==this.community){
		    candidates.push(tmp[0]);
		}
	    }else if(tmp.length==1){
		all.push(tmp[0]);
	    }
	}
	if(candidates.length<=0){
	    let n = GetRandomInt(0,all.length-1);
	    jingle = all[n];
	}else{
	    let n = GetRandomInt(0,candidates.length-1);
	    jingle = candidates[n];
	}
	debugprint('jingle:'+jingle);

	if( !this.iscaster ) return;

	if(!jingle){
	    if( $('automatic-broadcasting').hasAttribute('checked') ){
		// Automatic Broadcastingのときはジングルなしに次曲を再生開始可に.
		if( !this.inplay ) NicoLiveHelper.setupPlayNextMusic(20*1000);
	    }
	    return;
	}

	if( GetCurrentTime()-this.starttime < 180 ){
	    if( !this.inplay ){ // 何も動画が再生されてなければジングル再生.
		this.inplay = true;
		debugprint("play jingle.");
		let timerid = setInterval(
		    function(){
			if( !NicoLiveHelper.musicinfo.video_id ){
			    if( $('automatic-broadcasting').hasAttribute('checked') ){
				// Automatic Broadcastingのときはジングル再生に失敗しても
				// 継続できるように.
				NicoLiveHelper.setupPlayNextMusic(60*1000);
			    }
			    NicoLiveHelper.postCasterComment(jingle,"");
			}
			clearInterval(timerid);
		    }, 5000);
	    }
	}else{
	    if( !this.inplay ){
		// 最近は枠取れたあとにしばらく入場できない場合があるため、
		// 3分経過後に入場となったときにジングル再生が行なわれない.
		// その場合にはジングル流さずに次を再生するようにして
		// 自動配信を継続できるようにする.
		if( $('automatic-broadcasting').hasAttribute('checked') ){
		    NicoLiveHelper.setupPlayNextMusic(10*1000);
		}
	    }
	}
    },

    // 接続を開始する.
    start: function(request_id){
	this.request_id = request_id.toString();
	debugprint("starting nicolive " + request_id);

	this.connectLive(request_id);
    },

    setUndo:function( undo_func ){
	this.undo_stack[0] = undo_func;
    },
    undo:function(){
	let f = this.undo_stack[0];
	if( 'function'==typeof f ){
	    f();
	}
	this.undo_stack[0] = undefined;
    },

    loadRequestSet:function(n){
	this.requestqueue = NicoLiveDatabase.loadGPStorage("nico_request_set_"+n,[]);
	NicoLiveRequest.update(this.requestqueue);
	this.request_setno = n;
    },
    loadStockSet:function(n){
	this.stock = NicoLiveDatabase.loadGPStorage("nico_stock_set_"+n,[]);
	NicoLiveRequest.updateStockView(this.stock);
	this.stock_setno = n;
    },

    saveAll:function(){
	this.saveRequest();
	this.saveStock();
	this.savePlaylist();
    },
    saveStock:function(){
	Application.storage.set("nico_live_stock"+this.stock_setno,this.stock);
    },
    saveRequest:function(){
	// 視聴者ではリクエストは保存しない.
	if(!this.iscaster && !this.isOffline()) return;
	Application.storage.set("nico_live_requestlist"+this.request_setno,this.requestqueue);
	NicoLiveDatabase.saveGPStorage("nico_live_requestlist"+this.request_setno,this.requestqueue);
    },
    savePlaylist:function(){
	// 視聴者ではプレイリストは保存しない.
	if(!this.iscaster && !this.isOffline()) return;
	Application.storage.set("nico_live_playlist",this.playlist);
	Application.storage.set("nico_live_playlist_txt",$('played-list-textbox').value);
    },
    saveToStorage:function(){
	Application.storage.set("nico_live_stock"+this.stock_setno,this.stock);
	NicoLiveDatabase.saveGPStorage("nico_live_stock"+this.stock_setno,this.stock);
	// 視聴者ではリクエスト、プレイリストは保存しない.
	if(!this.iscaster && !this.isOffline()) return;
	Application.storage.set("nico_live_requestlist"+this.request_setno,this.requestqueue);
	NicoLiveDatabase.saveGPStorage("nico_live_requestlist"+this.request_setno,this.requestqueue);

	Application.storage.set("nico_live_playlist",this.playlist);
	Application.storage.set("nico_live_playlist_txt",$('played-list-textbox').value);
	NicoLiveDatabase.saveGPStorage("nico_live_playlist",this.playlist);
	NicoLiveDatabase.saveGPStorage("nico_live_playlist_txt",$('played-list-textbox').value);
    },

    // リクエストカウントのリセット.
    resetRequestCount:function(){
	this.request_per_ppl = new Object();
	this.play_per_ppl = new Object();
    },

    // ユーザー定義値を取得する.
    retrieveUserDefinedValue:function(){
	let req = new XMLHttpRequest();
	if( !req ) return;
	let url = NicoLivePreference.readUserDefinedValueURI();
	if( !url ) return;
	if( !url.match(/^file:/) ){
	    req.onreadystatechange = function(){
		if( req.readyState==4 && req.status==200 ){
		    let txt = req.responseText;
		    // JSON.parseの方がいいのだけどミクノ度jsonファイルに余計なデータが付いているので.
		    NicoLiveHelper.userdefinedvalue = eval('('+txt+')');
		}
	    };
	    req.open('GET', url );
	    debugprint("Retrieving User-Defined Value from URI:"+url);
	}else{
	    req.open('GET', url, false );
	    debugprint("Retrieving User-Defined Value from FILE:"+url);
	}
	req.send("");
	if( url.match(/^file:/) ){
	    if(req.status == 0){
		NicoLiveHelper.userdefinedvalue = eval('('+req.responseText+')');
	    }
	}
    },

    loadRequestAndHistory:function(){
	// load requests
	this.requestqueue = JSON.parse(JSON.stringify(NicoLiveDatabase.loadGPStorage("nico_live_requestlist"+this.request_setno,[])));
	// load playlist
	this.playlist = JSON.parse(JSON.stringify(NicoLiveDatabase.loadGPStorage("nico_live_playlist",[])));
	for(let i=0,item;item=this.playlist[i];i++){
	    this.playlist["_"+item.video_id] = this.playlist[i].playedtime;
	    NicoLiveHistory.addPlayList( item );
	}
	$('played-list-textbox').value = NicoLiveDatabase.loadGPStorage("nico_live_playlist_txt","");
    },

    // オフラインかどうか.
    isOffline:function(){
	return this.request_id=="lv0";
    },

    // 再接続.
    reconnect:function(){
	if( this.isOffline() ) return;
	if( ConfirmPrompt('再接続を行いますか?','再接続') ){
	    this.connectNewBroadcasting(this.request_id, this.title, this.iscaster, this.community);
	}
    },

    // シングルウィンドウモードで別の番組に接続する用.
    connectNewBroadcasting:function(request_id,title,iscaster,community_id){
	$('debug-textbox').value = "";
	debugprint("Connect To New Broadcasting("+request_id+").");
	NicoLiveComment.releaseReflector();
	NicoLiveComment.initView();
	if(request_id && request_id!="lv0"){
	    // online
	    title = title.replace(/\u200b/g,"");
	    // これだけ初期化しておけば大丈夫かな.
	    this.ticket = "";
	    this.title = title;
	    this.request_id = request_id;
	    this.community = community_id;
	    this.postkey = "";
	    this.last_res = 0;
	    this.inplay = false;
	    this._firstflag = false;
	    this.musicinfo = {};
	    this.isnotified = new Array(); // 残り3分通知を出したかどうかのフラグ.
	    this.previouschat = "";
	    this.commentstate = COMMENT_STATE_NONE;
	    this.commentview = COMMENT_VIEW_NORMAL;
	    this.resetRequestCount(); // 1人あたりのリクエスト受け付け数ワーク.
	    this.start(request_id);
	}else{
	    // offline
	    document.title  = "NicoLive Helper (Single Window)";
	    this.close();

	    let playprogress = $('statusbar-music-progressmeter');
	    let musictime = $('statusbar-music-name');
	    playprogress.value = 0;
	    musictime.label = "";

	    this.request_id = "lv0";
	}
	try{
	    AutoCreateLive.win = null;
	} catch (x) {
	}
    },

    // http:/ext.nicovideo.jp/thumb_user/... から登録(こちら優先)
    getUserName:function(user_id){
	if( UserNameCache[user_id]!=undefined ){ // すでに設定済み.
	    return;
	}

	let req = new XMLHttpRequest();
	if( !req ) return;
	req.onreadystatechange = function(){
	    if( req.readyState==4 ){
		if( req.status==200 ){
		    try{
			let text = req.responseText;
			let name = text.match(/><strong>(.*)<\/strong>/)[1];
			if( name ){
			    UserNameCache[user_id] = name;
			}
		    } catch (x) {
			UserNameCache[user_id] = undefined;
		    }
		}else{
		    UserNameCache[user_id] = undefined;
		}
	    }
	};
	req.open('GET', 'http://ext.nicovideo.jp/thumb_user/'+user_id );
	req.send("");
	UserNameCache[user_id] = "";
    },

    // 動画時間を定義したファイルを読み込む.
    loadVideoLength:function(){
	this._videolength = new Object();

	let extpath = GetExtensionPath();
	debugprint("Extension Path="+extpath.path);
	extpath = extpath.parent;
	extpath.append("nlh_videolength.csv");
	debugprint("VideoLength CSV="+extpath.path);

	try{
	    let istream = Components.classes["@mozilla.org/network/file-input-stream;1"]
		.createInstance(Components.interfaces.nsIFileInputStream);
	    istream.init(extpath, 0x01, 0444, 0);
	    istream.QueryInterface(Components.interfaces.nsILineInputStream);

	    // 行を配列に読み込む
	    let line = {}, hasmore;
	    let str = "";
	    do {
		hasmore = istream.readLine(line);
		str = line.value;
		let vlen = str.split(",");
		this._videolength["_"+vlen[0]] = vlen[1];
	    } while(hasmore);
	    istream.close();
	} catch (x) {
	    debugprint("動画再生時間定義ファイルはありませんでした");
	    this._videolength = new Object();
	}
    },

    nextBroadcasting:function(manually){
	let id = this.request_id.match(/lv(\d+)/)[1];
	let tab;
	let url;
	if( id==0 || !this.iscaster ){
	    url = 'http://live.nicovideo.jp/editstream';
	    NicoLiveWindow.openDefaultBrowser(url, true);
	}else{
	    url = 'http://live.nicovideo.jp/editstream?reuseid='+id;
	    if( manually ){
		NicoLiveWindow.openDefaultBrowser(url, true);
	    }else{
		AutoCreateLive.create( url );
	    }
	}
    },

    /**
     * 自動で次枠を取得する.
     */
    autoNextBroadcasting:function(){
	if( !this.iscaster ) return;
	this.nextBroadcasting();
    },

    /**
     * どのブラウザのクッキーを共有しているか.
     */
    whichBrowser:function(){
	let r = 0;
	if( $('use-standard-mode-ie').hasAttribute('checked') ){
	    r = 3;
	}	
	if( $('use-protected-mode-ie').hasAttribute('checked') ){
	    r = 2;
	}
	if( $('use-google-chrome').hasAttribute('checked') ){
	    r = 1;
	}
	return r;
    },
    addBrowserNameToWindowTitle:function(){
	switch( this.whichBrowser() ){
	case 1:
	    document.title += "[Google Chrome]";
	    break;
	case 2:
	    document.title += "[IE Protected]";
	    break;
	case 3:
	    document.title += "[IE Standard]";
	    break;
	default:
	    break;
	}
    },

    /**
     * ハートビートをキャンセルする.
     * Experimental Function.
     */
    setCancelHeartbeat:function(){
	let b = $('cancel-heartbeat').hasAttribute('checked');
	NicoLiveHttpObserver._testCancelHeartbeat( b );
    },

    setLossTime:function(show_msg){
	let b = $('get-extratime').hasAttribute('checked');
	if( show_msg ) ShowNotice(b?'ロスタイムを有効にしました':'ロスタイムを無効にしました');	
	NicoLiveHttpObserver.setLossTime( b );
    },

    setupCookie:function(){
	this._use_other_browser = false;
	if( !NicoLiveCookie.getCookie("http://www.nicovideo.jp/") ){
	    // getCookieで取れなければサードパーティクッキーの保存にチェックが入ってないので.
	    this._user_session = NicoLiveCookie.getCookie2("http://www.nicovideo.jp/","user_session");
	}
	if( $('use-standard-mode-ie').hasAttribute('checked') ){
	    //this._user_session = NicoLiveCookie.getStandardIECookie("http://www.nicovideo.jp/","user_session");
	    this._user_session = NicoLiveCookie.getStdIECookie("http://www.nicovideo.jp/","user_session");
	    debugprint("use Standard mode IE");
	    this._use_other_browser = true;
	}
	if( $('use-protected-mode-ie').hasAttribute('checked') ){
	    //this._user_session = NicoLiveCookie.getProtectedIECookie("http://www.nicovideo.jp/","user_session");
	    this._user_session = NicoLiveCookie.getIECookie("http://www.nicovideo.jp/","user_session");
	    debugprint("use Protected mode IE");
	    this._use_other_browser = true;
	}
	if( $('use-google-chrome').hasAttribute('checked') ){
	    this._user_session = NicoLiveCookie.getChromeCookie();
	    debugprint("use Google Chrome");
	    this._use_other_browser = true;
	}
	if( $('use-mac-safari').hasAttribute('checked') ){
	    this._user_session = NicoLiveCookie.getMacSafariCookie();
	    debugprint("use Mac Safari");
	    this._use_other_browser = true;
	}
	if( this._user_session ){
	    debugprint("user_session="+this._user_session);
	}
	if( !RUN_ON_FIREFOX && this._use_other_browser ){
	    NicoLiveCookie.setCookie( this._user_session );
	}
    },

    init: function(){
	debugprint('Initializing NicoLive Helper...');
	this.setupCookie();
	this._useragent = 'NicoLiveHelper/'+GetAddonVersion();
	debugprint(this._useragent);
	document.title = "NicoLive Helper " + GetAddonVersion();
	srand( GetCurrentTime() );

	this._playlog = new Object();

	// リクエストのコメ番順シーケンシャル処理用.
	this.requestprocessingqueue = new Array();
	this.musicinfo.length_ms = 0;

	let request_id, title, iscaster, community_id;
	try{
	    // XULRunnerではここからコマンドライン引数を取る
	    // window.arguments[0].getArgument(0);
	    if( RUN_ON_FIREFOX ){
		request_id = window.arguments[0];
		title      = window.arguments[1];
		iscaster   = window.arguments[2];
		community_id = window.arguments[3];
		if( request_id==null || title==null || iscaster==null ){
		    request_id = "lv0";
		    title = "";
		    iscaster = true;
		}
	    }else{
		request_id = window.arguments[0].getArgument(0) || "lv0";
		title      = "";
		iscaster   = true;
		community_id = "";
	    }
	} catch (x) {
	    debugprint(x);
	    debugprint("no window.arguments.");
	    request_id = Application.storage.get("nico_request_id","lv0");
	    title      = Application.storage.get("nico_live_title","");
	    iscaster   = Application.storage.get("nico_live_caster",true);
	    community_id = Application.storage.get("nico_live_coid","co154");
	}
	debugprint("Caster:"+iscaster);
	debugprint("Community:"+community_id);

	debugprint(request_id);
	this.requestqueue = new Array();
	this.playlist     = new Array();
	this.stock        = new Array();
	this.error_req    = new Object(); // 配列にしない
	this.isnotified   = new Array(); // 残り3分通知を出したかどうかのフラグ.
	this.resetRequestCount(); // 1人あたりのリクエスト受け付け数ワーク.

	this.allowrequest = NicoLivePreference.allowrequest;
	this.setPlayStyle(NicoLivePreference.playstyle);

	this.request_setno = $('request-set-no').value;
	this.stock_setno = $('stock-set-no').value;
	// load stock
	this.stock        = NicoLiveDatabase.loadGPStorage("nico_live_stock"+this.stock_setno,[]);

	if(request_id && request_id!="lv0"){
	    // online
	    title = title.replace(/\u200b/g,"");
	    this.title = title;

	    if( iscaster || NicoLivePreference.isSingleWindowMode() ){
		this.loadRequestAndHistory();
	    }
	    this.start(request_id);
	    this.community = community_id;
	}else{
	    // offline
	    if( NicoLivePreference.isSingleWindowMode() ){
		document.title += " (Single Window)";
	    }
	    this.addBrowserNameToWindowTitle();
	    this.request_id = "lv0";
	    this.loadRequestAndHistory();
	}

	this.updateRemainRequestsAndStocks();

	if( !this.isOffline() && iscaster ){
	    this.retrieveUserDefinedValue();
	}

	this.updatePNameWhitelist();
	this.loadVideoLength();

	this.setLossTime();
	this.setCancelHeartbeat();  // experimental function

	//OpenSimpleCommentWindow();
    },
    destroy: function(){
	debugprint("Destroy NicoLive Helper");
	this._donotshowdisconnectalert = true;
	this.saveToStorage();
	this.close();
	if( this._register_http_observer ){
	    NicoLiveHttpObserver.destroy();
	}
    },

    test: function(){
	if(this.__counter==undefined) this.__counter=1;
	for(let i=0;i<100;i++){
	    let chat = JSON.parse('{"text":"sm1340413","date":1274459609,"premium":0,"user_id":"wfhjAiAXQZfx2iWGrdvLLzihNAc","no":'+this.__counter+',"anonymity":1,"mail":"184","name":null,"comment_no":'+this.__counter+'}');
	    NicoLiveComment.push(chat);
	    NicoLiveComment.addRow(chat);
	    this.__counter++;
	}
    }
};

window.addEventListener("load", function(e){ NicoLiveHelper.init(); }, false);
window.addEventListener("unload", function(e){ NicoLiveHelper.destroy(); }, false);
