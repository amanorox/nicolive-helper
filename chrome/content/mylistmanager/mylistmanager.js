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

    /** 動画情報を表示しているリストアイテム要素を作成.
     * @param item 動画情報のオブジェクト
     */
    createListItemElement:function(item){
	let posteddate = GetDateString(item.first_retrieve*1000);

	let listitem = CreateElement('listitem');
	listitem.setAttribute('vid',item.video_id);
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

	let folder_listbox = $('folder-item-listbox');
	RemoveChildren(folder_listbox);

	for(let i=0,item; item=this.mylistdata[key].mylistitem[i]; i++){
	    let listitem = this.createListItemElement( item.item_data );
	    folder_listbox.appendChild(listitem);
	}
    },

    loadMyList: function(id, name){
	$('statusbar-progressmeter').mode = "undetermined";
	SetStatusBarText(name+'を取得しています...');

	$('folder-item-sortmenu').value = 1;
	for(let i=0,item; item=this.mylists.mylistgroup[i];i++){
	    if(item.id==id){
		$('folder-item-sortmenu').value = item.default_sort;
		break;
	    }
	}

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
			debugprint( MyListManager.mylists.error.description );
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

    init: function(){
	// initialize variables
	debugprint( window.opener.LibUserSessionCookie );
	debugprint( window.opener.LibUserAgent );
	LibUserSessionCookie = window.opener.LibUserSessionCookie;
	LibUserAgent = window.opener.LibUserAgent;

	this.getMylistGroup();
    },
    destroy: function(){
    }
};


window.addEventListener("load", function(e){ MyListManager.init(); }, false);
window.addEventListener("unload", function(e){ MyListManager.destroy(); }, false);
