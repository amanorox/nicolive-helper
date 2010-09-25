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

var NicoLiveMylist = {
    tweet:function(video_id, additional_msg){
	let video = NicoLiveHelper.findVideoInfo(video_id);
	if( video==null ) return;

	if( NicoLivePreference.twitter.when_addmylist ){
	    NicoLiveTweet.tweet(additional_msg+" 【マイリスト】"+video.title+" http://nico.ms/"+video.video_id+" #"+video.video_id);
	}
    },

    // マイリストコメントのデフォルトを取得.
    getDefaultMylistComment:function(){
	let msg = "";
	try{
	    let lvid = NicoLiveHelper.request_id;
	    let coid = NicoLiveHelper.community;
	    let title = NicoLiveHelper.title;
	    msg = ""+coid+" "+title+" "+lvid+" から登録\n";
	    if( lvid=="lv0" ){
		msg = "";
	    }
	} catch (x) {
	    msg = "";
	}
	return msg;
    },

    addDeflist2:function(video_id, item_id, token, additional_msg){
	// 二段階目は取得したトークンを使ってマイリス登録をする.
	var url = "http://www.nicovideo.jp/api/deflist/add";
	var reqstr = [];
	reqstr[0] = "item_id="+encodeURIComponent(item_id);
	reqstr[1] = "description="+encodeURIComponent(additional_msg);
	reqstr[2] = "token="+encodeURIComponent(token);

	var xmlhttp = new XMLHttpRequest();
	if(!xmlhttp) return;

	xmlhttp.onreadystatechange = function(){
	    if( xmlhttp.readyState==4 && xmlhttp.status==200 ){
		let result = JSON.parse(xmlhttp.responseText);
		switch(result.status){
		case 'ok':
		    NicoLiveMylist.tweet(video_id, additional_msg);
		    break;
		case 'fail':
		    ShowNotice(LoadString('STR_ERR_MYLIST_HEADER')+result.error.description);
		    break;
		default:
		    break;
		}
	    }
	};
	xmlhttp.open('POST', url );
	xmlhttp.setRequestHeader('User-Agent',NicoLiveHelper._useragent);
	xmlhttp.setRequestHeader('Content-type','application/x-www-form-urlencoded');
	xmlhttp.send(reqstr.join('&'));
    },
    addDeflist:function(video_id, additional_msg){
	// 一段階目はトークンを取得する.
	if( !video_id ) return;
	var url = "http://www.nicovideo.jp/watch/"+video_id;
	var xmlhttp = new XMLHttpRequest();
	if( !xmlhttp ) return;
	xmlhttp.onreadystatechange = function(){
	    if(xmlhttp.readyState==4 && xmlhttp.status==200){
		try{
		    var tmp = xmlhttp.responseText.match(/onclick="addVideoToDeflist\(([0-9]+), '([^']+)'\);/);
		    var item_id = tmp[1];
		    var token = tmp[2];
		    NicoLiveMylist.addDeflist2(video_id, item_id, token, additional_msg);
		} catch (x) {
		    ShowNotice(LoadString('STR_FAILED_ADDMYLIST'));
		}
	    }
	};
	xmlhttp.open('GET', url );
	xmlhttp.setRequestHeader('User-Agent',NicoLiveHelper._useragent);
	xmlhttp.send('');
    },

    addMyList2:function(item_id,mylist_id,token,video_id, additional_msg){
	// 二段階目は取得したトークンを使ってマイリス登録をする.
	let url = "http://www.nicovideo.jp/api/mylist/add";
	let reqstr = [];
	reqstr[0] = "group_id="+encodeURIComponent(mylist_id);
	reqstr[1] = "item_type=0"; // 0 means video.
	reqstr[2] = "item_id="+encodeURIComponent(item_id);
	reqstr[3] = "description="+encodeURIComponent(additional_msg);
	reqstr[4] = "token="+encodeURIComponent(token);

	let req = new XMLHttpRequest();
	if( !req ) return;
	req.onreadystatechange = function(){
	    if( req.readyState==4 && req.status==200 ){
		let result = JSON.parse(req.responseText);
		switch(result.status){
		case 'ok':
		    NicoLiveMylist.tweet(video_id, additional_msg);
		    break;
		case 'fail':
		    ShowNotice(LoadString('STR_ERR_MYLIST_HEADER')+result.error.description);
		    break;
		default:
		    break;
		}
	    }
	};
	req.open('POST', url );
	req.setRequestHeader('User-Agent',NicoLiveHelper._useragent);
	req.setRequestHeader('Content-type','application/x-www-form-urlencoded');
	req.send(reqstr.join('&'));
    },

    // マイリストID、マイリスト名、動画IDを渡すと、対象のマイリスに動画を登録する.
    // mylist_id が default のときはとりマイ.
    _addMyList:function(mylist_id,mylist_name,video_id, ev){
	try{
	    let additional_msg = this.getDefaultMylistComment();
	    if( ev.ctrlKey ){
		additional_msg = InputPrompt("マイリストコメントを入力してください","マイリストコメント入力",additional_msg);
		if( additional_msg==null ) additional_msg = "";
	    }

	    if( mylist_id=='default' ){
		this.addDeflist(video_id, additional_msg);
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
			NicoLiveMylist.addMyList2(item_id[1],mylist_id,token[1],video_id, additional_msg);
		    } catch (x) {
			ShowNotice(LoadString('STR_FAILED_ADDMYLIST'));
		    }
		}
	    };
	    req.open('GET', url );
	    req.setRequestHeader('User-Agent',NicoLiveHelper._useragent);
	    req.send('');
	    debugprint('add to mylist:'+video_id+'->'+mylist_name);
	} catch (x) {
	    ShowNotice(LoadString('STR_FAILED_ADDMYLIST'));
	}
    },

    // ステータスバーから、現在再生中の動画をマイリストする.
    addMyList:function(mylist_id,mylist_name,ev){
	let video_id = NicoLiveHelper.musicinfo.video_id;
	this._addMyList(mylist_id,mylist_name,video_id, ev);
    },

    addStockFromMylistWithComment:function(mylist_id,mylist_name){
	let url = "http://www.nicovideo.jp/mylist/" + mylist_id + "?rss=2.0";
	let req = new XMLHttpRequest();
	if(!req) return;
	req.onreadystatechange = function(){
	    if( req.readyState==4 && req.status==200 ){
		let xml = req.responseXML;
		let items = xml.getElementsByTagName('item');
		let videos = new Array();
		debugprint('mylist rss items:'+items.length);
		for(let i=0,item;item=items[i];i++){
		    let video_id;
		    let description;
		    try{
			video_id = item.getElementsByTagName('link')[0].textContent.match(/(sm|nm)\d+/);
		    } catch (x) {
			video_id = "";
		    }
		    if(video_id){
			videos.push(video_id[0]);
			try{
			    description = item.getElementsByTagName('description')[0].textContent;
			    description = description.replace(/[\r\n]/mg,'<br>');
			    description = description.match(/<p class="nico-memo">(.*?)<\/p>/)[1];
			} catch (x) {
			    description = "";
			}

			let d = new Date(item.getElementsByTagName('pubDate')[0].textContent);

			let dat = {
			    "pubDate": d.getTime()/1000,  // UNIX time
			    "description": description
			};
			NicoLiveMylist.mylist_itemdata["_"+video_id[0]] = dat;
		    }
		}// end for.
		NicoLiveRequest.addStock(videos.join(','));
	    }
	};
	req.open('GET', url );
	req.setRequestHeader('User-Agent',NicoLiveHelper._useragent);
	req.send('');
    },

    addStockFromMylist:function(mylist_id,mylist_name){
	this.addStockFromMylistWithComment(mylist_id, mylist_name);
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
	req.setRequestHeader('User-Agent',NicoLiveHelper._useragent);
	req.send('');
    },

    // とりマイからストックに追加.
    addToStockFromDeflist:function(){
	let url = 'http://www.nicovideo.jp/api/deflist/list';
	debugprint("add to stock from deflist.");

	var req = new XMLHttpRequest();
	if(!req) return;
	req.onreadystatechange = function(){
	    if( req.readyState==4 && req.status==200 ){
		let result = JSON.parse(req.responseText);
		switch(result.status){
		case 'ok':
		    let videos = new Array();
		    for(let i=0;i<result.mylistitem.length;i++){
			videos.push(result.mylistitem[i].item_data.video_id);
		    }
		    NicoLiveRequest.addStock( videos.join(',') );
		    break;
		case 'fail':
		    break;
		default:
		    break;
		}
	    }
	};
	req.open('GET', url );
	req.setRequestHeader('User-Agent',NicoLiveHelper._useragent);
	req.send('');
    },

    // マイリストに追加メニューを作成する.
    createAddMylistMenu:function(mylists){
	let popupmenu = CreateElement('menu');
	popupmenu.setAttribute('label',LoadString('STR_ADD_MYLIST')); // 'マイリストに追加'

	let popup = CreateElement('menupopup');
	popupmenu.appendChild(popup);

	let elem = CreateMenuItem(LoadString('STR_DEF_MYLIST'),'default'); // 'とりあえずマイリスト'
	popup.appendChild(elem);

	for(let i=0,item;item=mylists[i];i++){
	    let elem;
	    let tmp = item.name.match(/.{1,20}/);
	    elem = CreateMenuItem(tmp,item.id);
	    elem.setAttribute("tooltiptext",item.name);
	    popup.appendChild(elem);
	}
	return popupmenu;
    },

    isVideoExists:function(video_id){
	try{
	    for (mylist_id in this.mylistdata){
		if(mylist_id=='time') continue;
		if(this.mylistdata[mylist_id].mylistitem["_"+video_id]){
		    return this.mylists.mylistgroup[mylist_id];
		}
	    }
	} catch (x) {
	    debugprint(x);
	}
	return null;
    },

    parseMylist:function(mylist_id,json){
	let id = "_"+mylist_id;
	this.mylistdata[id] = JSON.parse(json);

	for(let i=0,item; item=this.mylistdata[id].mylistitem[i]; i++){
	    this.mylistdata[id].mylistitem["_"+item.item_data.video_id] = item.item_data;
	}
	Application.storage.set("nico_live_allmylist",this.mylistdata);
    },

    getAllMylists:function(mylists){
	// mylists: マイリストグループリスト.
	if( !NicoLivePreference.isLoadAllMylist() ) return;
	let now = GetCurrentTime();
	this.mylistdata = NicoLiveDatabase.loadGPStorage("nico_live_allmylist",{});
	if( this.mylistdata.time && (now-this.mylistdata.time)<3600 ){
	    debugprint("マイリストを取得して1時間未満のため再取得は行われません");
	    for(let i=0,item; item=mylists[i]; i++){
		let id = "_"+item.id;
		mylists[id] = item.name;
		try{
		    for(let j=0,item2; item2=this.mylistdata[id].mylistitem[j]; j++){
			this.mylistdata[id].mylistitem["_"+item2.item_data.video_id] = item2.item_data;
		    }
		} catch (x) {
		    debugprint(x);
		}
	    }
	    return;
	}
	this.mylistdata = new Object();
	this.mylistdata.time = now;
	for(let i=0,item; item=mylists[i]; i++){
	    mylists["_"+item.id] = item.name;
	    debugprint('load mylist(id='+item.id+')');
	    let req = new XMLHttpRequest();
	    if( !req ) continue;
	    req.mylist_id = item.id;
	    req.onreadystatechange = function(){
		if( req.readyState==4 && req.status==200 ){
		    NicoLiveMylist.parseMylist(req.mylist_id, req.responseText);
		}
	    };
	    let url = "http://www.nicovideo.jp/api/mylist/list";
	    req.open('POST',url );
	    req.setRequestHeader('User-Agent',NicoLiveHelper._useragent);
	    req.setRequestHeader('Content-type','application/x-www-form-urlencoded');
	    let data = "group_id="+item.id;
	    req.send(data);
	}
    },

    init:function(){
	debugprint("NicoLiveMylist.init");
	this.mylists = new Array(); // マイリストグループ.
	this.mylistdata = new Object(); // マイリスト全データ.

	this.mylist_itemdata = new Object(); // マイリスト動画個々のデータ.

	let req = new XMLHttpRequest();
	if(!req) return;
	req.onreadystatechange = function(){
	    if( req.readyState==4 && req.status==200 ){
		NicoLiveMylist.mylists = JSON.parse(req.responseText);

		if( NicoLiveMylist.mylists.status=='fail'){
		    ShowNotice(LoadString('STR_ERR_MYLIST_HEADER')+NicoLiveMylist.mylists.error.description);
		    return;
		}

		let mylists = NicoLiveMylist.mylists.mylistgroup;

		NicoLiveHistory.appendMenu(mylists);
		NicoLiveRequest.appendAddMylistMenu(mylists);

		let popupmenu;
		// ステータスバー用.
		popupmenu = NicoLiveMylist.createAddMylistMenu(mylists);
		popupmenu.setAttribute("oncommand","NicoLiveMylist.addMyList(event.target.value,event.target.label,event);");
		$('popup-add-mylist').insertBefore( popupmenu, $('popup-add-mylist').firstChild );

		let elem;
		for(let i=0,item;item=mylists[i];i++){
		    let tmp = item.name.match(/.{1,20}/);

		    // マイリスト読み込み(stock)
		    elem = CreateMenuItem(tmp,item.id);
		    elem.setAttribute("tooltiptext",item.name);
		    elem.setAttribute("oncommand","NicoLiveMylist.addStockFromMylist(event.target.value,event.target.label);");
		    $('menupopup-from-mylist').appendChild(elem);

		    // マイリスト読み込み(db)
		    elem = CreateMenuItem(tmp,item.id);
		    elem.setAttribute("tooltiptext",item.name);
		    elem.setAttribute("oncommand","NicoLiveMylist.addDatabase(event.target.value,event.target.label);");
		    $('menupopup-from-mylist-to-db').appendChild(elem);
		}
		NicoLiveMylist.getAllMylists(mylists);
	    }
	};
	let url = "http://www.nicovideo.jp/api/mylistgroup/list";
	req.open('GET',url);
	req.setRequestHeader('User-Agent',NicoLiveHelper._useragent);
	req.channel.loadFlags |= Components.interfaces.nsIRequest.LOAD_BYPASS_CACHE;
	req.send('');
    }
};

window.addEventListener("load", function(){ NicoLiveMylist.init(); }, false);
