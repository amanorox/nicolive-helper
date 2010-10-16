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

    // 指定のリストIDに指定の動画IDが存在しているかどうか.
    checkExistItem:function(list_id,video_id){
	let db = this.getDatabase();
	let st = db.createStatement('SELECT * FROM folder WHERE parent=?1 AND video_id=?2');
	st.bindInt32Parameter(0,list_id);
	st.bindUTF8StringParameter(1,video_id);
	let exist = false;
	while(st.executeStep()){
	    exist = true;
	}
	st.finalize();
	return exist;
    },

    // リストに表示されているアイテム数表示.
    updateItemNum:function(){
	$('folder-listitem-num').value = $('folder-item-listbox').children.length +"件";
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

	let name = InputPrompt('リスト「'+oldname+'」の新しい名前を入力してください','リスト名の変更',oldname);
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

	RemoveChildren( $('folder-item-listbox') );
    },

    /**
     * 動画情報を表示しているリストアイテム要素を作成.
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

	let min = parseInt(item.length/60);
	let sec = parseInt(item.length%60);

	let rate = GetFavRateString(item.favorite);
	div.innerHTML = item.video_id + " "+item.title+"<br/>"
	    + "投稿日:"+posteddate+" 時間:"+(min+":"+(sec<10?("0"+sec):sec))+"<br/>"
	    + "再生:"+FormatCommas(item.view_counter)
	    + " コメント:"+FormatCommas(item.comment_num)
	    + " マイリスト:"+FormatCommas(item.mylist_counter)
	    + " レート:"+rate;

	hbox.appendChild(image);
	hbox.appendChild(div);
	listitem.appendChild(hbox);
	return listitem;
    },

    selectFolder:function(listbox){
	this.sort( $('folder-item-sortmenu') );
	return;
    },

    sort:function(sortmenu){
	//debugprint(sortmenu.selectedItem.value);
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
	RemoveChildren(folder_listbox);
	while(st.executeStep()){
	    let listitem = this.createListItemElement(st.row);
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

    addToStock:function(){
	let items = $('folder-item-listbox').selectedItems;
	let str = "";
	for(let i=0,item; item=items[i]; i++){
	    str += item.getAttribute('vid') + " ";
	}
	NicoLiveRequest.addStock(str);
    },
    sendRequest:function(){
	if(NicoLiveHelper.iscaster || NicoLiveHelper.isOffline()){
	    let items = $('folder-item-listbox').selectedItems;
	    let str = "";
	    for(let i=0,item; item=items[i]; i++){
		str += item.getAttribute('vid') + " ";
	    }
	    NicoLiveRequest.addRequest(str);
	}else{
	    let video_id = $('folder-item-listbox').selectedItem.getAttribute('vid');
	    NicoLiveHelper.postListenerComment(video_id,"");
	}
    },

    deleteVideo:function(){
	let items = $('folder-item-listbox').selectedItems;
	if( !items.length ) return;

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
	//NicoLivePlaylist.newTab(vid);
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
		    if( this.checkExistItem(id,video_id) ) continue;

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

    startDraggingItem:function(event){
	let dt = event.dataTransfer;
	//dt.setData('application/x-moz-node', $('folder-item-listbox').selectedItems);
	let dragitems = $('folder-item-listbox').selectedItems;
	for(let i=0,item; item=dragitems[i]; i++){
	    dt.mozSetDataAt('application/x-moz-node', item , i );
	}
    },

    checkDrag:function(event){
	let b = event.dataTransfer.types.contains("application/x-moz-node");
	if( b ){
	    event.preventDefault();
	}
	return true;
    },

    /**
     * アイテムを移動する.
     * @param destination 移動先リストID
     * @param source 移動元リストID
     * @param video_id 動画ID
     */
    moveItem:function(destination,source,video_id){
	let db = this.getDatabase();
	let st = db.createStatement('UPDATE folder SET parent=?1 WHERE parent=?2 AND video_id=?3');
	st.bindInt32Parameter(0,destination);
	st.bindInt32Parameter(1,source);
	st.bindUTF8StringParameter(2,video_id);
	st.execute();
	st.finalize();
    },

    /**
     * アイテムをコピーする.
     * @param destination コピー先リストID
     * @param video_id 動画ID
     */
    copyItem:function(destination,video_id){
	let db = this.getDatabase();
	let st = db.createStatement('INSERT INTO folder(type,parent,video_id) VALUES(1,?1,?2)');
	st.bindInt32Parameter(0,destination);
	st.bindUTF8StringParameter(1,video_id);
	st.execute();
	st.finalize();
    },

    dropItem:function(event){
	this._data = event.dataTransfer;
	let dt = event.dataTransfer;
	let effect = dt.dropEffect; // copy, move
	let target = event.target;
	let target_list_id = target.value;
	let source_list_id = $('folder-listbox').selectedItem.value;
	debugprint($('folder-listbox').selectedItem.label+"/"+source_list_id+"->"+target.label+"/"+target.value);

	for (let i = 0; i < dt.mozItemCount; i++){
	    let node = dt.mozGetDataAt("application/x-moz-node", i);
	    let vid = node.getAttribute('vid');

	    if( this.checkExistItem(target_list_id, vid) ) continue;

	    switch( effect ){
	    case "move":
		this.moveItem(target_list_id, source_list_id, vid);
		RemoveElement(node);
		break;
	    case "copy":
		this.copyItem(target_list_id, vid);
		break;
	    }
	}
    },

    onkeydown:function(event){
	//debugprint(event);
	//this._data = event;
	switch( event.keyCode ){
	case 65: // A
	    if( event.ctrlKey ){
		$('folder-item-listbox').selectAll();
		event.stopPropagation();
		return false;
	    }
	    break;
	case 46: // DEL
	    this.deleteVideo();
	    break;
	}
	return true;
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


    playVideo:function(){
	let item = $('folder-item-listbox').selectedItem;
	if( !item ) return;
	let vid = item.getAttribute('vid');
	this._tab = NicoLivePlaylist.newTab(vid);
	clearInterval(this._starttoplay_timer);
	this._starttoplay_timer = setInterval("NicoLiveFolderDB._playVideo();", 3000);
	this._play_firsttime = 1;
    },
    _playVideo:function(){
	// playing, paused, end
	if(this._tab.contentDocument){
	    try{
		let status, loadratio;
		let flv = this._tab.contentDocument.getElementById('flvplayer').wrappedJSObject.__proto__;
		status = flv.ext_getStatus();
		loadratio = flv.ext_getLoadedRatio();

		if((status=="stopped"||status=="paused") && loadratio>0.1 && this._play_firsttime && flv.ext_getPlayheadTime()==0){
		    flv.ext_play(true);
		    if( this._screensize ){
			flv.ext_setVideoSize( this._screensize );
		    }
		    //flv.ext_setVideoSize("full");
		    this._play_firsttime--;
		    let flvcontainer = this._tab.contentDocument.getElementById('flvplayer_container').wrappedJSObject;
		    this._tab.contentWindow.scroll(0,flvcontainer.offsetTop-32);
		}
		//debugprint(status);
		switch(status){
		case "playing":
		    this._screensize = flv.ext_getVideoSize();
		    break;
		case "end":
		    break;
		}
	    } catch (x) {
//		debugprint(x);
	    }
	}else{
	    clearInterval(this._starttoplay_timer);
	}
    },

    init:function(){
	this.showFolderList();
    }

};

window.addEventListener("load", function(e){ NicoLiveFolderDB.init(); }, false);
