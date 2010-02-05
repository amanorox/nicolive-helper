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
 * ニコニコ生放送ヘルパー for Firefox 3.5
 */

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
    endtime: 0,            // 放送の終わる時刻(UNIX time) by getpublishstatus.
    musicstarttime: 0,     // 曲の再生開始時刻(UNIX time) /playを受け取った時刻.
    musicendtime: 0,       // 曲の終了予定時刻(UNIX time) 上記+再生時間.

    iscaster: false,       // 主フラグ.
    inplay: false,         // 再生中フラグ.
    allowrequest: true,    // リクを受け付けるフラグ.
    isautoplay: false,     // 自動再生フラグ.
    israndomplay: false,   // ランダム再生フラグ.
    isconsumptionrateplay: false, // リク消費率順再生フラグ.
    anchor: {},            // アンカー処理用.
    userdefinedvalue: {},  // {json}用.

    commentstate: COMMENT_STATE_NONE, // コメントの状態遷移用.
    commentview: COMMENT_VIEW_NORMAL, // 上コメ表示状態.

    // リクを受け付けるかどうかチェック.
    checkAcceptRequest: function(xml, comment_no){
	if(xml.getElementsByTagName('error').length){
	    // 動画がない.
	    return {code:-1,msg:NicoLivePreference.msg.deleted,movieinfo:{}};
	}
	let info = this.xmlToMovieInfo(xml);
	if( !info ){
	    return {code:-1,msg:"",movieinfo:{}};
	}

	// リクを受け付けていない.
	if( !this.allowrequest ){
	    // アンカーチェックはここでやる.
	    if( this.anchor.start && this.anchor.end &&
		this.anchor.start <= comment_no && comment_no <= this.anchor.end ){
		    // アンカー範囲内なので無問題.
	    }else{
		return {code:-2,msg:NicoLivePreference.msg.notaccept,movieinfo:info};
	    }
	}

	if(NicoLivePreference.limitnewmovie){
	    // 7日内に投稿された動画.
	    if( GetCurrentTime()-info.first_retrieve < this.secofweek )
		return {code:-3,msg:NicoLivePreference.msg.newmovie,movieinfo:info};
	}

	// 再生済み.
	if(this.isPlayedMusic(info.video_id))
	    return {code:-4,msg:NicoLivePreference.msg.played,movieinfo:info};

	// リクエストキューに既にある動画.
	if(this.isRequestedMusic(info.video_id))
	    return {code:-5,msg:NicoLivePreference.msg.requested,movieinfo:info};

	// リクエスト制限のチェック.
	if(NicoLivePreference.restrict.dorestrict){
	    let msg = this.checkMovieRestriction(info);
	    if( msg!=null ){
		return {code:-6,"msg":msg,movieinfo:info};
	    }
	}

	if(NicoLivePreference.mikuonly){
	    let ismiku = false;

	    let str = new Array();
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

	    // そうでないときはタグを使用して分類.
	    if( info.classify['class']=='Miku' ){
		ismiku = true;
	    }else{		
		// タイトルに「ミク」「オリジナル」が含まれていればまずはOK.
		if( info.title.indexOf('ミク')!=-1 &&
		    info.title.indexOf('オリジナル')!=-1 ){
			ismiku = true;
		    }
	    }

	    if( 0 && !ismiku ){
		debugprint(info.video_id+":ミクオリジナル曲ではなさそうだ");
		switch( info.classify['class'] ){
		case 'RinLen':
		    str = "リン・レンうたのようですが"; break;
		case 'Luka':
		    str = "ルカうたのようですが"; break;
		case 'Other':
		    str = "ミクうたではなさそうですが"; break;
		case 'NG':
		    str ="主NGのようですが"; break;
		case 'undefined':
		default:
		    str = "ミクうたと判定できませんでしたが"; break;
		}
		str += "主判断をお待ちください";
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
	    let flg = false;
	    for(let i=0,tag;tag=restrict.tag_include[i];i++){
		if( tagstr.indexOf(tag) != -1 ){
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
	    let flg = true;
	    let tag;
	    for(let i=0;tag=restrict.tag_exclude[i];i++){
		if( tagstr.indexOf(tag) != -1 ){
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
	return null;
    },

    // コメを処理する.
    processComment: function(xmlchat){
	let chat=this.extractComment(xmlchat);

	// /telopで始まる行はニコニコ実況のものなので処理しなくてok.
	if(chat.text.indexOf("/telop")==0) return;

	NicoLiveComment.push(chat);
	NicoLiveComment.addRow(chat);

	if(chat.date<this.connecttime){ return; } // 過去ログ無視.

	if((chat.premium==3||chat.user_id=="0") && chat.text=="/disconnect"){
	    // ロスタイムのときはuser_id=="0"から/disconnectがやってくる.
	    this.close();

	    let prefs = NicoLivePreference.getBranch();
	    if( prefs.getBoolPref("autowindowclose") && this.iscaster ||
	        prefs.getBoolPref("autowindowclose-listener") && !this.iscaster ){
		window.close();
	    }else{
		debugalert(this.request_id+' finished.');
	    }
	}

	switch(chat.premium){
	case 3:
	    // 主コメの処理.
	    let dat;
	    // /play smile:sm00000 main "title"
	    dat = chat.text.match(/^\/play(sound)*\s*smile:((sm|nm|ze)\d+)\s*(main|sub)\s*\"(.*)\"$/);
	    if(dat){
		let vid = dat[2];
		this.musicstarttime = GetCurrentTime();
		this.inplay = true;
		if(!this.iscaster){
		    // リスナーの場合は動画情報を持っていないので取ってくる.
		    this.setCurrentVideoInfo(vid,false);
		}else{
		    if( this.musicinfo.video_id!=vid ){
			// 直接運営コマンドを入力したときとかで、
			// 現在再生しているはずの曲と異なる場合.
			// 動画情報の主コメは動画情報を取ってきてから.
			this.setCurrentVideoInfo(vid,true);
		    }else{
			this.musicendtime = Math.floor(this.musicstarttime + this.musicinfo.length_ms/1000)+1;
			this.setupPlayNextMusic(this.musicinfo.length_ms);
			this.sendMusicInfo();
			// /playコマンドが飲まれたときに記録が残らないので.
			// playMusic()で記録するようにに戻す.
			//this.addPlayList(this.musicinfo);
		    }
		}
		return;
	    }

	    if(!this.iscaster) break;

	    // アンケート開始.
	    dat = chat.text.match(/^\/vote\s+start\s+(.*)/);
	    if(dat){
		let str = dat[1];
		let qa = CSVToArray(str,"\s+");
		qa[0] = "Q/"+qa[0];
		for(let i=1,s;s=qa[i];i++){
		    qa[i] = "A"+i+"/" + s;
		}
		this.postCasterComment(qa.join(","),"");
		this.officialvote = qa;
		return;
	    }

	    // アンケート結果表示.
	    dat = chat.text.match(/^\/vote\s+showresult\s+(.*)/);
	    if(dat){
		let str = dat[1];
		let result = str.match(/\d+/g);
		str = "";
		for(let i=1,a;a=this.officialvote[i];i++){
		    str += this.officialvote[i] + "(" + (result[i-1]/10).toFixed(1) + "%) ";
		}
		this.postCasterComment(str,"");
		return;
	    }

	    if( chat.text.indexOf("/perm")==0 && chat.mail.indexOf("hidden")!=-1 ){
		this.commentview = COMMENT_VIEW_HIDDEN_PERM;
		debugprint("switch to VIEW_HIDDEN_PERM");
		clearInterval(NicoLiveHelper._commentstatetimer);
		return;
	    }
	    if( chat.mail.indexOf("hidden")!=-1 ){
		// hiddenだけの場合は、15秒間だけHIDDEN_PERM.
		this.commentview = COMMENT_VIEW_HIDDEN_PERM;
		debugprint("switch to VIEW_HIDDEN_PERM");
		clearInterval(NicoLiveHelper._commentstatetimer);
		NicoLiveHelper._commentstatetimer = setInterval(
		    function(){
			NicoLiveHelper.commentview = COMMENT_VIEW_NORMAL;
			debugprint("switch to VIEW_NORMAL");
			clearInterval(NicoLiveHelper._commentstatetimer);
		    }, 15*1000 );
	    }

	    if( chat.text.indexOf("/cls")==0 || chat.text.indexOf("/clear")==0 ){
		clearInterval(this._sendclsid);

		this.commentview = COMMENT_VIEW_NORMAL;
		debugprint("switch to VIEW_NORMAL");
		if( 'function'==typeof this.postclsfunc ){
		    this.postclsfunc();
		    this.postclsfunc = null;
		}
		return;
	    }
	    break;

	default:
	    // リスナーコメの処理.
	    if( chat.text.indexOf("/")!=0 ){
		let sm = chat.text.match(/((sm|nm)\d+)/);
		if(sm){
		    let selfreq = chat.text.match(/自(貼|張)/);
		    this.addRequest(sm[1], chat.no, selfreq?"0":chat.user_id);
		    return;
		}
	    }

	    if(!this.iscaster) break;
	    switch(chat.text){
	    case "/ver":
	    case "/version":
		this.postCasterComment("NicoLive Helper "+GetAddonVersion(),"");
		break;
	    default:
		this.processListenersCommand(chat);
		break;
	    }
	    break;
	}
    },

    processListenersCommand:function(chat){
	if( !NicoLivePreference.listenercommand.enable ) return;

	let command = chat.text.match(/\/(\w+)\s*(.*)/);
	if(command){
	    let tmp,n,str;
	    switch(command[1]){
	    case 's':
		str = this.replaceMacros(NicoLivePreference.listenercommand.s,chat);
		if(str) this.postCasterComment(str,"");
		break;

	    case 'dice':
		// 2d+3 とか 4D+2 とか.
		tmp = command[2].match(/(\d+)[Dd](\+(\d+))*/);
		if(tmp){
		    n = parseInt(tmp[1]);
		    if(!tmp[3]) tmp[3] = "0";
		    let result = 0;
		    let resultstr = new Array();
		    for(let i=0;i<n;i++){
			let dice = GetRandomInt(1,6);
			resultstr.push(dice);
			result += dice;
		    }
		    resultstr = resultstr.join(",");
		    result += parseInt(tmp[3]);
		    resultstr += " + "+tmp[3] +" = " + result;
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
	chat.mail      = xmlchat.getAttribute('mail');

	chat.date      = chat.date && parseInt(chat.date) || 0;
	chat.premium   = chat.premium && parseInt(chat.premium) || 0;
	chat.user_id   = chat.user_id || "0";
	chat.anonymity = chat.anonymity && parseInt(chat.anonymity) || 0;
	chat.no        = chat.no && parseInt(chat.no) || 0;
	chat.comment_no = chat.no;

	this.last_res = chat.no;
	return chat;
    },

    // 現在再生しているvideo_idの情報をmusicinfoにセット(プログレスバーのため)
    // this.musicstarttimeはあらかじめセットしておくこと.
    setCurrentVideoInfo:function(video_id,setinterval){
	// setinterval=trueのときは次曲再生のタイマーをしかける.
	let req = new XMLHttpRequest();
	if( !req ) return;
	req.onreadystatechange = function(){
	    if( req.readyState==4 && req.status==200 ){
		let music = NicoLiveHelper.xmlToMovieInfo(req.responseXML);
		if( music ){
		    NicoLiveHelper.musicinfo = music;
		    let du = Math.floor(NicoLiveHelper.musicinfo.length_ms/1000)+1;
		    NicoLiveHelper.musicendtime   = NicoLiveHelper.musicstarttime+du;

		    if(setinterval){
			// 手動で/playコマンドを入力したときにここに来る.
			NicoLiveHelper.setupPlayNextMusic(music.length_ms);
			if( !NicoLivePreference.nocomment_for_directplay ){
			    NicoLiveHelper.sendMusicInfo();
			}
			NicoLiveHelper.inplay = true;
		    }
		    NicoLiveHelper.addPlayList(music);
		}
	    }
	};
	let url = "http://www.nicovideo.jp/api/getthumbinfo/"+video_id;
	req.open('GET', url );
	req.send("");
    },

    // 与えられたstrがP名かどうか.
    isPName:function(str){
	if( pname_whitelist["_"+str] ){
	    return true;
	}
	if(str.match(/(PSP|アイドルマスターSP|m[a@]shup|step|overlap|vocaloid_map|mikunopop|mikupop|space_ship)$/i)) return false;
	if(str.match(/(M[A@]D|MMD|HD|3D|vocaloud|world|頭文字D|イニシャルD|(吸血鬼|バンパイア)ハンターD|L4D|TOD|oid|clannad|2nd|3rd|second|third)$/i)) return false;
	let t = str.match(/.*([^jOＯ][pｐPＰ]|jP)[)）]?$/);
	if(t){
	    return true;
	}
	// D名
	t = str.match(/.*[^E][DＤ]$/);
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
	    // まずはP名候補をリストアップ.
	    for(i=0;tag=item.tags[i];i++){
		if( this.isPName(tag) ){
		    pname.push(tag);
		}
	    }
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
		tmp = info.tags.join(',');
		tmp = tmp.replace(/(.{35,}?),/g,"$1<br>　");
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
    _sendMusicInfo:function(){
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

	sendstr = NicoLivePreference.videoinfo[this._counter].comment;
	if(!sendstr){
	    clearInterval(this._sendmusicid);
	    this._counter = -1;
	    this.commentstate = COMMENT_STATE_MOVIEINFO_DONE;
	}
    },

    // 動画情報を送信開始する.
    sendMusicInfo:function(){
	let func = function(){
	    clearInterval(NicoLiveHelper._sendmusicid);
	    clearInterval(NicoLiveHelper._revertcommentid); // 古い動画情報復帰は消しておこう.
	    NicoLiveHelper._counter = 0;
	    NicoLiveHelper._sendmusicid = setInterval( function(){ NicoLiveHelper._sendMusicInfo(); }, 6000);
	    NicoLiveHelper._sendMusicInfo();
	};
	this.clearCasterCommentAndRun(func);
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

    // 指定リク番号の曲を再生する(idxは1〜).
    playMusic:function(idx){
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
	let str = "/play " + this.musicinfo.video_id;
	if($('do-subdisplay').checked){
	    debugprint(this.musicinfo.video_id+"をサブ画面で再生します");
	    str += " sub";
	}
	// /playコマンドに限らず、運営コメを投げてstatus=okになっても
	// コメが飲み込まれてサーバからやってこないことがある.
	// その対策のために、一旦ここで次曲再生のタイマをしかけておく.
	// /playの場合、正しくサーバからやってくれば改めてタイマを再セットする.
	this.setupPlayNextMusic(this.musicinfo.length_ms);

	this.postCasterComment(str,""); // 再生.

	// /playコマンドが飲み込まれたときに
	// 再生履歴から再生できるように記録.
	this.addPlayList(this.musicinfo);

	NicoLiveRequest.update(this.requestqueue);

	// 再生数をカウントアップ.
	if(!music.user_id) music.user_id = "1";
	if(!this.play_per_ppl[music.user_id]){
	    this.play_per_ppl[music.user_id] = 0;
	}
	this.play_per_ppl[music.user_id]++;

	// 再生されたストック曲はグレーにする.
	let i,item;
	for(i=0;item=this.stock[i];i++){
	    if(this.isPlayedMusic(item.video_id)){
		item.isplayed = true;
		item.error = false;
	    }
	}
	//NicoLiveRequest.updateStockView(this.stock);
	NicoLiveRequest.updateStockViewForPlayedVideo(this.stock);
	NicoLiveRequest.setTotalStockTime(NicoLiveHelper.getTotalStockTime());

	this.updateRemainRequestsAndStocks();
	this.saveAll();
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

    // ストックから再生する(idx=1,2,3,...).
    playStock:function(idx,force){
	// 再生済みのときだけfalseを返す.
	// force=trueは再生済みを無視して強制再生.
	if(this.isOffline() || !this.iscaster) return true;
	if(idx>this.stock.length) return true;

	let playmusic = this.stock[idx-1];
	if(!playmusic) return true;
	if(!force && this.isPlayedMusic(playmusic.video_id)){
	    return false;
	}
	playmusic.isplayed = true;
	// ストックをリクエストキューの先頭に突っこんで再生.
	this.requestqueue.unshift(playmusic);
	this.playMusic(1);
	return true;
    },
    // ストックから削除する.
    removeStock:function(idx){
	idx--;
	this.stock.splice(idx,1);
	//NicoLiveRequest.updateStockView(this.stock);
	NicoLiveRequest.deleteStockRow(idx);
	this.saveStock();
	this.updateRemainRequestsAndStocks();
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

    /*
     * 次に再生する動画をmusiclistから探し、1,2,3,...のインデックスを返す.
     */
    chooseNextMusicToPlay:function(musiclist,isstock){
	let now = GetCurrentTime();
	let remain; // sec.
	if( this.endtime ){
	    remain = this.endtime-now;
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
	    if( !isstock || (isstock && !this.isPlayedMusic(item.video_id)) ){
		notplayed.push(item);
	    }
	}
	if(notplayed.length<=0) return false; // 再生できるものなし.

	let n = 0;
	if(this.israndomplay){
	    n = GetRandomInt(0,notplayed.length-1);
	}
	if(this.isconsumptionrateplay){
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

    // ストック内の再生されていない動画のうちどの動画を再生するか選択して再生する.
    chooseMusicFromStockAndPlay:function(){
	let n = this.chooseNextMusicToPlay( this.stock, true );
	if( n ){
	    this.playStock( n, true);
	    return true;
	}
	return false;
    },

    // リクエストから再生できる動画をピックアップして再生.
    chooseMusicFromRequestAndPlay:function(){
	let n = this.chooseNextMusicToPlay( this.requestqueue,false );
	if( n ){
	    this.playMusic( n );
	    return true;
	}
	return false;
    },

    // 次曲を再生する.
    playNext: function(){
	if(!this.requestqueue) return;
	if(!this.stock) return;

	if(this.requestqueue.length){
	    if( this.chooseMusicFromRequestAndPlay() ) return;
	}
	if(this.stock.length){
	    if( this.chooseMusicFromStockAndPlay() ) return;
	}
	// リクもストックもない.
	clearInterval(this._playnext);
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
	    debugprint("Auto Play Next Music");
	    this.commentstate = COMMENT_STATE_NONE;
	    this.playNext();
	}else{
	    debugprint("Non-Auto Play Next Music");
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

    dosoundonly:function(){
	let str = "/soundonly on";
	if($('do-subdisplay').checked){
	    str += " sub";
	}
	this.postCasterComment(str,"");
    },

    addPlayList:function(item){
	// プレイリストに追加する.
	let elem = $('played-list-textbox');
	if( GetCurrentTime()-this.starttime < 180 ){
	    // 放送開始して最初の再生らしきときには番組名と番組IDを付加.
	    if( !this._firstflag ){
		elem.value += "\n"+this.title+" "+this.request_id+"\n";
		this._firstflag = true;
	    }
	}
	if(NicoLivePreference.mikuonly){
	    // ミクうたモードのときは再生履歴にも分類表示.
	    let str = new Array();
	    for(let i=0,tag; tag=item.tags[i];i++){
		str.push(ZenToHan(tag.toLowerCase()));
	    }
	    item.classify = NicoLiveClassifier.classify(str);
	}
	this.playlist.push(item); // 再生済みリストに登録.
	this.playlist["_"+item.video_id] = true;
	elem.value += item.video_id+" "+item.title+"\n";

	NicoLiveHistory.addPlayList(item);
	this.savePlaylist();
    },

    // プレイリストをクリアする.
    clearPlayList:function(){
	let elem = $('played-list-textbox');
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
	this.requestqueue = new Array();
	NicoLiveRequest.update(this.requestqueue);
	this.saveRequest();
	this.updateRemainRequestsAndStocks();
    },
    // ストックを消去する.
    clearStock:function(){
	this.stock = new Array();
	NicoLiveRequest.updateStockView(this.stock);
	this.saveStock();
	this.updateRemainRequestsAndStocks();
    },

    // コメント(主と視聴者を識別してそれぞれのコメント).
    postComment: function(comment,mail){
	if(this.iscaster){
	    this.postCasterComment(comment,mail);
	}else{
	    this.postListenerComment(comment,mail);
	}
    },

    // 主コメを投げる.
    // comment : 運営コメント
    // mail : 運営コマンド
    // name : 左上名前欄に表示する名前
    // type : コメント種別(undefined or null:自動応答, 1:動画情報, 2:普通の主コメ
    // retry : 送信エラーになったときのリトライ時にtrue
    postCasterComment: function(comment,mail,name,type,retry){
	if(!this.iscaster) return;
	if(this.isOffline()) return;
	if(comment.length<=0) return;

	var req = new XMLHttpRequest();
	if( !req ) return;
	req.onreadystatechange = function(){
	    if( req.readyState==4 && req.status==200 ){
		debugprint('castercomment:'+req.responseText);
		if( req.responseText=="status=error" ){
		    // 世界の新着、生放送引用拒否動画は、主コメがエラーになる.
		    let video_id = null;
		    try{
			video_id = comment.match(/^\/play\s+((sm|nm)\d+)/)[1];
		    } catch (x) {
			video_id = "";
		    }
		    if( !retry ){ // 1回再送.
			debugprint('failed: '+comment);
			NicoLiveHelper.postCasterComment(comment,mail,name,type,true);
		    }
		    if(video_id && retry){
			let str = LoadFormattedString('STR_FAILED_TO_PLAY_VIDEO',[video_id]);
			NicoLiveHelper.postCasterComment(str,"");
			$('played-list-textbox').value += str + "\n";
			// たまに生引用拒否していなくてもエラーになるので.
			// 再生エラータブ行き.
			if( video_id==NicoLiveHelper.musicinfo.video_id ){
			    NicoLiveHelper.musicinfo.error = true;
			    NicoLiveHelper.musicinfo.isplayed = true;
			    NicoLiveHelper.addErrorRequestList(NicoLiveHelper.musicinfo);
			    debugprint(video_id+'をエラーリクエストタブに追加');
			}
			NicoLiveHelper.musicinfo = {};
			clearInterval(NicoLiveHelper._sendmusicid);
			NicoLiveHelper.checkPlayNext();
		    }
		}else{
		    switch( NicoLiveHelper.commentstate ){
		    case COMMENT_STATE_MOVIEINFO_DONE:
			if( type==COMMENT_MSG_TYPE_MOVIEINFO ) break;
			if( type!=COMMENT_MSG_TYPE_MOVIEINFO && comment.indexOf('/')==0 ) break;

			if( mail.indexOf("hidden")==-1 &&
			    NicoLiveHelper.commentview==COMMENT_VIEW_HIDDEN_PERM ){
				// hiddenコメじゃなければ上コメは上書きされないので
				// 復帰必要なし
				break;
			    }

			clearInterval( NicoLiveHelper._revertcommentid );
			NicoLiveHelper._revertcommentid = setInterval(
			    function(){
				NicoLiveHelper.revertMusicInfo();
				clearInterval( NicoLiveHelper._revertcommentid );
			    }, 15*1000 );
			break;
		    default:
			break;
		    }
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

	let url = "http://watch.live.nicovideo.jp/api/broadcast/" + this.request_id;
	req.open('POST', url );
	req.setRequestHeader('Content-type','application/x-www-form-urlencoded');

	// 主コメは184=falseにしても効果がないので常時trueに.
	let data = "body="+encodeURIComponent(comment)+"&is184=true";
	if(name){
	    data += "&name="+encodeURIComponent(name);
	}
	// コマンドは mail=green%20shita と付ける.
	data += "&mail="+encodeURIComponent(mail);
	req.send(data);
    },

    // 必要に応じて/clsを送信したあとに、指定の関数を実行する.
    clearCasterCommentAndRun:function(func){
	// /clsが飲み込まれて送られてこなかったらどうしよう.
	// というときのために、/clsを送る必要があるときは
	// /clsか/clearを受けとるまで6秒間隔で/clsを送信.
	if( 'function'!=typeof func ) return;
	if( this.commentview==COMMENT_VIEW_HIDDEN_PERM ){
	    // hidden/permのときは先に/clsを送らないといけない.
	    if('function'!=typeof this.postclsfunc){
		// postclsfuncが空いているので、登録したのち/cls
		this.postclsfunc = func;
		this.postCasterComment("/cls","");
		clearInterval(this._sendclsid);
		this._sendclsid = setInterval(
		    function(){
			NicoLiveHelper.postCasterComment("/cls","");
		    }, 6000 );
	    }else{
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
				NicoLiveHelper._sendclsid = setInterval(
				    function(){
					NicoLiveHelper.postCasterComment("/cls","");
				    }, 6000 );
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
	if(this.previouschat==comment){
	    ShowNotice("同じコメの連投はできません");
	    return;
	}
	this._getpostkeycounter = 0;
	this._postListenerComment(comment,mail);
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
	    + " premium=\""+this.is_premium+"\">"
	    + htmlspecialchars(comment)
	    + "</chat>\0";
	//debugprint(str);
	this.coStream.writeString(str);
    },

    // リスナーコメント投稿用のキーを取得してからコメ送信する.
    getpostkey:function(){
	if(this.isOffline()) return;
	let thread = this.thread;
	if(!thread) return;
	let block_no = parseInt(this.last_res/100) + this._getpostkeycounter;
	this._getpostkeycounter++;
	if( this._getpostkeycounter > 3){
	    // リトライは最大3回まで.
	    debugprint('getpostkey: retry failed\n');
	    return;
	}
	let url = "http://watch.live.nicovideo.jp/api/getpostkey?thread="+thread+"&block_no="+block_no;
	let req = new XMLHttpRequest();
	if(!req) return;
	req.onreadystatechange = function(){
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
	req.open('GET', url );
	req.send('');
	return;
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

    // ユーザーIDをキーに配列を検索して配列インデックス(0,1,2,...)を返す.
    // 見つからないときは -1 
    // arr 検索する配列
    // user_id 検索するユーザーID
    findRequestByUserId:function(arr,user_id){
	for(let i=0,item; item=arr[i]; i++){
	    if( item.user_id == user_id ){
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
	NicoLivePreference.writePlayStyle();
	
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

    // リクを受け付ける.
    setAllowRequest:function(flg){
	this.allowrequest = flg;
	let str = flg ? NicoLivePreference.msg.requestok : NicoLivePreference.msg.requestng;
	let command = flg ? NicoLivePreference.msg.requestok_command : NicoLivePreference.msg.requestng_command;
	if(!command) command = "";
	if(str){
	    this.postCasterComment(str,command);
	}

	let e = evaluateXPath(document,"//*[@id='toolbar-allowrequest']//*[@allowrequest='"+flg+"']");
	if(e.length){
	    $('toolbar-allowrequest').label = e[0].label;
	}
	debugprint(flg?"リクエスト許可":"リクエスト不可");

	//this.revertMusicInfo();
    },

    // リクエストリストに追加する.
    addRequestQueue:function(item){
	if( !item ) return;
	if( !item.video_id ) return;
	this.requestqueue.push(item);
	NicoLiveRequest.add(item);
	this.updateRemainRequestsAndStocks();
    },
    // リクエストリストから削除する.
    // idx: 1,2,3,...
    removeRequest:function(idx){
	idx--;
	let removeditem = this.requestqueue.splice(idx,1);
	debugprint("Remove request #"+idx);
	NicoLiveRequest.update(this.requestqueue);
	this.saveRequest();
	this.updateRemainRequestsAndStocks();
	return removeditem[0];
    },
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

    floatRequest:function(idx){
	idx--; 
	if(idx<=0) return;
	let tmp = this.requestqueue[idx-1];
	this.requestqueue[idx-1] = this.requestqueue[idx];
	this.requestqueue[idx] = tmp;
	NicoLiveRequest.update(this.requestqueue);
	this.saveRequest();
    },
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
				    if(b.cno==0) return -1;
				    if(a.cno==0) return 1;
				    return (a.cno - b.cno) * order;
				});
	NicoLiveRequest.update(this.requestqueue);
	this.saveRequest();
    },

    // ストックリストに追加.
    addStockQueue:function(item){
	if( !item || !item.video_id ) return;
	if(this.isStockedMusic(item.video_id)) return;
	this.stock.push(item);
	NicoLiveRequest.addStockView(item);

	this.updateRemainRequestsAndStocks();
    },

    // ストック--->リクエストキュー
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
	this.error_req["_"+item.video_id] = item;
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
	info.cno = 0;
	info.tags = [];

	let root;
	try{
	    root = xml.getElementsByTagName('thumb')[0];
	} catch (x) {
	    return null;
	}
	if( !root ) return null;
	for(let i=0,elem; elem=root.childNodes[i]; i++){	    	
	    switch( elem.tagName ){
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
		info.length = elem.textContent;
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
		if( elem.getAttribute('domain')=='jp' ){
		    let tag = elem.getElementsByTagName('tag');// DOM object
		    info.tags = new Array();
		    for(let i=0,item;item=tag[i];i++){
			info.tags[i] = restorehtmlspecialchars(ZenToHan(item.textContent)); // string
		    }
		}else{
		    let tag = elem.getElementsByTagName('tag');
		    if( !info.overseastags ) info.overseastags = new Array();
		    for(let i=0,item;item=tag[i];i++){
			info.overseastags.push( restorehtmlspecialchars(ZenToHan(item.textContent)) );
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
	    default:
		break;
	    }
	}
	// video_id がないときはエラーとしておこう、念のため.
	if( !info.video_id ) return null;

	info.pname = this.getPName(info);

	info.mylistcomment = NicoLiveMylist.mylistcomment["_"+info.video_id];
	return info;
    },

    // 動画をストックに追加する.
    addStock: function(sm){
	if(sm.length<3) return;
	if(this.isStockedMusic(sm)) return;

	var req = new XMLHttpRequest();
	if( !req ) return;
	req.onreadystatechange = function(){
	    if( req.readyState==4 && req.status==200 ){
		// ストックでもリクエスト縛り要件を満たすかチェックする.
		let ans = NicoLiveHelper.checkAcceptRequest(req.responseXML, 0);
		//debugprint(sm+'/'+ans.msg);
		switch(ans.code){
		case 0:
		case -2: // リク受けつけてない.
		case -4: // 再生済み.
		case -5: // リク済み.
		    ans.movieinfo.iscasterselection = true; // ストックは主セレ扱い.
		    if(NicoLiveHelper.isPlayedMusic(ans.movieinfo.video_id)){
			ans.movieinfo.isplayed = true;
		    }
		    ans.movieinfo.user_id = "1";
		    NicoLiveHelper.addStockQueue(ans.movieinfo);
		    break;
		default:
		    break;
		}
	    }
	};
	let url = "http://www.nicovideo.jp/api/getthumbinfo/"+sm;
	req.open('GET', url );
	req.send("");
    },

    // 動画情報を取得してリクエストに追加する.
    addRequest: function(vid,cno,userid){
	/*
	 * vid : 動画ID,cnoコメ番
	 * cno : 0のときはリクエストじゃないとき.
	 * userid : "0"のときは自張り. 
	 */
	if(vid.length<3) return;

	var req = new XMLHttpRequest();
	if( !req ) return;

	let request = new Object();
	request.video_id = vid;
	request.comment_no = cno;
	request.user_id = userid;
	request.xml = null;
	this.requestprocessingqueue.push(request);

	req.onreadystatechange = function(){
	    if( req.readyState==4 && req.status==200 ){
		let i,q;
		for(i=0;q=NicoLiveHelper.requestprocessingqueue[i];i++){
		    if( q.video_id==vid && q.comment_no==cno ){
			q.xml = req.responseXML;
		    }
		}

		while( NicoLiveHelper.requestprocessingqueue.length && NicoLiveHelper.requestprocessingqueue[0].xml ){
		    q = NicoLiveHelper.requestprocessingqueue.shift();

		    // リクのあった動画をチェック.
		    let ans = NicoLiveHelper.checkAcceptRequest( q.xml, q.comment_no );
		    ans.movieinfo.iscasterselection = q.comment_no==0?true:false; // コメ番0はリクエストではない.
		    ans.movieinfo.selfrequest = q.user_id=="0"?true:false;        // 自貼りのユーザーIDは0.

		    // リクエスト制限数をチェック.
		    let nlim = NicoLivePreference.nreq_per_ppl;
		    if(!NicoLiveHelper.request_per_ppl[q.user_id]){
			NicoLiveHelper.request_per_ppl[q.user_id] = 0;
		    }
		    if( ans.code==0 && q.user_id!="0"){
			// 自貼りはカウントしなくてOK.
			NicoLiveHelper.request_per_ppl[q.user_id]++;
		    }
		    let n = NicoLiveHelper.request_per_ppl[q.user_id];
		    if(ans.code==0 && n>nlim && nlim>0){
			NicoLiveHelper.request_per_ppl[q.user_id]--;
			ans.msg = NicoLivePreference.msg.limitnumberofrequests;
			ans.code = -1;
		    }

		    // 動画情報にはコメ番とユーザーIDを含む.
		    ans.movieinfo.cno = q.comment_no;
		    ans.movieinfo.user_id = q.user_id;

		    if(ans.code==0){
			let checker = NicoLiveHelper.runRequestCheckerScript(ans.movieinfo);
			if(checker!=null){
			    ans.code = checker.code;
			    ans.msg = checker.msg || ans.msg;
			}
		    }

		    switch(ans.code){
		    case 0:
			ans.movieinfo.error = false;
			NicoLiveHelper.addRequestQueue(ans.movieinfo);
			break;
		    default:
			ans.movieinfo.error = true;
			NicoLiveHelper.addErrorRequestList(ans.movieinfo);
			break;
		    }

		    if(NicoLivePreference.isautoreply && ans.msg){
			// 返答メッセージが指定してあれば主コメする.
			let msg = ">>"+q.comment_no+" " + ans.msg;
			let info = ans.movieinfo;
			info.restrict = NicoLivePreference.restrict;
			msg = NicoLiveHelper.replaceMacros(msg, info);
			if( q.comment_no!=0 ) NicoLiveHelper.postCasterComment(msg,"");
			debugprint(msg);
		    }
		    NicoLiveHelper.updateRemainRequestsAndStocks();
		}
	    }
	};
	let url = "http://www.nicovideo.jp/api/getthumbinfo/"+vid;
	req.open('GET', url );
	req.send("");
    },

    runRequestCheckerScript:function(info){
	if(NicoLivePreference.do_customscript){
	    let r = eval( NicoLivePreference.customscript.requestchecker );
	    if('string'==typeof r){
		if(r) return {"code":-1,"msg":r};
		else return {"code":0,"msg":""};
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
	this.playlist["_"+video_id] = false;
	for(let i=0,item; item=this.stock[i];i++){
	    if(item.video_id==video_id){
		item.isplayed = false;		
	    }
	}
    },

    // リクエスト済みチェック.
    isRequestedMusic:function(video_id){
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

    // 動画情報を取得してリクエストに追加する.
    getthumbinfo:function(sm,cno,userid){
	this.addRequest(sm,cno,userid);
    },

    // コメントサーバからやってくる行を処理する.
    processLine: function(line){
	//debugprint(line);
	if(line.match(/^<chat\s+.*>/)){
	    //debugprint(line);
	    let parser = new DOMParser();
	    let dom = parser.parseFromString(line,"text/xml");
	    this.processComment(dom.getElementsByTagName('chat')[0]);
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
	    this.ticket = dat[1];
	    debugprint('ticket='+this.ticket);
	}
	dat = line.match(/<thread.*last_res=\"([0-9a-fA-Fx]*)\".*\/>/);
	if(dat){
	    this.last_res = parseInt(dat[1]);
	    debugprint('last_res='+this.last_res);
	}
    },

    // コメントサーバに接続.
    // getplayerstatusでコメントサーバを調べたあとに呼ばれる.
    connectCommentServer: function(server,port,thread){
	//<thread thread="1005799549" res_from="-50" version="20061206"/>
	var socketTransportService = Components.classes["@mozilla.org/network/socket-transport-service;1"].getService(Components.interfaces.nsISocketTransportService);
	var socket = socketTransportService.createTransport(null,0,server,port,null);
	var iStream = socket.openInputStream(0,0,0);
	this.connecttime = new Date();
	this.connecttime = this.connecttime.getTime()/1000; // convert to second from epoc.

	this.ciStream = Components.classes["@mozilla.org/intl/converter-input-stream;1"].createInstance(Components.interfaces.nsIConverterInputStream);
	this.ciStream.init(iStream,"UTF-8",0,Components.interfaces.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);

	this.pump = Components.classes["@mozilla.org/network/input-stream-pump;1"].createInstance(Components.interfaces.nsIInputStreamPump);
	this.pump.init(iStream,-1,-1,0,0,false);

	this.oStream = socket.openOutputStream(0,0,0);
	this.coStream = Components.classes["@mozilla.org/intl/converter-output-stream;1"].createInstance(Components.interfaces.nsIConverterOutputStream);
	this.coStream.init(this.oStream,"UTF-8",0,Components.interfaces.nsIConverterOutputStream.DEFAULT_REPLACEMENT_CHARACTER);

	var dataListener = {
	    line: "",
	    onStartRequest: function(request, context){
	    },
	    onStopRequest: function(request, context, status){
		try{
		    debugalert('コメントサーバから切断されました。');
		    NicoLiveHelper.close();
		} catch (x) {
		}
	    },
	    onDataAvailable: function(request, context, inputStream, offset, count) {
		//debugprint( "offset=" + offset + ",count=" + count );
		let lineData = {};
		let r;
		while(1){
		    // まとめて読むと、行単位の区切り付けるのメンドイんで.
		    try{
			r = NicoLiveHelper.ciStream.readString(1,lineData);
		    } catch (x) { return; }
		    if( !r ){ break; }
		    if( lineData.value=="\0" ){
			NicoLiveHelper.processLine(this.line);
			this.line = "";
			continue;
		    }
		    this.line += lineData.value;
		}
	    }
	};

	let str = "<thread thread=\""+thread+"\" res_from=\"-100\" version=\"20061206\"/>\0";
	this.coStream.writeString(str);
	this.pump.asyncRead(dataListener,null);

	// 30分に1回送ってればいいのかね.
	this._keepconnection = setInterval( function(){
						NicoLiveHelper.keepConnection();
					    }, 1000*60*30);
	this._updateprogressid = setInterval( function(){
						  NicoLiveHelper.updateProgressBar();
					      }, 1000);
	this.heartbeat();
	this._heartbeat = setInterval( function(){
					   NicoLiveHelper.heartbeat();
				       }, 1*60*1000);
	this.sendStartupComment();
	if( NicoLivePreference.isjingle ) this.playJingle();

	this.getpublishstatus();// obtain end_time.

	let prefs = NicoLivePreference.getBranch();
	if(prefs.getBoolPref("savecomment")){
	    NicoLiveComment.openFile(this.request_id);
	}
	NicoLiveComment.getNGWords();// obtain NG words list.

	debugprint('Server clock:'+GetDateString(this.serverconnecttime*1000));
	debugprint('PC clock:'+GetDateString(this.connecttime*1000));
	// サーバ時刻にしておけば間違いないかな.
	this.connecttime = this.serverconnecttime;
    },

    keepConnection:function(){
	let str = "<thread thread=\""+this.thread+"\" res_from=\"-1\" version=\"20061206\"/>\0";
	this.coStream.writeString(str);
    },

    // 接続を閉じる.
    close: function(){
	try{
	    clearInterval(this._updateprogressid);
	    clearInterval(this._keepconnection);
	    clearInterval(this._playnext);
	    clearInterval(this._sendmusicid);
	    clearInterval(this._prepare);
	    clearInterval(this._heartbeat);
	} catch (x) {
	}

	if( this.oStream ){
	    debugprint("delete output stream");
	    this.oStream.close();
	    delete this.oStream;
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

    showNotice3minleft:function(){
	let str = LoadString('STR_REMAIN_3MIN');
	if( NicoLivePreference.notice.area ){
	    ShowNotice(str);
	}
	if( NicoLivePreference.notice.comment ){
	    this.postCasterComment(str,"");
	}
	if( NicoLivePreference.notice.dialog ){
	    AlertPrompt(str, this.request_id+":"+this.title);
	}
    },

    // 現在の再生曲の再生時間と、生放送の経過時間をプログレスバーで表示.
    updateProgressBar:function(){
	let currentmusic = $('statusbar-currentmusic');
	let playprogress = $('statusbar-music-progressmeter');
	let musictime = $('statusbar-music-name');
	let progress,progressbar;
	let liveprogress = $('statusbar-live-progress');
	let now = GetCurrentTime();
	let p = now - this.starttime;  // Progress
	let n = Math.floor(p/(30*60)); // 30分単位に0,1,2,...
	if(p<0) p = 0;
	liveprogress.label = GetTimeString(p);

	if( (this.endtime && this.endtime-now>0 && this.endtime-now < 3*60) ||
	    (!this.endtime && n>=0 && p > 27*60 + 30*60*n) ){
		// 終了時刻が分かっているのであれば終了時刻から残り3分未満を見る.
		// 分からないときは 27分+30分*n(n=0,1,2,...)越えたら.
		if(!this.isnotified[n]){
		    this.showNotice3minleft();
		    this.isnotified[n] = true;
		}
	    }
	if( this.endtime && this.endtime<now ){
	    // 終了時刻を越えたら新しい終了時刻が設定されているかどうかを見にいく.
	    this.endtime = 0;
	    this.getpublishstatus();
	}

	if(!this.musicinfo.length_ms){ currentmusic.setAttribute("tooltiptext",""); return; }

	let str;
	str = "投稿日/"+GetDateString(this.musicinfo.first_retrieve*1000)
	    + " 再生数/"+this.musicinfo.view_counter
	    + " コメント/"+this.musicinfo.comment_num
	    + " マイリスト/"+this.musicinfo.mylist_counter+"\n"
	    + "タグ/"+this.musicinfo.tags.join(',');
	currentmusic.setAttribute("tooltiptext",str);

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

    // プログレスバーの時間表示で、progressとremainの表示を切り替え.
    toggleDisplayProgressTime:function(event){
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
    },

    // getplayerstatus APIから生放送情報を取得する.
    getplayerstatus: function(req_id){
	var req = new XMLHttpRequest();
	if(!req) return;
	req.onreadystatechange = function(){
	    if( req.readyState!=4 || req.status!=200 ) return;
	    let xml = req.responseXML;

	    if( xml.getElementsByTagName('code').length ){
		debugalert( xml.getElementsByTagName('code')[0].textContent );
		return;
	    }
	    try {
		NicoLiveHelper.user_id    = xml.getElementsByTagName('user_id')[0].textContent;
		NicoLiveHelper.is_premium = xml.getElementsByTagName('is_premium')[0].textContent;
		NicoLiveHelper.addr       = xml.getElementsByTagName('addr')[0].textContent;
		NicoLiveHelper.port       = xml.getElementsByTagName('port')[0].textContent;
		NicoLiveHelper.thread     = xml.getElementsByTagName('thread')[0].textContent;
		NicoLiveHelper.iscaster   = xml.getElementsByTagName('room_seetno')[0].textContent;
		NicoLiveHelper.starttime  = parseInt(xml.getElementsByTagName('start_time')[0].textContent);
		NicoLiveHelper.opentime   = parseInt(xml.getElementsByTagName('open_time')[0].textContent);
		NicoLiveHelper.community  = xml.getElementsByTagName('default_community')[0].textContent;
		// 座席番号2525....が主らしい.
		if( NicoLiveHelper.iscaster.match(/^2525/) ){
		    let i,item;
		    NicoLiveHelper.iscaster=true;
		    // load requests
		    NicoLiveHelper.requestqueue = NicoLiveDatabase.loadGPStorage("nico_live_requestlist",[]);
		    NicoLiveRequest.update(NicoLiveHelper.requestqueue);
		    // load playlist
		    NicoLiveHelper.playlist = NicoLiveDatabase.loadGPStorage("nico_live_playlist",[]);
		    for(i=0;i<NicoLiveHelper.playlist.length;i++){
			NicoLiveHelper.playlist["_"+NicoLiveHelper.playlist[i]] = true;
			NicoLiveHistory.addPlayList( NicoLiveHelper.playlist[i] );
		    }
		    $('played-list-textbox').value = NicoLiveDatabase.loadGPStorage("nico_live_playlist_txt","");
		    debugprint('You are a caster');
		}else{
		    NicoLiveHelper.iscaster = false;
		    debugprint('You are not a caster');
		}

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
			// プログレスバー用に情報をセット.
			let tmp = currentplay.textContent.match(/(sm|nm|ze)\d+/);
			if(tmp){
			    NicoLiveHelper.musicstarttime  = st;
			    NicoLiveHelper.setCurrentVideoInfo(tmp[0],false);
			    NicoLiveHelper.inplay = true;
			}
			break;
		    }
		}

		let serverdate = req.getResponseHeader("Date");
		serverdate = new Date(serverdate);
		NicoLiveHelper.serverconnecttime = serverdate.getTime()/1000;

		debugprint("addr:"+NicoLiveHelper.addr);
		debugprint("port:"+NicoLiveHelper.port);
		debugprint("thread:"+NicoLiveHelper.thread);
		NicoLiveHelper.connectCommentServer(NicoLiveHelper.addr,NicoLiveHelper.port,NicoLiveHelper.thread);

		$('statusbar-live-progress').setAttribute("tooltiptext",'ロスタイム:'+NicoLiveHelper.calcLossTime()+'秒');
	    } catch (x) {
		debugalert('Error occurred.'+x);
	    }
	};
	this.close();

	let url="http://watch.live.nicovideo.jp/api/getplayerstatus?v="+req_id;
	req.open('GET', url );
	req.channel.loadFlags |= Components.interfaces.nsIRequest.LOAD_BYPASS_CACHE;
	req.send("");
    },

    // 次曲再生のタイマをしかける.
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
	this._playnext = setInterval(
	    function(){
		NicoLiveHelper.checkPlayNext();
	    }, du+interval);
	debugprint( parseInt((du+interval)/1000)+'秒後に次曲を再生します');

	// 30秒未満のときはやらない.
	if(du<30*1000) return;
	this._prepare = setInterval(
	    function(){
		clearInterval(NicoLiveHelper._prepare);
		if( !NicoLivePreference.doprepare ) return; // /prepareしない.
		if( !NicoLiveHelper.israndomplay ){
		    // ランダム再生以外のときは次の再生曲が予測できるので準備する.
		    // ただし30枠収める指定は加味しない.
		    if(NicoLiveHelper.requestqueue.length){
			let n = 0;
			if( NicoLiveHelper.isconsumptionrateplay ){
			    let rate = NicoLiveHelper.calcConsumptionRate();
			    for(let i=0;i<rate.length;i++){
				n = NicoLiveHelper.findRequestByUserId(NicoLiveHelper.requestqueue, rate[i].user_id);
				if(n>=0) break;
			    }
			    if(n<0) n=0;
			}
			NicoLiveHelper.postCasterComment("/prepare "+NicoLiveHelper.requestqueue[n].video_id,"");
		    }else if(NicoLiveHelper.stock.length){
			for(let i=0,item;item=NicoLiveHelper.stock[i];i++){
			    if(!NicoLiveHelper.isPlayedMusic(item.video_id)){
				NicoLiveHelper.postCasterComment("/prepare "+NicoLiveHelper.stock[i].video_id,"");
				break;
			    }
			}
		    }
		}
	    }, parseInt((du+interval)/5*4) );
    },

    // ロスタイムを秒で返す.
    calcLossTime:function(){
	let tmp = 120 - (this.starttime % 60);
	if( tmp>105 ) tmp = 60;
	tmp = Math.floor(tmp/10)*10; // 10秒未満の端数は切り捨て.
	return tmp;
    },

    heartbeat:function(){
	let url = "http://watch.live.nicovideo.jp/api/heartbeat";
	let req = new XMLHttpRequest();
	if(!req) return;
	req.onreadystatechange = function(){
	    if( req.readyState==4 && req.status==200 ){
		let xml = req.responseXML;
		try{
		    let watcher = xml.getElementsByTagName('watchCount')[0].textContent;
		    $('statusbar-n-of-listeners').label = LoadFormattedString('STR_WATCHER',[watcher]);
		} catch (x) {

		}
	    }
	};
	req.open('POST',url);
	req.setRequestHeader('Content-type','application/x-www-form-urlencoded');
	let data = "v="+this.request_id;
	req.send(data);
    },


    // 配信開始ステータスに変える.
    configureStream:function(token){
	// exclude=0ってパラメタだから
	// 視聴者を排除(exclude)するパラメタをOFF(0)にするって意味だろうな.
	let conf = "http://watch.live.nicovideo.jp/api/configurestream/" + this.request_id +"?key=exclude&value=0&token="+token;
	let req = new XMLHttpRequest();
	if( !req ) return;
	req.onreadystatechange = function(){
	    if( req.readyState==4 && req.status==200 ){
		let confstatus = req.responseXML.getElementsByTagName('response_configurestream')[0];
		if( confstatus.getAttribute('status')=='ok' ){
		}else{
		    debugalert(LoadString('STR_FAILED_TO_START_BROADCASTING'));
		}
	    }
	};
	req.open('GET', conf );
	req.send("");
    },

    // 配信開始.
    startBroadcasting:function(){
	// getpublishstatus + configurestream
	if( !this.request_id || this.request_id=="lv0" ) return;
	let doconfigurestream = true;
	this.getpublishstatus(doconfigurestream);
    },
    // getpublishstatusを行い、end_timeとtokenを得る.
    getpublishstatus:function(doconfigurestream){
	if( !this.iscaster ) return;
	if( !this.request_id || this.request_id=="lv0" ) return;
	if( this._dogetpublishstatus ) return;

	let url = "http://watch.live.nicovideo.jp/api/getpublishstatus?v=" + this.request_id;
	let req = new XMLHttpRequest();
	if( !req ) return;
	req.onreadystatechange = function(){
	    if( req.readyState==4 && req.status==200 ){
		let publishstatus = req.responseXML;
		NicoLiveHelper.token   = publishstatus.getElementsByTagName('token')[0].textContent;
		let tmp = parseInt(publishstatus.getElementsByTagName('end_time')[0].textContent);
		// 取得した終了時刻がより現在より未来指していたら更新.
		if( GetCurrentTime() <= tmp ) NicoLiveHelper.endtime = tmp;
		debugprint('token='+NicoLiveHelper.token);
		debugprint('endtime='+NicoLiveHelper.endtime);
		if( doconfigurestream ){
		    NicoLiveHelper.configureStream( NicoLiveHelper.token );
		}
		NicoLiveHelper._dogetpublishstatus = false;
	    }
	};
	req.open('GET', url );
	req.send("");
	this._dogetpublishstatus = true;
    },

    // スタートアップコメントを送信開始する.
    sendStartupComment:function(){
	if( !this.iscaster ) return;
	if( GetCurrentTime()-this.starttime > 180 ) return;
	if( this.inplay ) return; // 何か再生中はスタートアップコメントを行わない.

	this.startup_comments = NicoLivePreference.startup_comment.split(/\n|\r|\r\n/);
	if(this.startup_comments.length){
	    debugprint("Send Startup Comments");
	    this._startupcomment = setInterval( function(){
						    NicoLiveHelper._sendStartupComment();
						}, 5000);
	}
    },
    _sendStartupComment:function(){
	let str = this.startup_comments.shift();
	if(str){
	    debugprint('startupcomment:'+str);
	    this.postCasterComment(str,"");
	}else{
	    debugprint('Sending Startup Comments was done.');
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
	if(!jingle) return;
	debugprint('jingle:'+jingle);

	if( GetCurrentTime()-this.starttime < 180 ){
	    if( !this.inplay ){ // 何も動画が再生されてなければジングル再生.
		this.inplay = true;
		let timerid = setInterval( function(){
					       NicoLiveHelper.postCasterComment("/play "+jingle);
					       clearInterval(timerid);
					   }, 5000);
	    }
	}
    },

    // 接続を開始する.
    start: function(request_id){
	this.request_id = request_id;
	debugprint("starting nicolive " + request_id);
	this.getplayerstatus(request_id);
    },

    saveAll:function(){
	this.saveStock();
	this.saveRequest();
	this.savePlaylist();
    },
    saveStock:function(){
	Application.storage.set("nico_live_stock",this.stock);
	debugprint("save stock");
    },
    saveRequest:function(){
	// 視聴者ではリクエストは保存しない.
	if(!this.iscaster && !this.isOffline()) return;
	Application.storage.set("nico_live_requestlist",this.requestqueue);
	debugprint("save request");
    },
    savePlaylist:function(){
	// 視聴者ではプレイリストは保存しない.
	if(!this.iscaster && !this.isOffline()) return;
	Application.storage.set("nico_live_playlist",this.playlist);
	Application.storage.set("nico_live_playlist_txt",$('played-list-textbox').value);
	debugprint("save play history");
    },
    saveToStorage:function(){
	NicoLiveDatabase.saveGPStorage("nico_live_stock",this.stock);

	// 視聴者ではリクエスト、プレイリストは保存しない.
	if(!this.iscaster && !this.isOffline()) return;
	NicoLiveDatabase.saveGPStorage("nico_live_requestlist",this.requestqueue);
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

    // オフラインかどうか.
    isOffline:function(){
	return this.request_id=="lv0";
    },

    init: function(){
	// リクエストのコメ番順シーケンシャル処理用.
	this.requestprocessingqueue = new Array();

	debugprint('Initialized NicoLive Helper');
	let request_id = Application.storage.get("nico_request_id","lv0");
	let title      = Application.storage.get("nico_live_title","");
	let caster = Application.storage.get("nico_live_caster",true);
	debugprint("Caster:"+caster);

	debugprint(request_id);
	this.requestqueue = new Array();
	this.playlist     = new Array();
	this.stock        = new Array();
	this.error_req    = new Object(); // 配列にしない
	this.isnotified   = new Array(); // 残り3分通知を出したかどうかのフラグ.
	this.musicinfo    = {};
	this.resetRequestCount(); // 1人あたりのリクエスト受け付け数ワーク.

	this.allowrequest = NicoLivePreference.allowrequest;
	this.setPlayStyle(NicoLivePreference.playstyle);

	this.stock        = NicoLiveDatabase.loadGPStorage("nico_live_stock",[]);

	if(request_id!="lv0"){
	    // online
	    title = title.replace(/\u200b/g,"");
	    document.title = request_id+":"+title+" (NicoLive Helper)";
	    this.title = title;
	    this.start(request_id);
	}else{
	    // offline
	    this.request_id = request_id;
	    this.requestqueue = NicoLiveDatabase.loadGPStorage("nico_live_requestlist",[]);
	    NicoLiveHelper.playlist = NicoLiveDatabase.loadGPStorage("nico_live_playlist",[]);
	    for(let i=0;i<NicoLiveHelper.playlist.length;i++){
		NicoLiveHelper.playlist["_"+NicoLiveHelper.playlist[i]] = true;
		NicoLiveHistory.addPlayList( NicoLiveHelper.playlist[i] );
	    }
	    $('played-list-textbox').value = NicoLiveDatabase.loadGPStorage("nico_live_playlist_txt","");
	}
	this.updateRemainRequestsAndStocks();

	if( !this.isOffline() && caster ){
	    this.retrieveUserDefinedValue();
	}

	this.updatePNameWhitelist();

	// Windows Live Messengerに番組名を通知する.
	if(IsWINNT() && !this.isOffline()){
	    let obj = Components.classes["@miku39.jp/WinLiveMessenger;1"].createInstance(Components.interfaces.IWinLiveMessenger);
	    if(!this.isOffline()){
		obj.SetWinLiveMessengerMsg(this.title);
	    }
	}
    },
    destroy: function(){
	debugprint("Destroy NicoLive Helper");
	this.saveAll();
	this.saveToStorage();
	this.close();

	if(IsWINNT() && !this.isOffline()){
	    let obj = Components.classes["@miku39.jp/WinLiveMessenger;1"].createInstance(Components.interfaces.IWinLiveMessenger);
	    obj.SetWinLiveMessengerMsg("");
	}
    },

    test: function(){
	let f = "resizable,chrome,dialog=no";
    }
};

window.addEventListener("load", function(e){ NicoLiveHelper.init(); }, false);
window.addEventListener("unload", function(e){ NicoLiveHelper.destroy(); }, false);
