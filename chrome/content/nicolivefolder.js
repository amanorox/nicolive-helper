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

var NicoLiveFolderDB = {
    getDatabase:function(){
	return NicoLiveDatabase.dbconnect;
    },

    // リストに表示されているアイテム数表示.
    updateItemNum:function(){
	$('folder-listitem-num').value = $('folder-item-listbox').children.length +"件";
    },

    removeAllListboxItems:function(listbox){
	while(listbox.hasChildNodes()) { 
	    listbox.removeChild(listbox.childNodes[0]);
	}
    },

    // リストに要素を追加.
    appendList:function(name,id){
	let folder = $('folder-listbox');
	let elem = CreateElement('listitem');
	elem.setAttribute('label',name);
	elem.setAttribute('value',id);
	folder.appendChild(elem);
    },

    // リストの新規作成.
    newList:function(){
	let name = InputPrompt("新規作成するリストの名前を入力してください","リスト名の入力");
	if(name){
	    let db = this.getDatabase();
	    let st = db.createStatement('INSERT INTO folder(type,parent,name) VALUES(0,-1,?1)');
	    st.bindUTF8StringParameter(0,name);
	    st.execute();
	    st.finalize();
	    let id = db.lastInsertRowID;

	    debugprint('insert id:'+id);
	    this.appendList(name, id);
	}
    },

    renameList:function(){
	let list = $('folder-listbox').selectedItem;
	if( !list ) return;

	let oldname = list.getAttribute('label');
	let id = list.getAttribute('value');

	let name = InputPrompt('リスト「'+oldname+'」の新しい名前を入力してください','リスト名の変更');
	if(name){
	    let db = this.getDatabase();

	    list.setAttribute('label',name);

	    // フォルダ名を変更.
	    let st = db.createStatement('UPDATE folder SET name=?1 WHERE id=?2 AND type=0');
	    st.bindUTF8StringParameter(0,name);
	    st.bindInt32Parameter(1,id);
	    st.execute();
	    st.finalize();
	}
    },

    deleteList:function(){
	let list = $('folder-listbox').selectedItem;
	if( !list ) return;

	let name = list.getAttribute('label');
	let id = list.getAttribute('value');

	PlayAlertSound();
	if( !ConfirmPrompt('リスト「'+name+'」を削除しますか ?','リストの削除') ) return;

	$('folder-listbox').removeItemAt( $('folder-listbox').selectedIndex );

	let db = this.getDatabase();
	// フォルダを削除.
	let st = db.createStatement('DELETE FROM folder WHERE id=?1 AND type=0');
	st.bindInt32Parameter(0,id);
	st.execute();
	st.finalize();

	// フォルダに含まれる動画を削除.
	st = db.createStatement('DELETE FROM folder WHERE parent=?1 AND type=1');
	st.bindInt32Parameter(0,id);
	st.execute();
	st.finalize();

	this.removeAllListboxItems( $('folder-item-listbox') );
    },

    // 動画情報の要素を作成.
    createListItem:function(item){
	let posteddate = GetDateString(item.first_retrieve*1000);

	let listitem = CreateElement('listitem');
	listitem.setAttribute('vid',item.video_id);
	let hbox = CreateElement('hbox');
	let image = CreateElement('image');
	image.setAttribute('src',item.thumbnail_url);
	image.setAttribute('style','width:65px;height:50px;margin-right:8px;');
	image.setAttribute('validate','never');
	let div = CreateHTMLElement('div');

	let min = parseInt(item.length/60);
	let sec = parseInt(item.length%60);

	div.innerHTML = item.video_id + " "+item.title+"<br/>"
	    + "投稿日:"+posteddate+" 時間:"+(min+":"+(sec<10?("0"+sec):sec))+"<br/>"
	    + "再生:"+FormatCommas(item.view_counter)
	    + " コメント:"+FormatCommas(item.comment_num)
	    + " マイリスト:"+FormatCommas(item.mylist_counter);

	hbox.appendChild(image);
	hbox.appendChild(div);
	listitem.appendChild(hbox);
	return listitem;
    },

    selectFolder:function(listbox){
	let item = listbox.selectedItem;
	if( !item ) return;
	let folder_id = item.getAttribute('value');

	let db = this.getDatabase();
	let st;
	st = db.createStatement('SELECT N.* FROM nicovideo N JOIN (SELECT * FROM folder F WHERE F.parent=?1 AND F.type=1) USING (video_id)');
	st.bindInt32Parameter(0,folder_id);
	let cnt=0;
	let folder_listbox = $('folder-item-listbox');
	this.removeAllListboxItems(folder_listbox);

	while(st.executeStep()){
	    //debugprint(st.row.video_id);
	    let listitem = this.createListItem(st.row);
	    folder_listbox.appendChild(listitem);
	    cnt++;
	}
	st.finalize();

	this.updateItemNum();
    },

    sort:function(sortmenu){
	debugprint(sortmenu.selectedItem.value);
	let sortorder = ["",
			 "title ASC","title DESC",
			 "first_retrieve DESC","first_retrieve ASC",
			 "view_counter DESC","view_counter ASC",
			 "comment_num DESC","comment_num ASC",
			 "mylist_counter DESC","mylist_counter ASC",
			 "length DESC","length ASC"];
	let db = this.getDatabase();
	let str = 'SELECT N.* FROM nicovideo N JOIN (SELECT * FROM folder F WHERE F.parent=?1 AND F.type=1) USING (video_id) ORDER BY '+sortorder[sortmenu.selectedItem.value];
	let st = db.createStatement(str);
	let id = $('folder-listbox').selectedItem.value;
	st.bindInt32Parameter(0,id);

	let folder_listbox = $('folder-item-listbox');
	this.removeAllListboxItems(folder_listbox);
	while(st.executeStep()){
	    let listitem = this.createListItem(st.row);
	    folder_listbox.appendChild(listitem);
	}
	st.finalize();

	this.updateItemNum();
    },

    copyVideoId:function(){
	let items = $('folder-item-listbox').selectedItems;
	let str = "";
	for(let i=0,item; item=items[i]; i++){
	    str += item.getAttribute('vid') + " ";
	}
	CopyToClipboard(str);
    },

    deleteVideo:function(){
	let items = $('folder-item-listbox').selectedItems;
	if( !items.length ) return;

	PlayAlertSound();
	if( !ConfirmPrompt("選択した動画をリストから削除しますか ?","リスト内の動画の削除") ) return;

	let id = $('folder-listbox').selectedItem.value;

	let db = this.getDatabase();
	let vids = new Array();
	for(let i=0,item; item=items[i]; i++){
	    let video_id = item.getAttribute('vid');
	    let st = db.createStatement('DELETE FROM folder WHERE parent=?1 AND video_id=?2 AND type=1');
	    st.bindInt32Parameter(0,id);
	    st.bindUTF8StringParameter(1,video_id);
	    st.execute();
	    st.finalize();

	    vids.push(video_id);
	}
	for(let i=items.length-1,item; item=items[i]; i--){
	    RemoveElement(item);
	}
	this.updateItemNum();
    },

    openVideoPage:function(){
	let item = $('folder-item-listbox').selectedItem;
	if( !item ) return;
	let vid = item.getAttribute('vid');
	window.opener.getBrowser().addTab("http://www.nicovideo.jp/watch/"+vid);
    },

    appendVideos:function(){
	if( !$('folder-listbox').selectedItem ) return;
	let id = $('folder-listbox').selectedItem.value;
	let vids = InputPrompt("リストへ追加する動画ID(複数可)を入力してください","リストへ動画の追加");
	if( vids ){
	    NicoLiveDatabase.addVideos(vids);

	    let db = this.getDatabase();

	    let l = vids.match(/(sm|nm)\d+/g);
	    if(l){
		for(let i=0,video_id;video_id=l[i];i++){
		    let st = db.createStatement('INSERT INTO folder(type,parent,video_id) VALUES(1,?1,?2)');
		    st.bindInt32Parameter(0,id);
		    st.bindUTF8StringParameter(1,video_id);
		    st.execute();
		    st.finalize();
		}
		this.sort( $('folder-item-sortmenu') );
	    }
	}
    },

    // フォルダリストの表示.
    showFolderList:function(){
	let db = this.getDatabase();
	let st = db.createStatement('SELECT id,name FROM folder WHERE type=0 ORDER BY name ASC');
	while(st.executeStep()){
	    this.appendList(st.row.name, st.row.id);
	}
	st.finalize();
    },


    init:function(){
	this.showFolderList();
    }

};

window.addEventListener("load", function(e){ NicoLiveFolderDB.init(); }, false);
