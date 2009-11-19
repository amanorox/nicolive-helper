
var NicoLiveMylist = {

    addDeflist2:function(video_id, item_id, token){
	// 二段階目は取得したトークンを使ってマイリス登録をする.
	var url = "http://www.nicovideo.jp/api/deflist/add";
	var reqstr = [];
	reqstr[0] = "item_id="+encodeURIComponent(item_id);
	reqstr[1] = "token="+encodeURIComponent(token);

	var xmlhttp = new XMLHttpRequest();
	if(!xmlhttp) return;

	xmlhttp.onreadystatechange = function(){
	    if( xmlhttp.readyState==4 && xmlhttp.status==200 ){
		let result = JSON.parse(xmlhttp.responseText);
		switch(result.status){
		case 'ok':
		    break;
		case 'fail':
		    debugalert('マイリスト:'+result.error.description);
		    break;
		default:
		    break;
		}
	    }
	};
	xmlhttp.open('POST', url );
	xmlhttp.setRequestHeader('Content-type','application/x-www-form-urlencoded');
	xmlhttp.send(reqstr.join('&'));
    },
    addDeflist:function(video_id){
	// 一段階目はトークンを取得する.
	var url = "http://www.nicovideo.jp/watch/"+video_id;
	var xmlhttp = new XMLHttpRequest();
	if( !xmlhttp ) return;
	xmlhttp.onreadystatechange = function(){
	    if(xmlhttp.readyState==4 && xmlhttp.status==200){
		try{
		    var tmp = xmlhttp.responseText.match(/onclick="addVideoToDeflist\(([0-9]+), '([^']+)'\);/);
		    var item_id = tmp[1];
		    var token = tmp[2];
		    NicoLiveMylist.addDeflist2(video_id, item_id, token);
		} catch (x) {
		    debugalert('マイリスト登録に失敗しました');
		}
	    }
	};
	xmlhttp.open('GET', url );
	xmlhttp.send('');
    },

    addMyList2:function(item_id,mylist_id,token){
	// 二段階目は取得したトークンを使ってマイリス登録をする.
	let url = "http://www.nicovideo.jp/api/mylist/add";
	let reqstr = [];
	reqstr[0] = "group_id="+encodeURIComponent(mylist_id);
	reqstr[1] = "item_type=0"; // 0 means video.
	reqstr[2] = "item_id="+encodeURIComponent(item_id);
	reqstr[3] = "description=";
	reqstr[4] = "token="+encodeURIComponent(token);

	let req = new XMLHttpRequest();
	if( !req ) return;
	req.onreadystatechange = function(){
	    if( req.readyState==4 && req.status==200 ){
		let result = JSON.parse(req.responseText);
		switch(result.status){
		case 'ok':
		    break;
		case 'fail':
		    debugalert('マイリスト:'+result.error.description);
		    break;
		default:
		    break;
		}
	    }
	};
	req.open('POST', url );
	req.setRequestHeader('Content-type','application/x-www-form-urlencoded');
	req.send(reqstr.join('&'));
    },

    _addMyList:function(mylist_id,mylist_name,video_id){
	try{
	    if( mylist_id=='default' ){
		this.addDeflist(video_id);
		return;
	    }
	    // 一段階目はトークンを取得する.
	    let url = "http://www.nicovideo.jp/mylist_add/video/"+video_id;
	    let req = new XMLHttpRequest();
	    if( !req ) return;
	    req.onreadystatechange = function(){
		if( req.readyState==4 && req.status==200 ){
		    try{
			let token = req.responseText.match(/NicoAPI\.token\s*=\s*\"(.*)\";/);
			let item_id = req.responseText.match(/item_id\"\s*value=\"(.*)\">/);
			debugprint('token='+token[1]);
			debugprint('item_id='+item_id[1]);
			NicoLiveMylist.addMyList2(item_id[1],mylist_id,token[1]);
		    } catch (x) {
			debugalert('マイリスト登録に失敗しました');
		    }
		}
	    };
	    req.open('GET', url );
	    req.send('');
	    debugprint('add to mylist:'+video_id+'->'+mylist_name);
	} catch (x) {
	    debugalert('マイリスト登録に失敗しました');
	}
    },

    addMyList:function(mylist_id,mylist_name){
	let video_id = NicoLiveHelper.musicinfo.video_id;
	this._addMyList(mylist_id,mylist_name,video_id);
    },

    addStockFromMylist:function(mylist_id,mylist_name){
	let url = "http://www.nicovideo.jp/mylist/" + mylist_id + "?rss=2.0";
	let req = new XMLHttpRequest();
	if(!req) return;
	req.onreadystatechange = function(){
	    if( req.readyState==4 && req.status==200 ){
		let xml = req.responseXML;
		let link = xml.getElementsByTagName('link');
		let videos = new Array();
		for(let i=0,item;item=link[i];i++){
		    let video_id = item.textContent.match(/(sm|nm)\d+/);
		    if(video_id){
			//debugprint('mylist:'+video_id[0]);
			videos.push(video_id[0]);
		    }
		}
		NicoLiveRequest.addStock(videos.join(','));
	    }
	};
	req.open('GET', url );
	req.send('');
    },
    // 似たようなコード整理したいなー.
    addDatabase:function(mylist_id,mylist_name){
	let url = "http://www.nicovideo.jp/mylist/" + mylist_id + "?rss=2.0";
	let req = new XMLHttpRequest();
	if(!req) return;
	req.onreadystatechange = function(){
	    if( req.readyState==4 && req.status==200 ){
		let xml = req.responseXML;
		let link = xml.getElementsByTagName('link');
		let videos = new Array();
		for(let i=0,item;item=link[i];i++){
		    let video_id = item.textContent.match(/(sm|nm)\d+/);
		    if(video_id){
			//debugprint('mylist:'+video_id[0]);
			videos.push(video_id[0]);
		    }
		}
		NicoLiveDatabase.addVideos(videos.join(','));
	    }
	};
	req.open('GET', url );
	req.send('');
    },
    init:function(){
	debugprint("NicoLiveMylist.init");
	this.mylists = new Array();

	let req = new XMLHttpRequest();
	if(!req) return;
	req.onreadystatechange = function(){
	    if( req.readyState==4 && req.status==200 ){
		NicoLiveMylist.mylists = JSON.parse(req.responseText);

		if( NicoLiveMylist.mylists.status=='fail'){
		    debugalert('マイリスト:'+NicoLiveMylist.mylists.error.description);
		    return;
		}

		let mylists = NicoLiveMylist.mylists.mylistgroup;

		NicoLiveHistory.appendMenu(mylists);

		let elem = CreateMenuItem('とりあえずマイリスト','default');
		elem.addEventListener("command", function(e){ NicoLiveMylist.addMyList(e.target.value,e.target.label); },false );
		$('popup-mylists').appendChild(elem);

		for(let i=0,item;item=mylists[i];i++){
		    // マイリストに追加.
		    let elem = CreateMenuItem(item.name,item.id);
		    elem.addEventListener("command", function(e){ NicoLiveMylist.addMyList(e.target.value,e.target.label); },false );
		    $('popup-mylists').appendChild(elem);

		    // マイリスト読み込み(stock)
		    elem = CreateMenuItem(item.name,item.id);
		    elem.addEventListener("command",function(e){ NicoLiveMylist.addStockFromMylist(e.target.value,e.target.label); },false);
		    $('menupopup-from-mylist').appendChild(elem);

		    // マイリスト読み込み(db)
		    elem = CreateMenuItem(item.name,item.id);
		    elem.addEventListener("command",function(e){ NicoLiveMylist.addDatabase(e.target.value,e.target.label);},false);
		    $('menupopup-from-mylist-to-db').appendChild(elem);
		}
	    }
	};
	let url = "http://www.nicovideo.jp/api/mylistgroup/list";
	req.open('GET',url);
	req.channel.loadFlags |= Components.interfaces.nsIRequest.LOAD_BYPASS_CACHE;
	req.send('');
    }
};

window.addEventListener("load", function(){ NicoLiveMylist.init(); }, false);
