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

/**
 * ニコニコ生放送ヘルパー for Firefox 3.6
 */
// Firefox 3.5 でなぜか読めない
Components.utils.import("resource://nicolivehelpermodules/usernamecache.jsm");


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
    iscaster: true,      // 自分が生主かどうか

    community_id: "co0", // コミュニティID
    request_id: "lv0",   // 放送ID (lv0 はoffline)
    title: "",           // 放送タイトル
    owner_name: "",      // 放送主の名前
    token: "",           // 運営コメントトークン
    _exclude:0,          // 配信ステータス(1:未配信 0:配信中)

    opentime: 0,         // 開場時刻
    starttime: 0,        // 開演時刻
    endtime: 0,          // 閉場時刻
    serverconnecttime:0, // 接続時刻(サーバーの時刻)
    connecttime:0,       // 接続時刻(クライアントの時刻)
    last_res:0,          // 最後に受信したコメント番号

    ciStream: null,      // コメントサーバーからの入力ストリーム
    coStream: null,      // コメントサーバーへの出力ストリーム

    user_info:{
	user_id: "",       // 自分のID
	user_name: "",     // 自分の名前
	is_premium: false  // プレミアムか否か
    },
    connection_info: {   // コメントサーバーへの接続情報
	addr: "",
	port: 0,
	thread: ""
    },
    twitterinfo: {},     // Nico Twitter APIへのアクセス情報



    // コメを処理する(各種追加機能の古いバージョンでのフック用).
    processComment: function(xmlchat){},

    // コメント処理のフック用(新)
    processCommentHook:function(chat){
	// chat.isNGWord に NG判定が入っている.
    },

    // コメントを処理する(新).
    processComment2: function(chat){
	NicoLiveHelper.processCommentHook(chat);
    },

    /**
     * コメントを展開する.
     */
    extractComment: function(xmlchat){
	let chat = new Object();
	chat.text      = xmlchat.textContent;
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

    /**
     * コメントサーバーから送られてきたテキスト1行を処理する
     */
    processLine: function( line ){
	debugprint(line);
	if(line.match(/^<chat\s+.*>/)){
	    let parser = new DOMParser();
	    let dom = parser.parseFromString(line,"text/xml");
	    let elem = dom.getElementsByTagName('chat')[0];
	    let chat = this.extractComment( elem );
	    this.processComment( elem ); // this line is used for old-version of additional-extensions.
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

		break;
	    case 1: // リスナーコメ投稿規制.
		//ShowNotice(LoadString('STR_FAILED_TO_COMMENT_BY_CONTROL'));
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
	    ShowNotice("コメントサーバに接続しました");
	}

	dat = line.match(/<thread.*last_res=\"([0-9a-fA-Fx]*)\".*\/>/);
	if(dat){
	    this.last_res = parseInt(dat[1]);
	    debugprint('last_res='+this.last_res);
	}
    },

    /**
     * 通信を切断する
     */
    closeConnection: function(){
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
	this.connecttime = this.connecttime.getTime()/1000; // convert to second since the epoc.

	let dataListener = {
	    line: "",
	    onStartRequest: function(request, context){},
	    onStopRequest: function(request, context, status){
		try{
		    // コメントサーバーから切断されました。
		    debugprint("コメントサーバーから切断されました。");
		    NicoLiveHelper.closeConnection();
		} catch (x) {
		}
	    },
	    onDataAvailable: function(request, context, inputStream, offset, count) {
		let lineData = {};
		let r;
		while(1){
		    // まとめて読むと行単位の区切り付けるのメンドイので1文字ずつ読む.
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

	debugprint('Server clock:'+GetDateString(this.serverconnecttime*1000));
	debugprint('PC clock:'+GetDateString(this.connecttime*1000));
	this.connecttime = this.serverconnecttime;
    },

    /**
     * コメントサーバーに接続する前の一仕事
     */
    preprocessConnectServer: function(){
	if( this.iscaster ){
	    let f = function(xml){
		let publishstatus = xml;
		NicoLiveHelper.token = publishstatus.getElementsByTagName('token')[0].textContent;
		NicoLiveHelper.starttime = parseInt(publishstatus.getElementsByTagName('start_time')[0].textContent);
		let tmp = parseInt(publishstatus.getElementsByTagName('end_time')[0].textContent);
		if( GetCurrentTime() <= tmp ){
		    // 取得した終了時刻がより現在より未来指していたら更新.
		    NicoLiveHelper.endtime = tmp;
		}else{
		    // ロスタイム突入
		}
		NicoLiveHelper._exclude = parseInt(publishstatus.getElementsByTagName('exclude')[0].textContent);
		debugprint('token='+NicoLiveHelper.token);
		debugprint('starttime='+NicoLiveHelper.starttime);
		debugprint('endtime='+NicoLiveHelper.endtime);
		debugprint('exclude='+NicoLiveHelper._exclude);
		
		NicoLiveHelper.connectCommentServer(
		    NicoLiveHelper.connection_info.addr,
		    NicoLiveHelper.connection_info.port,
		    NicoLiveHelper.connection_info.thread
		);
	    };
	    NicoApi.getpublishstatus( NicoLiveHelper.request_id, f );
	}else{
	    NicoLiveHelper.connectCommentServer(
		NicoLiveHelper.connection_info.addr,
		NicoLiveHelper.connection_info.port,
		NicoLiveHelper.connection_info.thread
	    );
	}
    },

    /**
     * 生放送に接続する
     */
    connectLive: function( request_id ){
	let f = function(xml){
	    if( xml==null || xml.getElementsByTagName('code').length ){
		debugalert("番組情報を取得できませんでした. CODE="+ xml.getElementsByTagName('code')[0].textContent );
		return;
	    }
	    try {
		NicoLiveHelper.request_id = xml.getElementsByTagName('id')[0].textContent;
		NicoLiveHelper.owner_name = xml.getElementsByTagName('owner_name')[0].textContent;
		if( !NicoLiveHelper.title ){
		    NicoLiveHelper.title  = xml.getElementsByTagName('title')[0].textContent;
		}
		NicoLiveHelper.user_info.user_id    = xml.getElementsByTagName('user_id')[0].textContent;
		NicoLiveHelper.user_info.user_name  = xml.getElementsByTagName('nickname')[0].textContent;
		NicoLiveHelper.user_info.is_premium = xml.getElementsByTagName('is_premium')[0].textContent;

		NicoLiveHelper.connection_info.addr   = xml.getElementsByTagName('addr')[0].textContent;
		NicoLiveHelper.connection_info.port   = xml.getElementsByTagName('port')[0].textContent;
		NicoLiveHelper.connection_info.thread = xml.getElementsByTagName('thread')[0].textContent;

		NicoLiveHelper.iscaster   = xml.getElementsByTagName('is_owner')[0].textContent;
		NicoLiveHelper.opentime   = parseInt(xml.getElementsByTagName('open_time')[0].textContent); // 開場時刻.
		NicoLiveHelper.starttime  = parseInt(xml.getElementsByTagName('start_time')[0].textContent);// 開演時刻.
		NicoLiveHelper.endtime    = parseInt(xml.getElementsByTagName('end_time')[0].textContent); // 閉場時刻.
		NicoLiveHelper.community_id = xml.getElementsByTagName('default_community')[0].textContent;

		if( NicoLiveHelper.iscaster!="0" ){
		    NicoLiveHelper.iscaster=true;
		    debugprint('あなたは生放送主です');
		    //HttpObserver.init();
		}else{
		    NicoLiveHelper.iscaster = false;
		    debugprint('あなたは視聴者です');
		}

		// 現在再生している動画を調べる.
		// mainとsubの両方でsm/nm動画を再生しているときは、mainを優先させる.
		let contents = xml.getElementsByTagName('contents');
		for(let i=0,currentplay;currentplay=contents[i];i++){
		    let st = currentplay.getAttribute('start_time'); // 再生開始時刻
		    let du = currentplay.getAttribute('duration');   // 動画の長さ
		    st = st && parseInt(st) || 0;
		    du = du && parseInt(du) || 0;
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
			break;
		    }
		}
		// サーバ時刻を調べる.
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

		debugprint("addr:"+NicoLiveHelper.connection_info.addr);
		debugprint("port:"+NicoLiveHelper.connection_info.port);
		debugprint("thread:"+NicoLiveHelper.connection_info.thread);

		NicoLiveHelper.preprocessConnectServer();
	    } catch (x) {
		debugalert('コメントサーバに接続中、エラーが発生しました. '+x);
	    }
	};

	// getplayerstatus
	NicoApi.getplayerstatus( request_id, f );
    },

    /**
     * 保存してあるリクエスト、ストック、再生履歴の復元
     */
    restoreData: function(){

    },

    isOffline: function(){
	return this.request_id=="lv0";
    },

    init: function(){
	debugprint('Initializing NicoLive Helper...');

	let request_id, title, iscaster, community_id;
	try{
	    // XULRunnerではここからコマンドライン引数を取る
	    // window.arguments[0].getArgument(0);
	    if( RUN_ON_FIREFOX ){
		this.request_id = window.arguments[0];
		this.title      = window.arguments[1];
		this.iscaster   = window.arguments[2];
		this.community_id = window.arguments[3];
		if( request_id==null || title==null || iscaster==null ){
		    request_id = "lv0";
		    title = "";
		    iscaster = true;
		}
	    }else{
		this.request_id = window.arguments[0].getArgument(0) || "lv0";
		this.title      = "";
		this.iscaster   = true;
		this.community_id = "";
	    }
	} catch (x) {
	    this.request_id = Application.storage.get("nico_request_id","lv0");
	    this.title      = Application.storage.get("nico_live_title","");
	    this.iscaster   = Application.storage.get("nico_live_caster",true);
	    this.community_id = Application.storage.get("nico_live_coid","co0");
	}

	debugprint("request id:"+this.request_id);
	debugprint("title:"+this.title);
	debugprint("iscaster:"+this.iscaster);
	debugprint("community id:"+this.community_id);

	if( this.isOffline() ){
	    this.restoreData();
	}else{
	    this.connectLive( this.request_id );
	}

    },

    destroy: function(){
	this.closeConnection();
    }
};

window.addEventListener("load", function(e){ NicoLiveHelper.init(); }, false);
window.addEventListener("unload", function(e){ NicoLiveHelper.destroy(); }, false);
