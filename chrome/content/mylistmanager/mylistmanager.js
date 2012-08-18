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
function debugprint(str){
    Application.console.log(str);
}


Components.utils.import("resource://nicolivehelpermodules/sharedobject.jsm");

function SetStatusBarText(str){
    $('statusbar-text').label = str;
}

var MyListManager = {
    mylists: null,    // マイリスト一覧
    mylistdata: {}, // マイリストの内容(key=マイリストID or default)

    apitoken: "",   // トークンが必要なAPI用

    registerMylistQueue: [],

    sort:function(array,order){
	array.sort( function(a,b){
			let tmpa=0, tmpb=0;
			switch(order){
			case 1:// 登録が新しい順
			    tmpa = a.create_time;
			    tmpb = b.create_time;
			    break;
			case 0:// 登録が古い順
			    tmpb = a.create_time;
			    tmpa = b.create_time;
			    break;
			case 4:// タイトル昇順
			    tmpa = a.item_data.title;
			    tmpb = b.item_data.title;
			    return tmpa<tmpb?-1:1;
			    break;
			case 5:// タイトル降順
			    tmpb = a.item_data.title;
			    tmpa = b.item_data.title;
			    return tmpa<tmpb?-1:1;
			    break;
			case 2:// マイリストコメント昇順
			    tmpa = a.description;
			    tmpb = b.description;
			    return tmpa<tmpb?-1:1;
			    break;
			case 3:// マイリストコメント降順
			    tmpb = a.description;
			    tmpa = b.description;
			    return tmpa<tmpb?-1:1;
			    break;
			case 6:// 投稿が新しい順
			    tmpa = a.item_data.first_retrieve;
			    tmpb = b.item_data.first_retrieve;
			    break;
			case 7:// 投稿が古い順
			    tmpb = a.item_data.first_retrieve;
			    tmpa = b.item_data.first_retrieve;
			    break;
			case 8:// 再生が多い順
			    tmpa = a.item_data.view_counter;
			    tmpb = b.item_data.view_counter;
			    break;
			case 9:// 再生が少ない順
			    tmpb = a.item_data.view_counter;
			    tmpa = b.item_data.view_counter;
			    break;
			case 10:// コメントが新しい順
			    tmpa = a.item_data.update_time;
			    tmpb = b.item_data.update_time;
			    break;
			case 11:// コメントが古い順
			    tmpb = a.item_data.update_time;
			    tmpa = b.item_data.update_time;
			    break;
			case 12:// コメントが多い順
			    tmpa = a.item_data.num_res;
			    tmpb = b.item_data.num_res;
			    break;
			case 13:// コメントが少ない順
			    tmpb = a.item_data.num_res;
			    tmpa = b.item_data.num_res;
			    break;
			case 14:// マイリスト登録が多い順
			    tmpa = a.item_data.mylist_counter;
			    tmpb = b.item_data.mylist_counter;
			    break;
			case 15:// マイリスト登録が少ない順
			    tmpb = a.item_data.mylist_counter;
			    tmpa = b.item_data.mylist_counter;
			    break;
			case 16:// 時間が長い順
			    tmpa = a.item_data.length_seconds;
			    tmpb = b.item_data.length_seconds;
			    break;
			case 17:// 時間が短い順
			    tmpb = a.item_data.length_seconds;
			    tmpa = b.item_data.length_seconds;
			    break;

			case 18:// 枚数が多い順
			    break;
			case 19:// 枚数が少ない順
			    break;
			    
			}
			return (tmpb - tmpa);
		    });
    },

    doSort:function(order){
	let id = $('folder-listbox').selectedItem.value;
	let key = "_"+id;

	//debugprint("sort order:"+order);

	this.sort( this.mylistdata[key].mylistitem, parseInt(order) );

	let folder_listbox = $('folder-item-listbox');
	RemoveChildren(folder_listbox);

	for(let i=0,item; item=this.mylistdata[key].mylistitem[i]; i++){
	    let listitem = this.createListItemElement( item.item_data );
	    folder_listbox.appendChild(listitem);
	}
    },

    /** 動画情報を表示しているリストアイテム要素を作成.
     * @param item 動画情報のオブジェクト
     */
    createListItemElement:function(item){
	let posteddate = GetDateString(item.first_retrieve*1000);

	let listitem = CreateElement('listitem');
	if( item.deleted!=0 ){
	    listitem.setAttribute("class","video-deleted");
	}
	let hbox = CreateElement('hbox');
	let image = CreateElement('image');
	image.setAttribute('src',item.thumbnail_url);
	image.setAttribute('style','width:65px;height:50px;margin-right:8px;');
	image.setAttribute('validate','never');
	let div = CreateHTMLElement('div');

	let min = parseInt(item.length_seconds/60);
	let sec = parseInt(item.length_seconds%60);

	div.innerHTML = item.video_id + " "+htmlspecialchars(item.title)+"<br/>"
	    + "投稿日:"+posteddate+" 時間:"+(min+":"+(sec<10?("0"+sec):sec))+"<br/>"
	    + "再生:"+FormatCommas(item.view_counter)
	    + " コメント:"+FormatCommas(item.num_res)
	    + " マイリスト:"+FormatCommas(item.mylist_counter);

	hbox.appendChild(image);
	hbox.appendChild(div);
	listitem.appendChild(hbox);
	return listitem;
    },

    parseMyList: function(id, name, json){
	/*
	 MyListManager.mylistdata["_10244"].mylistitem[0]
	 item_type: 0
	 item_id: 1173125982
	 description: 
	 item_data: [object Object]
	 watch: 0
	 create_time: 1244296222
	 update_time: 1285934237

	 MyListManager.mylistdata["_10244"].mylistitem[0].item_data
	 video_id: sm222
	 title: イースⅠ 新オープニング OP
	 thumbnail_url: http://tn-skr3.smilevideo.jp/smile?i=222
	 first_retrieve: 1173125982
	 update_time: 1342631959
	 view_counter: 54357
	 mylist_counter: 517
	 num_res: 1001
	 group_type: default
	 length_seconds: 209
	 deleted: 0
	 last_res_body: 222とか凄いな ダルクは紳士！ ダルクかっけええええ れあああああああああ 
	 watch_id: sm222
	 */

	let key = "_"+id;
	this.mylistdata[key] = JSON.parse( json );

	if( this.mylistdata[key].status=='fail'){
	    SetStatusBarText( this.mylistdata[key].error.description );
	    return;
	}

	$('folder-listitem-num').value = this.mylistdata[key].mylistitem.length +"件";

	// どのソート順を使用するかチェック
	let sort_order = 1;
	for(let i=0,item; item=this.mylists.mylistgroup[i];i++){
	    if(item.id==id){
		sort_order = item.default_sort;
		break;
	    }
	}
	$('folder-item-sortmenu').value = sort_order;
	//debugprint("sort_order:"+sort_order);

	let folder_listbox = $('folder-item-listbox');
	RemoveChildren(folder_listbox);

	this.sort( this.mylistdata[key].mylistitem, parseInt(sort_order) );

	for(let i=0,item; item=this.mylistdata[key].mylistitem[i]; i++){
	    let listitem = this.createListItemElement( item.item_data );
	    folder_listbox.appendChild(listitem);
	}
    },

    loadMyList: function(id, name){
	$('statusbar-progressmeter').mode = "undetermined";
	SetStatusBarText(name+'を取得しています...');

	debugprint('load mylist(id='+id+')');
	let f = function(xml,req){
	    if( req.readyState==4 ){
		$('statusbar-progressmeter').mode = "determined";
		SetStatusBarText('');

		if( req.status==200 ){
		    MyListManager.parseMyList( id, name, req.responseText );
		}
	    }
	};
	if( id=='default' ){
	    NicoApi.getDeflist( f );
	}else{
	    NicoApi.getmylist( id, f );
	}
    },

    getMylistGroup: function(){
	// とりマイは常に登録が新しい順
	/*
	 MyListManager.mylists.mylistgroup[0]
	 id: 29392484
	 user_id: 14369164
	 name: 2011年ボカロ曲10選
	 description: 今年は修論執筆、再就職、長距離通勤でフルタイムの仕事とかそんな感じであまり聴いてないと思っていたらなんだかんだで2000曲近くは聴いたらしい。
10選するには前年に比べて聴き込みが足りないのでアレげだけど、こんな感じで何卒何卒。
	 2011/12/11
	 public: 1
	 default_sort: 7
	 create_time: 1323593815
	 update_time: 1323958659
	 sort_order: 5
	 icon_id: 7
	 */

	let folder = $('folder-listbox');
	let elem = CreateElement('listitem');
	elem.setAttribute('label',"とりあえずマイリスト");
	elem.setAttribute('value',"default");
	folder.appendChild(elem);

	$('statusbar-progressmeter').mode = "undetermined";
 	SetStatusBarText("マイリストを取得しています...");

	let f = function(xml,req){
	    if( req.readyState==4 ){
		$('statusbar-progressmeter').mode = "determined";
 		SetStatusBarText("");

		if( req.status==200 ){
		    MyListManager.mylists = JSON.parse(req.responseText);
		    
		    if( MyListManager.mylists.status=='fail'){
			SetStatusBarText( MyListManager.mylists.error.description );
			return;
		    }

		    let mylists = MyListManager.mylists.mylistgroup;
		    let elem;
		    for(let i=0,item;item=mylists[i];i++){
			let folder = $('folder-listbox');
			let elem = CreateElement('listitem');
			elem.setAttribute('label',item.name);
			elem.setAttribute('value',item.id);
			folder.appendChild(elem);
		    }
		    //MyListManager.getAllMylists(mylists);
		}
	    }
	};
	NicoApi.getmylistgroup( f );
    },

    getToken:function(){
	let f = function(xml,req){
	    if( req.readyState==4 ){
		if( req.status==200 ){
		    let token = req.responseText.match(/NicoAPI\.token\s*=\s*\"(.*)\";/);
		    MyListManager.apitoken = token;
		}
	    }
	};
	NicoApi.getUserMylistPageApiToken(f);
    },

    addRequest:function(){
	let items = $('folder-item-listbox').children;
	let str = "";
	let id = $('folder-listbox').selectedItem.value;
	let key = "_"+id;

	let videos = this.mylistdata[key].mylistitem;
	for( let i=0; i<items.length; i++){
	    if( !items[i].selected ) continue;
	    str += videos[i].item_data.video_id +" ";
	}
	if( window.opener.NicoLiveHelper.iscaster || window.opener.NicoLiveHelper.isOffline()){
	    window.opener.NicoLiveRequest.addRequest( str );
	}else{
	    window.opener.NicoLiveHelper.postListenerComment( str, "" );
	}
    },
    addStock:function(){
	let items = $('folder-item-listbox').children;
	let str = "";
	let id = $('folder-listbox').selectedItem.value;
	let key = "_"+id;

	let videos = this.mylistdata[key].mylistitem;
	for( let i=0; i<items.length; i++){
	    if( !items[i].selected ) continue;
	    str += videos[i].item_data.video_id +" ";
	}
	window.opener.NicoLiveRequest.addStock( str );
    },

    openPage:function(){
	let items = $('folder-item-listbox').children;
	let str = "";
	let id = $('folder-listbox').selectedItem.value;
	let key = "_"+id;

	let videos = this.mylistdata[key].mylistitem;
	for( let i=0; i<items.length; i++){
	    if( !items[i].selected ) continue;
	    let url = "http://nico.ms/"+videos[i].item_data.video_id;
	    let hasfocus = true;
	    window.opener.NicoLiveWindow.openDefaultBrowser(url, hasfocus);
	}
    },

    copyToClipboard:function(type){
	let items = $('folder-item-listbox').children;
	let str = "";
	let id = $('folder-listbox').selectedItem.value;
	let key = "_"+id;

	let videos = this.mylistdata[key].mylistitem;
	for( let i=0; i<items.length; i++){
	    if( !items[i].selected ) continue;
	    switch(type){
	    case 0:
		// 動画ID
		str += videos[i].item_data.video_id + "\n";
		break;
	    case 1:
		// タイトル
		str += videos[i].item_data.title + "\n";
		break;
	    case 2:
		// 動画ID+タイトル
		str += videos[i].item_data.video_id + " " +videos[i].item_data.title + "\n";
		break;
	    }
	}
	CopyToClipboard(str);
    },

    startItemDragging:function(event){
	let dt = event.dataTransfer;

	let items = $('folder-item-listbox').children;
	let id = $('folder-listbox').selectedItem.value;
	let key = "_"+id;
	let str = "";

	// マイリストのアイテムIDをスペースで区切ったものをテキストとしてD&Dする
	let videos = this.mylistdata[key].mylistitem;
	for( let i=0; i<items.length; i++){
	    if( !items[i].selected ) continue;
	    str += videos[i].item_id +" ";
	}
	dt.setData('text/plain', str );
    },

    checkDragOnMyList:function(event){
	// マイリスト一覧上をドラッグしているときのチェック
	let b = event.dataTransfer.types.contains("text/plain");
	if( b ){
	    event.preventDefault();
	}
	return true;
    },

    getMyListPageToken:function( postfunc ){
	let f = function(xml,req){
	    if( req.readyState==4 ){
		if( req.status==200 ){
		    let token = req.responseText.match(/NicoAPI\.token\s*=\s*\"(.*)\";/);
		    MyListManager.apitoken = token[1];
		    if( "function"==typeof postfunc ){
			postfunc();
		    }
		    token = req.responseText.match(/nickname = \"(.*)\";/);
		    debugprint(token[1]);
		    $('statusbar-username').label = token[1];
		}
	    }
	};
	NicoApi.getUserMylistPageApiToken( f );
    },

    copy:function( from, to, ids ){
	let f = function(xml,req){
	    if( req.readyState==4 ){
		if( req.status==200 ){
		    let result = JSON.parse(req.responseText);
		    if( result.status=="fail" ){
			SetStatusBarText( result.error.code + ": " + result.error.description );
		    }else{
			SetStatusBarText("コピーしました");
		    }
		}
	    }
	};

	if( from=='default' ){
	    NicoApi.copydeflist( to, ids, this.apitoken, f );
	}else{
	    NicoApi.copymylist( from, to, ids, this.apitoken, f );
	}
    },

    moveListItem:function( from, to, result ){
	// 2 件のうち 1 件はすでに移動先に存在しているため移動できませんでした
	try{
	    let n1 = result.matches.item.length;
	    let n2 = result.duplicates.item.length;
	    SetStatusBarText( n1 + " 件のうち "+ n2 + " 件はすでに移動先に存在しているため移動できませんでした");
	} catch (x) {
	    // 移動先に重複がない場合には result.duplicates.itemがないのでこっちに飛ぶ
	    SetStatusBarText( result.targets.item.length + " 件を移動しました");
	}

	let id = $('folder-listbox').selectedItem.value;
	let key = "_"+id;
	let videos = this.mylistdata[key].mylistitem;
	let newarray = new Array();

	for(let i=0; i<videos.length; i++){
	    let b = false;
	    for( let j=0; j<result.targets.item.length; j++ ){
		let moved_id = result.targets.item[j].id;
		if( videos[i].item_id==moved_id ){
		    b = true;
		    break;
		}
	    }
	    if( b ) continue;
	    newarray.push( videos[i] );
	}
	this.mylistdata[key].mylistitem = newarray;
	$('folder-listitem-num').value = this.mylistdata[key].mylistitem.length +"件";

	let folder_listbox = $('folder-item-listbox');
	RemoveChildren(folder_listbox);

	for(let i=0,item; item=this.mylistdata[key].mylistitem[i]; i++){
	    let listitem = this.createListItemElement( item.item_data );
	    folder_listbox.appendChild(listitem);
	}
    },

    move:function( from, to, ids ){
	let f = function(xml,req){
	    if( req.readyState==4 ){
		if( req.status==200 ){
		    let result = JSON.parse(req.responseText);
		    if( result.status=="fail" ){
			SetStatusBarText( result.error.code + ": " + result.error.description );
		    }else{
			MyListManager.moveListItem( from, to, result );
		    }
		}
	    }
	};
	if( from=='default' ){
	    NicoApi.movedeflist( to, ids, this.apitoken, f );
	}else{
	    NicoApi.movemylist( from, to, ids, this.apitoken, f );
	}
    },

    dropItemToMyList:function(event){
	// マイリスト一覧にドロップしたときの処理
	let dt = event.dataTransfer;
	let effect = dt.dropEffect; // copy, move
	let target = event.target;
	let target_list_id = target.value;
	let source_list_id = $('folder-listbox').selectedItem.value;
	let msg = $('folder-listbox').selectedItem.label+"/"+source_list_id+"->"+target.label+"/"+target.value;
	debugprint( msg );

	let tmp = dt.getData("text/plain");
	let ids = tmp.trim().split(/\s+/);

	let f = function(){
	    switch( effect ){
	    case "move":
		MyListManager.move( source_list_id, target_list_id, ids );
		break;
	    case "copy":
		MyListManager.copy( source_list_id, target_list_id, ids );
		break;
	    }
  	};

	if( !this.apitoken ){
	    this.getMyListPageToken( f );
	}else{
	    f();
	}
    },

    // 表示部分から削除する
    deleteFromListItem:function(ids){
	let id = $('folder-listbox').selectedItem.value;
	let key = "_"+id;
	let videos = this.mylistdata[key].mylistitem;
	
	let newarray = new Array();
	for(let i=0; i<videos.length; i++){
	    let b = false;
	    for(let j=0; j<ids.length; j++ ){
		if( videos[i].item_id==ids[j] ){
		    b = true;
		    break;
		}
	    }
	    if( b ) continue;
	    newarray.push( videos[i] );
	}
	this.mylistdata[key].mylistitem = newarray;
	$('folder-listitem-num').value = this.mylistdata[key].mylistitem.length +"件";

	let folder_listbox = $('folder-item-listbox');
	RemoveChildren(folder_listbox);

	for(let i=0,item; item=this.mylistdata[key].mylistitem[i]; i++){
	    let listitem = this.createListItemElement( item.item_data );
	    folder_listbox.appendChild(listitem);
	}

    },

    delete:function(){
	if( !ConfirmPrompt("選択した動画をマイリストから削除しますか?","マイリストの削除") ) return;

	let items = $('folder-item-listbox').children;
	let id = $('folder-listbox').selectedItem.value;
	let key = "_"+id;
	let str = "";

	// マイリストのアイテムIDをスペースで区切ったものをテキストとしてD&Dする
	let videos = this.mylistdata[key].mylistitem;
	for( let i=0; i<items.length; i++){
	    if( !items[i].selected ) continue;
	    str += videos[i].item_id +" ";
	}
	let ids = str.trim().split(/\s+/);
	if( ids.length ){
	    let f = function(){
		let f2 = function(xml,req){
		    if( req.readyState==4 ){
			if( req.status==200 ){
			    let result = JSON.parse(req.responseText);
			    if( result.status=="fail" ){
				SetStatusBarText( result.error.code + ": " + result.error.description );
			    }else{
				SetStatusBarText("削除しました");
				MyListManager.deleteFromListItem(ids);
			    }
			}
		    }
		};
		if( id=='default' ){
		    NicoApi.deletedeflist( ids, MyListManager.apitoken, f2 );
		}else{
		    NicoApi.deletemylist( id, ids, MyListManager.apitoken, f2 );
		}
	    };
	    if( !this.apitoken ){
		this.getMyListPageToken( f );
	    }else{
		f();
	    }
	}
    },

    checkDropToListItem:function(event){
	let b = false;
	var file = event.dataTransfer.mozGetDataAt("application/x-moz-file", 0);
	if( file ){
	    b = true;
	}
	if( event.dataTransfer.types.contains('text/plain') ) b = true;
	if( event.dataTransfer.types.contains("text/uri-list") ) b = true;
	if( b ) event.preventDefault();
	return true;
    },

    // ファイルからマイリストに登録する.
    readFileToMyList:function(file){
	if( this.registerMylistQueue.length ) return;

	// file は nsIFile
	let istream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
	istream.init(file, 0x01, 0444, 0);
	istream.QueryInterface(Components.interfaces.nsILineInputStream);

	// 行を配列に読み込む
	let line = {}, hasmore;
	let first = true;
	do {
	    hasmore = istream.readLine(line);
	    let d = line.value.match(/(sm|nm)\d+|\d{10}/);
	    if( d ){
		this.registerMylistQueue.push( d[0] );
	    }
	} while(hasmore);
	istream.close();

	$('statusbar-progressmeter').max = this.registerMylistQueue.length;
	this.runAddingMyList();
    },

    finishAddingMyList:function(){
	this.registerMylistQueue = new Array();
	$('statusbar-progressmeter').mode = "determined";
	$('statusbar-progressmeter').value = 0;
    },

    addMyListExec:function(item_id,mylist_id,token,video_id, additional_msg){
	// 二段階目は取得したトークンを使ってマイリス登録をする.
	let f = function(xml,req){
	    if( req.readyState==4 && req.status==200 ){
		let result = JSON.parse(req.responseText);
		switch(result.status){
		case 'ok':
		    let max = $('statusbar-progressmeter').max;
		    let processed = max - MyListManager.registerMylistQueue.length;
		    SetStatusBarText(video_id+'をマイリストしました。('+processed+'/'+max+')');
		    setTimeout( function(){
				    MyListManager.runAddingMyList();
				},2000);
		    break;
		case 'fail':
		    MyListManager.finishAddingMyList();
		    SetStatusBarText(result.error.description);
		    break;
		default:
		    break;
		}
	    }
	};
	NicoApi.addMylist(item_id, mylist_id, token, additional_msg, f );
    },

    runAddingMyList:function(){
	if( this.registerMylistQueue.length==0 ){
	    this.finishAddingMyList();
	    this.refreshCurrentMylist();
	    return;
	}
	$('statusbar-progressmeter').value = $('statusbar-progressmeter').max - this.registerMylistQueue.length;

	let mylist_id = $('folder-listbox').selectedItem.value;
	let video_id = this.registerMylistQueue.shift();
	if( mylist_id=='default' ){
	    this.finishAddingMyList();
	    SetStatusBarText("現在、とりあえずマイリストにはマイリスト登録できません。");
	    return;
	}

	// 一段階目はトークンを取得する.
	let f = function(xml,req){
	    if( req.readyState==4 && req.status==200 ){
		try{
		    let token = req.responseText.match(/NicoAPI\.token\s*=\s*\"(.*)\";/);
		    let item_id = req.responseText.match(/item_id\"\s*value=\"(.*)\">/);
		    debugprint('token='+token[1]);
		    debugprint('item_id='+item_id[1]);
		    MyListManager.addMyListExec(item_id[1],mylist_id,token[1],video_id, "");
		} catch (x) {
		    MyListManager.finishAddingMyList();
		    SetStatusBarText("マイリスト登録に失敗しました: "+video_id);
		}
	    }
	};
	NicoApi.getMylistToken( video_id, f );
    },

    dropToListItem:function(event){
	// ファイルをドロップしたとき.
	var file = event.dataTransfer.mozGetDataAt("application/x-moz-file", 0);
	if (file instanceof Components.interfaces.nsIFile){
	    if( !file.leafName.match(/\.txt$/) ) return;
	    debugprint("file dropped:"+file.path);
	    this.readFileToMyList(file);
	    return;
	}

	let str = "";
	if( event.dataTransfer.types.contains('text/plain') ){
	    str = event.dataTransfer.mozGetDataAt("text/plain",0);
	    debugprint("drop text");
	}
	// アンカーをドロップしたとき.
	if( event.dataTransfer.types.contains("text/uri-list") ){
	    str = event.dataTransfer.mozGetDataAt("text/uri-list",0);
	    debugprint("uri dropped:"+str);
	}

	if( str ){
	    this.registerMylistQueue = new Array();
	    let d = str.match(/(sm|nm)\d+|\d{10}/);
	    if( d ){
		this.registerMylistQueue.push( d[0] );
	    }
	    $('statusbar-progressmeter').max = this.registerMylistQueue.length;
	    this.runAddingMyList();
	}
    },

    openMyListManager:function(cookie,agent){
	var value = {};
	var f = "chrome,resizable=yes,centerscreen";
	value.cookie = cookie;
	value.agent = agent;
	var w = window.openDialog("chrome://nicolivehelper/content/mylistmanager/mylistmanager.xul","",f,value);
	w.focus();
    },

    open:function(n){
	let cookie = "";
	switch( n ){
	case 0: // IE Protected
	    cookie = NicoLiveCookie.getIECookie("http://www.nicovideo.jp/","user_session");
	    break;
	case 1: // IE Standard
	    cookie = NicoLiveCookie.getStdIECookie("http://www.nicovideo.jp/","user_session");
	    break;
	case 2: // Chrome
	    cookie = NicoLiveCookie.getChromeCookie();
	    break;
	case 3: // Safari
	    cookie = NicoLiveCookie.getMacSafariCookie();
	    break;
	}
	this.openMyListManager(cookie, LibUserAgent);
    },

    saveToFile:function(){
	let id = $('folder-listbox').selectedItem.value;
	let key = "_"+id;
	let videos = this.mylistdata[key].mylistitem;

	let str = "";
	for(let i=0; i<videos.length; i++){
	    str += videos[i].item_data.video_id + " " +videos[i].item_data.title + "\r\n";
	}
	
	const nsIFilePicker = Components.interfaces.nsIFilePicker;
	let fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
	fp.init(window, "テキストファイルに保存", nsIFilePicker.modeSave);
	fp.appendFilters(nsIFilePicker.filterAll);
	let rv = fp.show();
	if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
	    let file = fp.file;
	    let path = fp.file.path;
	    let os = Components.classes['@mozilla.org/network/file-output-stream;1'].createInstance(Components.interfaces.nsIFileOutputStream);
	    let flags = 0x02|0x08|0x20;// wronly|create|truncate
	    os.init(file,flags,0664,0);
	    let cos = GetUTF8ConverterOutputStream(os);
	    cos.writeString( str );
	    cos.close();
	}
    },

    /**
     * 現在のマイリストの表示を更新する.
     */
    refreshCurrentMylist:function(){
	let mylist = $('folder-listbox');
	this.loadMyList( mylist.selectedItem.value, mylist.selectedItem.label );
    },

    init: function(){
	// initialize variables
	debugprint( window.arguments[0].cookie );
	debugprint( window.arguments[0].agent );
	LibUserSessionCookie = window.arguments[0].cookie;
	LibUserAgent = window.arguments[0].agent;

	this.getMylistGroup();
	this.getMyListPageToken();

	try{
	    if( window.opener.NicoLiveHelper.title ){
		document.title = window.opener.NicoLiveHelper.title + " - "+ document.title;
	    }
	} catch (x) {
	}
    },
    destroy: function(){
    }
};


window.addEventListener("load", function(e){ MyListManager.init(); }, false);
window.addEventListener("unload", function(e){ MyListManager.destroy(); }, false);
