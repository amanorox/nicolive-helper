/**
 * ニコニコ生放送ヘルパー for Firefox 3.5
 */

var NicoLiveHelper = {
    request_id: "",    // 生放送ID(lvXXXXXXX).
    addr: "",
    port: 0,
    thread: "",        // コメントサーバスレッド.
    ticket: "",
    user_id:"",
    is_premium:"0",
    last_res: 0,
    postkey:"",

    connecttime: 0,    // 接続した時刻.
    secofweek: 604800, // 1週間の秒数(60*60*24*7).

    starttime: 0,  // 放送の始まった時刻(sec).
    musicstarttime: 0, // 曲の再生開始時刻(sec).
    musicendtime: 0,   // 曲の終了予定時刻(sec).

    iscaster: false,   // 主フラグ.
    inplay: false,     // 再生中フラグ.
    isacceptrequest: true, // リクを受け付けるフラグ.
    isautoplay: false,      // 自動再生フラグ.
    israndomplay: false,   // ランダム再生フラグ.

    // リクを受け付けるかどうかチェック.
    checkAcceptRequest: function(xml){
	if(xml.getElementsByTagName('error').length){
	    // 動画がない.
	    return {code:-1,msg:NicoLivePreference.msg_deleted,movieinfo:{}};
	}
	let info = this.xmlToMovieInfo(xml);

	if( !this.isacceptrequest ){
	    // リクを受け付けていない.
	    return {code:-2,msg:NicoLivePreference.msg_notaccept,movieinfo:info};
	}

	if(NicoLivePreference.limitnewmovie){
	    if( GetCurrentTime()-info.first_retrieve < this.secofweek ){
		// 7日内に投稿された動画.
		return {code:-3,msg:NicoLivePreference.msg_newmovie,movieinfo:info};
	    }
	}

	if(this.isPlayedMusic(info.video_id)){
	    return {code:-4,msg:NicoLivePreference.msg_played,movieinfo:info};
	}

	if(this.isRequestedMusic(info.video_id)){
	    // リクエストキューに既にある動画.
	    return {code:-5,msg:NicoLivePreference.msg_requested,movieinfo:info};
	}

	if(NicoLivePreference.mikuonly){
	    // ミクオリジナル曲チェックusingタグandタイトル.
	    let ismiku = false;
	    let isoriginal = false;
	    if(info.title.match(/ミク/)){ ismiku = true; }
	    if(info.title.match(/オリジナル/)){ isoriginal = true; }

	    for(let i=0,item;item=info.tags[i];i++){
		if(item.match(/ミク/)){ ismiku = true; }
		if(item.match(/オリジナル/)){ isoriginal = true; }

		if(item.match(/コモンズ/)){ isoriginal = true; }
		if(item.match(/VOCALOID→VOCALOIDカバー/)){ isoriginal = true; }
		if(item.match(/VOCALOIDアレンジ曲/)){ isoriginal = true; }
		if(item.match(/VOCALOID-PV/)){ isoriginal = true; }
		if(item.match(/ミクオリジナル/)){
		    ismiku = true;
		    isoriginal = true;
		}
	    }
	    if(!ismiku||!isoriginal){
		return {code:-6,msg:"ミクオリジナル曲かどうかを自動判断できませんでした",movieinfo:info};
	    }
	}

	// code:0を返すことで受け付ける.
	return {code:0,msg:NicoLivePreference.msg_accept,movieinfo:info};
    },

    extractComment: function(xmlchat){
	let chat = {};
	chat.text = xmlchat.textContent;
	let attrs = xmlchat.attributes;
	chat.date = attrs.getNamedItem('date');
	chat.premium = attrs.getNamedItem('premium');
	chat.user_id = attrs.getNamedItem('user_id');
	chat.no = attrs.getNamedItem('no');
	chat.anonymity = attrs.getNamedItem('anonymity');
	chat.date = chat.date && parseInt(chat.date.nodeValue) || 0;
	chat.premium = chat.premium && parseInt(chat.premium.nodeValue) || 0;
	chat.user_id = chat.user_id && chat.user_id.nodeValue || "0";
	chat.no = chat.no && parseInt(chat.no.nodeValue) || 0;
	chat.anonymity = chat.anonymity && parseInt(chat.anonymity.nodeValue) || 0;	
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
		NicoLiveHelper.musicinfo = music;
		let du = Math.floor(NicoLiveHelper.musicinfo.length_ms/1000)+1;
		NicoLiveHelper.musicendtime   = NicoLiveHelper.musicstarttime+du;
		if(setinterval){
		    NicoLiveHelper.setupPlayNextMusic(music.length_ms);
		    NicoLiveHelper.addPlayedList(music);
		}
	    }
	};
	let url = "http://www.nicovideo.jp/api/getthumbinfo/"+video_id;
	req.open('GET', url );
	req.send("");
    },

    // コメを処理する.
    processComment: function(xmlchat){
	let chat=this.extractComment(xmlchat);

	NicoLiveComment.push(chat);
	NicoLiveComment.addRow(chat);

	if(chat.date<this.connecttime){ return; } // 過去ログ無視.

	if((chat.premium==3||chat.user_id=="0") && chat.text=="/disconnect"){
	    // ロスタイムのときはuser_id=="0"から/disconnectがやってくる.
	    this.close();

	    let prefs = NicoLivePreference.getBranch();
	    if( prefs.getBoolPref("autowindowclose") ){
		window.close();
	    }else{
		debugalert(this.request_id+' finished.');
	    }
	}

	switch(chat.premium){
	case 3:
	    // 主コメの処理.
	    let dat;
	    dat = chat.text.match(/^\/play(sound)*\s*smile:((sm|nm|ze)\d+)\s*main\s*\"(.*)\"$/);
	    if(dat){
		if(!this.iscaster){
		    // リスナーの場合は動画情報を持っていないので取ってくる.
		    this.musicstarttime = GetCurrentTime();
		    this.setCurrentVideoInfo(dat[2],false);
		    this.inplay = true;
		    $('played-list-textbox').value += dat[2]+" "+dat[4]+"\n";
		}else{
		    if( this.musicinfo.video_id!=dat[2] ){
			// 直接運営コマンドを入力したときとかで、
			// 現在再生しているはずの曲と異なる場合.
			this.musicstarttime = GetCurrentTime();
			this.setCurrentVideoInfo(dat[2],true);
			this.inplay = true;
			$('played-list-textbox').value += dat[2]+" "+dat[4]+"\n";
		    }else{
			// 自動再生の準備.
			this.setupPlayNextMusic(this.musicinfo.length_ms);
			this.inplay = true;
			this.musicstarttime = GetCurrentTime();
			this.musicendtime   = Math.floor(this.musicstarttime + this.musicinfo.length_ms/1000)+1;
		    }
		}
	    }
	    break;

	default:
	    // リスナーコメの処理.
	    if(1 || this.iscaster){
		let sm = chat.text.match(/((sm|nm)\d+)/);
		if(sm){
		    let selfreq = chat.text.match(/自貼り/);
		    this.getthumbinfo(sm[1],chat.no, selfreq?"0":chat.user_id);
		}
	    }
	    break;
	}
    },

    // 再生する曲の情報を主コメする.
    sendMusicInfo2:function(){
	let info = this.musicinfo;
	let str = NicoLivePreference.videoinfo[this._counter];
	let sendstr;
	if(!str){
	    clearInterval(this._sendmusicid);
	    this._counter = 0;
	    return;
	}
	sendstr = str.replace(/{(.*?)}/g,
			      function(s,p){
				  let tmp = s;
				  switch(p){
				  case 'id':
				      tmp = info.video_id; break;
				  case 'title':
				      tmp = info.title; break;
				  case 'date':
				      tmp = GetDateString(info.first_retrieve*1000); break;
				  case 'length':
				      tmp = info.length; break;
				  case 'view':
				      tmp = FormatCommas(info.view_counter); break;
				  case 'comment':
				      tmp = FormatCommas(info.comment_num); break;
				  case 'mylist':
				      tmp = FormatCommas(info.mylist_counter); break;
				  case 'tags':
				      // 1行40文字程度までかなぁ
				      tmp = info.tags.join(',');
				      tmp = tmp.replace(/(.{35,}?),/g,"$1<br>");
				      break;
				  case 'pname':
				      let pn = NicoLiveDatabase.getPName(info.video_id);
				      if(!pn){
					  let pname = new Array();
					  for(let i=0,tag;tag=info.tags[i];i++){
					      tag = ZenToHan(tag);
					      if(tag.match(/(PSP|アイドルマスターSP|m[a@]shup)$/i)) continue;
					      if(tag.match(/(M[A@]D|MMD|HD|3D|頭文字D|(吸血鬼|バンパイア)ハンターD|L4D|TOD|oid)$/i)) continue;

					      // P名
					      let t = tag.match(/.*[^OＯ][pｐPＰ]$/);
					      if(t) pname.push(t[0]);
					      // D名
					      t = tag.match(/.*[dｄDＤ]$/);
					      if(t) pname.push(t[0]);
					  }
					  if(pname.length) tmp = pname.join(',');
					  else tmp = "";
				      }else{
					  // DBのP名優先.
					  tmp = pn;
				      }
				      break;
				  case 'additional':
				      tmp = NicoLiveDatabase.getAdditional(info.video_id);
				      break;
				  }
				  return tmp;
			      });
	let cmd = "";
	switch(NicoLivePreference.caster_comment_type){
	case 1: // /perm
	    sendstr = "/perm "+sendstr;
	    break;
	case 2: // hidden
	    cmd = "hidden";
	    break;
	case 3: // /perm + hidden
	    sendstr = "/perm "+sendstr;
	    cmd = "hidden";
	    break;
	case 0: // default
	default:
	    break;
	}
	this.postCasterComment(sendstr,cmd);
	this._counter++;
    },

    // 指定リク番号の曲を再生する(idxは1〜).
    playMusic:function(idx){
	if(!this.iscaster) return;
	if(this.requestqueue.length<=0){
	    // リクなし.
	    clearInterval(this._musicend);
	    this.inplay = false;
	    return;
	}

	let music = this.removeRequest(idx); // obtain music information from request-queue and remove it
	if(!music) return;

	clearInterval(this._musicend);
	this.musicinfo = music;
	this.postCasterComment("/play " + this.musicinfo.video_id,""); // 再生.
	this._sendMusicInfo(); // 曲情報の送信.

	this.addPlayedList(this.musicinfo);
	NicoLiveRequest.update(this.requestqueue);

	// 再生されたストック曲はグレーにする.
	let i,item;
	for(i=0;item=this.stock[i];i++){
	    if(this.isPlayedMusic(item.video_id)){
		item.isplayed = true;
	    }
	}
	NicoLiveRequest.updateStockView(this.stock);
	this.saveToGlobalStorage();
    },

    // ストックから再生する.
    playStock:function(idx,force){
	// 再生済みのときだけfalseを返す.
	// force=trueは再生済みを無視して強制再生.
	if(!this.iscaster) return true;
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
	NicoLiveRequest.updateStockView(this.stock);
	this.saveToGlobalStorage();
    },
    topToStock:function(idx){
	idx--;
	let t;
	t = this.stock.splice(idx,1);
	if(t){
	    this.stock.unshift(t[0]);
	    NicoLiveRequest.updateStockView(this.stock);
	    this.saveToGlobalStorage();
	}
    },
    floatStock:function(idx){
	idx--; 
	if(idx<=0) return;
	let tmp = this.stock[idx-1];
	this.stock[idx-1] = this.stock[idx];
	this.stock[idx] = tmp;
	NicoLiveRequest.updateStockView(this.stock);
	this.saveToGlobalStorage();
    },
    sinkStock:function(idx){
	if(idx>=this.stock.length) return;
	idx--;
	let tmp = this.stock[idx+1];
	this.stock[idx+1] = this.stock[idx];
	this.stock[idx] = tmp;
	NicoLiveRequest.updateStockView(this.stock);
	this.saveToGlobalStorage();
    },
    sortStock:function(type,order){
	// order:1だと昇順、order:-1だと降順.
	this.stock.sort( function(a,b){
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
			     }
			     return (tmpa - tmpb) * order;
			 });
	NicoLiveRequest.updateStockView(this.stock);
	this.saveToGlobalStorage();
    },

    // 次曲を再生する.
    playNext: function(){
	let remain = 30*60 - (GetCurrentTime()-this.starttime); // second.
	let limit30min = NicoLivePreference.limit30min;
	let carelosstime = NicoLivePreference.carelosstime;

	if(this.requestqueue.length){
	    // リクエストがあればそれを優先に再生.
	    let n = 0;
	    let len = this.requestqueue.length;
	    for(let i=0;i<len;i++){
		if(this.israndomplay){
		    n = GetRandomInt(1,len);
		}else{
		    n++; // 1,2,3,...
		}
		if( limit30min ){
		    if(carelosstime &&
		       this.requestqueue[n-1].length_ms/1000 > remain+90){
			// ロスタイムを1:30(90s)として、枠に収まらない動画.
			continue;
		    }else if(this.requestqueue[n-1].length_ms/1000 > remain){
			// 30枠に収まらない動画.
			continue;
		    }
		}
		this.playMusic(n);
		return;
	    }
	}
	if(this.stock.length){
	    // リクがなければストックの先頭から再生.
	    for(let i=0,item;item=this.stock[i];i++){
		if(!this.isPlayedMusic(item.video_id)){
		    if( limit30min ){
			if(carelosstime && item.length_ms/1000 > remain+90){
			    // ロスタイムを1:30(90s)として、枠に収まらない動画.
			    continue;
			}else if(item.length_ms/1000 > remain){
			    // 30枠に収まらない動画.
			    continue;
			}
		    }
		    this.playStock(i+1,true);
		    return;
		}
	    }
	}
	// リクもストックもない.
	clearInterval(this._musicend);
	this.inplay = false;
    },
    // 自動再生設定を確認して次曲を再生する.
    checkPlayNext:function(){
	if(this.isautoplay){
	    debugprint("Auto Play Next Music");
	    this.playNext();
	}else{
	    debugprint("Non-Auto Play Next Music");
	    clearInterval(this._musicend);
	    this.inplay = false;
	}
    },

    // プレイリストに追加する.
    addPlayedList:function(item){
	this.playedlist.push(item); // 再生済みリストに登録.
	let elem = $('played-list-textbox');
	elem.value += item.video_id+" "+item.title+"\n";
	this.saveToGlobalStorage();
    },

    // プレイリストをクリアする.
    clearPlayedList:function(){
	let elem = $('played-list-textbox');
	elem.value = "";
	this.playedlist = new Array();
	for(let i=0,item;item=this.stock[i];i++){
	    item.isplayed = false;
	}
	NicoLiveRequest.updateStockView(this.stock);
	this.saveToGlobalStorage();
    },
    // リクエストを消去する.
    clearRequest:function(){
	this.requestqueue = new Array();
	NicoLiveRequest.update(this.requestqueue);
	this.saveToGlobalStorage();
    },
    // ストックを消去する.
    clearStock:function(){
	this.stock = new Array();
	NicoLiveRequest.updateStockView(this.stock);
	this.saveToGlobalStorage();
    },

    _sendMusicInfo:function(){
	// 曲情報の送信.
	clearInterval(this._sendmusicid);
	this._counter = 0;
	//this._sendmusicid = setInterval("NicoLiveHelper.sendMusicInfo();",5000);
	this._sendmusicid = setInterval("NicoLiveHelper.sendMusicInfo2();",5000);
    },

    // 2～4択のアンケートを出題.
    startVote: function(q,a1,a2,a3,a4){
	q = q || "";
	a1 = a1 || "";
	a2 = a2 || "";
	a3 = a3 || "";
	a4 = a4 || "";
	let str = "/vote start "+q+ " "+a1+" "+a2+" "+a3+" "+a4;
	this.postCasterComment(str,"");
    },
    // 集計結果を表示.
    showVoteResult: function(){
	this.postCasterComment("/vote showresult","");
    },
    // アンケートの終了.
    stopVote: function(){
	this.postCasterComment("/vote stop","");
    },

    // 主コメを投げる.
    postCasterComment: function(comment,mail){
	if(!this.iscaster) return;
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
			try{
			    video_id = comment.match(/^(sm|nm)\d+$/)[0];
			} catch (x) {
			    video_id = "";
			}
		    }
		    if(video_id){
			//debugprint(video_id+"は引用拒否動画のようです");
			NicoLiveHelper.postCasterComment(video_id+"は再生できませんでした","");
			// 曲情報の送信を止める.
			clearInterval(NicoLiveHelper._sendmusicid);
			NicoLiveHelper.checkPlayNext();
		    }
		}
	    }
	};
	let url = "http://watch.live.nicovideo.jp/api/broadcast/" + this.request_id;
	req.open('POST', url );
	req.setRequestHeader('Content-type','application/x-www-form-urlencoded');
	let data = "body=" + encodeURIComponent( comment ) + "&is184=true";
	// コマンドは mail=green%20shita と付ける.
	data += "&mail="+encodeURIComponent(mail);
	req.send(data);
    },

    // リスナーコメを送信する.
    postListenerComment: function(comment,mail){
	if(!comment) return;
	if(this.previouschat==comment){
	    debugprint("同じコメの連投はできません");
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
	    + " mail=\""+mail+" 184\""
	    + " user_id=\""+this.user_id+"\""
	    + " premium=\""+this.is_premium+"\">"
	    + htmlspecialchars(comment)
	    + "</chat>\0";
	//debugprint(str);
	this.coStream.writeString(str);
    },

    // リスナーコメント投稿用のキーを取得してからコメ送信する.
    getpostkey:function(){
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

    // 自動再生の設定をする.
    setAutoplay:function(flg){
	this.isautoplay = flg==1?true:false;
	// 自動再生オンにしたときに何も再生していなければ.
	if(!this.inplay){
	    this.playNext();
	}
	debugprint(this.isautoplay?"Autoplay":"Non-autoplay");
    },
    // ランダム再生の設定をする.
    setRandomplay:function(flg){
	this.israndomplay = flg;
    },

    // リクを受け付ける.
    setAcceptRequest:function(flg){
	this.isacceptrequest = flg;
    },

    // リクエストリストに追加する.
    addRequestQueue:function(item){
	this.requestqueue.push(item);
	NicoLiveRequest.add(item);
    },
    // リクエストリストから削除する.
    removeRequest:function(idx){
	idx--;
	let removeditem = this.requestqueue.splice(idx,1);
	debugprint("Remove request #"+idx);
	NicoLiveRequest.update(this.requestqueue);
	this.saveToGlobalStorage();
	return removeditem[0];
    },
    topToRequest:function(idx){
	idx--;
	let t;
	t = this.requestqueue.splice(idx,1);
	if(t){
	    this.requestqueue.unshift(t[0]);
	    NicoLiveRequest.update(this.requestqueue);
	    this.saveToGlobalStorage();
	}
    },
    floatRequest:function(idx){
	idx--; 
	if(idx<=0) return;
	let tmp = this.requestqueue[idx-1];
	this.requestqueue[idx-1] = this.requestqueue[idx];
	this.requestqueue[idx] = tmp;
	NicoLiveRequest.update(this.requestqueue);
	this.saveToGlobalStorage();
    },
    sinkRequest:function(idx){
	if(idx>=this.requestqueue.length) return;
	idx--;
	let tmp = this.requestqueue[idx+1];
	this.requestqueue[idx+1] = this.requestqueue[idx];
	this.requestqueue[idx] = tmp;
	NicoLiveRequest.update(this.requestqueue);
	this.saveToGlobalStorage();
    },

    // ストックリストに追加.
    addStockQueue:function(item){
	if(this.isStockedMusic(item.video_id)) return;
	this.stock.push(item);
	NicoLiveRequest.addStockView(item);
    },

    // ストック--->リクエストキュー
    addRequestFromStock:function(idx){
	if(idx>this.stock.length) return;

	idx--;
	let music = this.stock[idx];
	if(this.isRequestedMusic(music.video_id)){
	    debugalert(music.video_id+'はリクエスト済みです');
	    return;
	}
	this.addRequestQueue(music);
    },

    // リクエストリストをコンソールに表示.
    printRequestList: function(){
	let t=0;
	let i;
	let item;
	for(i=0;item=this.requestqueue[i];i++){
	    debugprint(i+1+":"+item.video_id+"/"+item.title+" ("+item.length_ms/1000 +"sec.)");
	    t += item.length_ms;
	}
	t /= 1000;
	let min,sec;
	min = parseInt(t/60);
	sec = t%60;
	debugprint("Total:"+min+"min. "+sec+"sec.");
    },

    // リクエスト曲の総再生時間を返す.
    getTotalMusicTime:function(){
	let t=0;
	let i;
	let item;
	for(i=0;item=this.requestqueue[i];i++){ t += item.length_ms; }
	t /= 1000;
	let min,sec;
	min = parseInt(t/60);
	sec = t%60;
	return {"min":min, "sec":sec};
    },
    getTotalStockTime:function(){
	let t=0;
	let i;
	let item;
	for(i=0;item=this.stock[i];i++){
	    if(!item.isplayed){
		t += item.length_ms;
	    }
	}
	t /= 1000;
	let min,sec;
	min = parseInt(t/60);
	sec = t%60;
	return {"min":min, "sec":sec};
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
	this.saveToGlobalStorage();
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
	this.saveToGlobalStorage();
    },

    // ニコニコ動画のgetthumbinfoのXMLから情報抽出.
    xmlToMovieInfo: function(xml){
	var info = {};
	try{
	    info.video_id       = xml.getElementsByTagName('video_id')[0].textContent;
	    info.title          = htmlspecialchars(xml.getElementsByTagName('title')[0].textContent);
	    info.description    = htmlspecialchars(xml.getElementsByTagName('description')[0].textContent);
	    info.thumbnail_url  = xml.getElementsByTagName('thumbnail_url')[0].textContent;
	    info.first_retrieve = xml.getElementsByTagName('first_retrieve')[0].textContent;
	    let date = info.first_retrieve.match(/\d+/g);
	    let d = new Date(date[0],date[1]-1,date[2],date[3],date[4],date[5]);
	    info.first_retrieve = d.getTime() / 1000; // integer
	    info.length         = xml.getElementsByTagName('length')[0].textContent;
	    let len = info.length.match(/\d+/g);
	    info.length_ms      = (parseInt(len[0],10)*60 + parseInt(len[1]))*1000;//integer
	    info.view_counter   = xml.getElementsByTagName('view_counter')[0].textContent;
	    info.comment_num    = xml.getElementsByTagName('comment_num')[0].textContent;
	    info.mylist_counter = xml.getElementsByTagName('mylist_counter')[0].textContent;
	    let tags            = xml.getElementsByTagName('tags')[0]; // jpのタグ
	    let tag             = tags.getElementsByTagName('tag');// DOM object
	    info.tags = new Array();
	    for(let i=0,item;item=tag[i];i++){
		info.tags[i] = item.textContent; // string
	    }
	    info.cno = 0; // comment #
	    //NicoLiveDatabase.addDatabase(info);
	} catch (x) {
	    debugprint('getthumbinfoのXML解析に失敗.');
	    info = {};
	}
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
		let ans = NicoLiveHelper.checkAcceptRequest(req.responseXML);
		switch(ans.code){
		case 0:
		case -2: // リク受けつけてない.
		case -4: // 再生済み.
		case -5: // リク済み.
		    ans.movieinfo.iscasterselection = true; // ストックは主セレ扱い.
		    if(NicoLiveHelper.isPlayedMusic(ans.movieinfo.video_id)){
			ans.movieinfo.isplayed = true;
		    }
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
    addRequest: function(sm,cno,uid){
	this.getthumbinfo(sm,cno,uid);
    },

    // 再生済みかどうか.
    isPlayedMusic:function(video_id){
	if(this.musicinfo && this.musicinfo.video_id==video_id){
	    // 現在再生している曲.
	    return true;
	}
	for(let i=0,item;item=this.playedlist[i];i++){
	    if(item.video_id==video_id){
		// 再生済みの動画.
		return true;
	    }
	}
	return false;
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
	/*
	 * sm動画ID,cnoコメ番
	 * cnoが0のときは、リクエストじゃないとき.
	 * useridが"0"のときは自張り. 
	 */
	if(sm.length<3) return;

	var req = new XMLHttpRequest();
	if( !req ) return;

	req.comment_no = cno;
	req.video_id = sm;
	req.user_id  = userid;
	req.onreadystatechange = function(){
	    if( req.readyState==4 && req.status==200 ){
		// リクのあった動画をチェック.
		let ans = NicoLiveHelper.checkAcceptRequest(req.responseXML);
		ans.movieinfo.iscasterselection = req.comment_no==0?true:false; // 主セレ
		ans.movieinfo.selfrequest = req.user_id=="0"?true:false;

		// リクエスト制限数をチェック.
		let nlim = NicoLivePreference.nreq_per_ppl;
		if(!NicoLiveHelper.request_per_ppl[req.user_id]){
		    NicoLiveHelper.request_per_ppl[req.user_id] = 0;
		}
		if( ans.code==0 && req.user_id!="0"){
		    // 自張りはカウントしない.
		    NicoLiveHelper.request_per_ppl[req.user_id]++;
		}
		let n = NicoLiveHelper.request_per_ppl[req.user_id];
		if(ans.code==0 && n>nlim && nlim>0){
		    NicoLiveHelper.request_per_ppl[req.user_id]--;
		    ans.msg = "リクエストは1人"+NicoLivePreference.nreq_per_ppl+"件までです";
		    ans.code = -1;
		}
		if(NicoLivePreference.isautoreply && ans.msg && req.comment_no!=0){
		    // 返答メッセージが指定してあれば.
		    let msg = ">>"+req.comment_no+" " + ans.msg;
		    NicoLiveHelper.postCasterComment(msg,"");
		}

		switch(ans.code){
		case 0:
		    ans.movieinfo.cno = req.comment_no;
		    NicoLiveHelper.addRequestQueue(ans.movieinfo);
		    if(NicoLiveHelper.iscaster &&
		       NicoLiveHelper.isautoplay &&
		       !NicoLiveHelper.inplay &&
		       NicoLiveHelper.requestqueue.length==1){
			// 自動再生かつ、何も再生していないかつ、キューに1つしかないときは即再生.
			NicoLiveHelper.playNext();
		    }
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

    // コメントサーバからやってくる行を処理する.
    processLine: function(line){
	//debugprint(line);
/*
	if(line.match(/<chat.*?>.*<\/chat>/)){
	    //debugprint(line);
	    let parser = new DOMParser();
	    let dom = parser.parseFromString(line,"text/xml");
	    this.processComment(dom.getElementsByTagName('chat')[0]);
	    return;
	}
*/
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
    connectCommentServer: function(server,port,thread){
	//<thread thread="1005799549" res_from="-50" version="20061206"/>
	var socketTransportService = Components.classes["@mozilla.org/network/socket-transport-service;1"].getService(Components.interfaces.nsISocketTransportService);
	var socket = socketTransportService.createTransport(null,0,server,port,null);
	var iStream = socket.openInputStream(0,0,0);
	this.connecttime = new Date();
	this.connecttime = this.connecttime.getTime()/1000; // convert to second.

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
		    this.line += lineData.value;
		    if( lineData.value=="\0" ){
			NicoLiveHelper.processLine(this.line);
			    this.line = "";
		    }
		}
	    }
	};

	let str = "<thread thread=\""+thread+"\" res_from=\"-50\" version=\"20061206\"/>\0";
	this.coStream.writeString(str);
	this.pump.asyncRead(dataListener,null);

	// 30分に1回送ってればいいのかね.
	this._keepconnection = setInterval("NicoLiveHelper.keepConnection();",1000*60*30);
	this._updateprogressid = setInterval("NicoLiveHelper.updateProgressBar();",1000);
	this.heartbeat();
	this._heartbeat = setInterval("NicoLiveHelper.heartbeat();",1*60*1000);

	this.playJingle();

	let prefs = NicoLivePreference.getBranch();
	if(prefs.getBoolPref("savecomment")){
	    NicoLiveComment.openFile(this.request_id);
	}
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
	    clearInterval(this._musicend);
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

    // 現在の再生曲の再生時間と、生放送の経過時間をプログレスバーで表示.
    updateProgressBar:function(){
	let currentmusic = $('statusbar-currentmusic');
	let playprogress = $('statusbar-music-progressmeter');
	let musictime = $('statusbar-music-name');
	let progress,progressbar;
	let str;
	let liveprogress = $('statusbar-live-progress');
	let p = GetCurrentTime() - this.starttime;
	let n = Math.floor(p / (30*60));
	liveprogress.label = GetTimeString(p);

	// 27分+30*n(n=0,1,2,...)越えたら
	if( n>=0 && p > 27*60 + 30*60*n ){
	    if(!this.isnotified[n]){
		$('noticewin').removeAllNotifications(false);
		$('noticewin').appendNotification('枠残り3分です',null,null,
						  $('noticewin').PRIORITY_WARNING_LOW,null);
		this.isnotified[n] = true;
	    }
	}

	if(!this.musicinfo.length_ms){ currentmusic.setAttribute("tooltiptext",""); return; }

	str = "投稿日/"+GetDateString(this.musicinfo.first_retrieve*1000)
	    + " 再生数/"+this.musicinfo.view_counter
	    + " コメント/"+this.musicinfo.comment_num
	    + " マイリスト/"+this.musicinfo.mylist_counter+"\n"
	    + "タグ/"+this.musicinfo.tags.join(',');
	currentmusic.setAttribute("tooltiptext",str);

	progress = GetCurrentTime()-this.musicstarttime;
	progressbar = Math.floor(progress / (this.musicinfo.length_ms/1000) * 100);
	if(this.inplay){
	    playprogress.value = progressbar;
	    let remain = this.musicinfo.length_ms/1000 - progress; if(remain<0){ remain = 0; }
	    str = this.musicinfo.title+"("+GetTimeString(remain)+"/"+this.musicinfo.length+")";
	    musictime.label = str;
	}else{
	    playprogress.value = 0;
	    musictime.label = "";
	}
    },

    // getplayerstatus APIから生放送情報を取得する.
    getplayerstatus: function(req_id){
	var req = new XMLHttpRequest();
	if(!req) return;
	req.onreadystatechange = function(){
	    if( req.readyState!=4 || req.status!=200 ) return;
	    let xml = req.responseXML;

	    if( xml.getElementsByTagName('code').length ){
		alert( xml.getElementsByTagName('code')[0].textContent );
		return;
	    }
	    try {
		NicoLiveHelper.user_id  = xml.getElementsByTagName('user_id')[0].textContent;
		NicoLiveHelper.is_premium = xml.getElementsByTagName('is_premium')[0].textContent;
		NicoLiveHelper.addr = xml.getElementsByTagName('addr')[0].textContent;
		NicoLiveHelper.port = xml.getElementsByTagName('port')[0].textContent;
		NicoLiveHelper.thread = xml.getElementsByTagName('thread')[0].textContent;
		NicoLiveHelper.iscaster = parseInt(xml.getElementsByTagName('room_seetno')[0].textContent);
		NicoLiveHelper.starttime = parseInt(xml.getElementsByTagName('start_time')[0].textContent);
		NicoLiveHelper.opentime = parseInt(xml.getElementsByTagName('open_time')[0].textContent);
		// 座席番号777が主らしい.
		if( NicoLiveHelper.iscaster==777 ){
		    NicoLiveHelper.iscaster=true;
		    debugprint('You are a caster');
		    NicoLiveHelper.playedlist     =Application.storage.get("nico_live_playedlist",[]);
		    NicoLiveHelper.requestqueue   =Application.storage.get("nico_live_requestlist",[]);
		    $('played-list-textbox').value=Application.storage.get("nico_live_requestlist_txt","");
		    NicoLiveRequest.update(NicoLiveHelper.requestqueue);
		}else{
		    NicoLiveHelper.iscaster = false;
		    debugprint('You are not a caster');
		}

		// 現在再生している動画を調べる.
		let currentplay = xml.getElementsByTagName('contents')[0];
		if(currentplay){
		    let st = currentplay.attributes.getNamedItem('start_time'); // 再生開始時刻.
		    let du = currentplay.attributes.getNamedItem('duration');   // 動画の長さ.
		    st = st && parseInt(st.nodeValue) || 0;
		    du = du && parseInt(du.nodeValue) || 0;
		    if(du){
			// 動画の長さが設定されているときは何か再生中.
			let remain;
			remain = (st+du)-GetCurrentTime(); // second.
			remain *= 1000; // to ms.
			remain = Math.floor(remain);
			if( NicoLiveHelper.iscaster ){
			    // 生主モードなら次曲再生できるようにセット.
			    NicoLiveHelper.setupPlayNextMusic(remain);
			}

			// プログレスバー用に情報をセット.
			let tmp = currentplay.textContent.match(/(sm|nm|ze)\d+/);
			if(tmp){
			    NicoLiveHelper.musicstarttime  = st;
			    NicoLiveHelper.setCurrentVideoInfo(tmp[0]);
			    NicoLiveHelper.inplay = true;
			}
		    }
		}

		debugprint("addr:"+NicoLiveHelper.addr);
		debugprint("port:"+NicoLiveHelper.port);
		debugprint("thread:"+NicoLiveHelper.thread);
		NicoLiveHelper.connectCommentServer(NicoLiveHelper.addr,NicoLiveHelper.port,NicoLiveHelper.thread);
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
	clearInterval(this._musicend);
	clearInterval(this._prepare);
	let interval = parseInt(NicoLivePreference.nextplay_interval*1000);
	let maxplay  = parseInt(NicoLivePreference.max_movieplay_time*60*1000);
	if( maxplay>0 && du > maxplay ){
	    du = maxplay;
	}
	this._musicend = setInterval("NicoLiveHelper.checkPlayNext();", du+interval);
	this._prepare = setInterval(
	    function(){
		clearInterval(NicoLiveHelper._prepare);
		if(!NicoLiveHelper.israndomplay && NicoLiveHelper.isautoplay){
		    // 自動順次再生のときは次の再生曲が予測できるので準備する.
		    // ただし30枠収める指定は加味しない.
		    if(NicoLiveHelper.requestqueue.length){
			NicoLiveHelper.postCasterComment("/prepare "+NicoLiveHelper.requestqueue[0].video_id,"");
		    }else if(NicoLiveHelper.stock.length){
			for(let i=0,item;item=NicoLiveHelper.stock[i];i++){
			    if(!NicoLiveHelper.isPlayedMusic(item.video_id)){
				NicoLiveHelper.postCasterComment("/prepare "+NicoLiveHelper.stock[i].video_id,"");
				break;
			    }
			}
		    }
		}
	    }, parseInt((du+interval)/4*3) );
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
		    $('statusbar-n-of-listeners').label = "来場者数 "+watcher;
		} catch (x) {

		}
	    }
	};
	req.open('POST',url);
	req.setRequestHeader('Content-type','application/x-www-form-urlencoded');
	let data = "v="+this.request_id;
	req.send(data);
    },

    // ジングルを再生する.
    playJingle:function(){
	// コメントサーバ接続時、
	// 放送開始から3分未満、
	// 何も再生していないときに、ジングルを再生開始する.
	if( !NicoLivePreference.isjingle ) return;
	if( GetCurrentTime()-this.starttime < 180 ){
	    if( !this.inplay ){
		let jingle = NicoLivePreference.jinglemovie;
		let timerid = setInterval( function(){
					       NicoLiveHelper.postCasterComment("/play "+jingle);
					       NicoLiveHelper._sendMusicInfo();
					       clearInterval(timerid);
					   }, 5000);
	    }
	}
    },

    start: function(request_id){
	this.request_id = request_id;
	debugprint("starting nicolive " + request_id);
	this.getplayerstatus(request_id);
    },

    // グローバルストレージに引き継ぎ情報をセット.
    saveToGlobalStorage:function(){
	// ストックだけは主じゃなくても保存する.
	Application.storage.set("nico_live_stock",this.stock);

	if(!this.iscaster){ return; }
	Application.storage.set("nico_live_playedlist",this.playedlist);
	Application.storage.set("nico_live_requestlist",this.requestqueue);
	Application.storage.set("nico_live_requestlist_txt",$('played-list-textbox').value);
    },

    resetRequestCount:function(){
	// リクエストカウントのリセット.
	this.request_per_ppl = new Object();
    },

    init: function(){
	debugprint('Initialized NicoLive Helper');
	let request_id = Application.storage.get("nico_request_id","lv0");
	let title      = Application.storage.get("nico_live_title","");

	debugprint(request_id);
	this.requestqueue = new Array();
	this.playedlist   = new Array();
	this.stock        = new Array();
	this.isnotified   = new Array(); // 残り3分通知を出したかどうかのフラグ.
	this.musicinfo    = {};
	this.request_per_ppl = new Object(); // 1人あたりのリクエスト受け付け数ワーク.

	this.stock = Application.storage.get("nico_live_stock",[]);
	debugprint("stock "+this.stock.length);

	if(request_id!="lv0"){
	    document.title = request_id+":"+title+" (NicoLive Helper)";
	    this.start(request_id);
	}
    },
    destroy: function(){
	debugprint("Destroy NicoLive Helper");
	this.saveToGlobalStorage();
	this.close();
    }
};

window.addEventListener("load", function(e){ NicoLiveHelper.init(); }, false);
window.addEventListener("unload", function(e){ NicoLiveHelper.destroy(); }, false);
