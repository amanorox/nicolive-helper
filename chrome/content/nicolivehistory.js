var NicoLiveHistory = {
    addPlayList:function(item){
	let table = $('playlist-table');
	if(!table) return;

	let tr = table.insertRow(table.rows.length);
	tr.className="table_played";
	let td = tr.insertCell(tr.cells.length);
	td.appendChild(document.createTextNode("#"+table.rows.length));

	td = tr.insertCell(tr.cells.length);
	let vbox = CreateElement('vbox');
	vbox.setAttribute('context','popup-playlist');

	NicoLiveRequest.addVideoInformation(vbox,item);
	td.appendChild(vbox);
    },

    addMylist:function(mylist_id,mylist_name){
	let notes = $('played-list-textbox');
	let substring;
	substring = notes.value.substr(notes.selectionStart,notes.selectionEnd-notes.selectionStart);
	debugprint(substring);

	if(substring.length>=3){
	    if(mylist_id=='default'){
		NicoLiveMylist.addDeflist(substring);
	    }else{
		NicoLiveMylist._addMyList(mylist_id,mylist_name,substring);
	    }
	}
    },

    // 再生履歴にマイリストに追加メニューを追加.
    appendMenu:function(mylists){
	// テキストボックスのコンテキストメニュー
	let notes = $('played-list-textbox');
	let input = document.getAnonymousElementByAttribute(notes, 'anonid', 'input');
	let menu = document.getAnonymousElementByAttribute(input.parentNode, "anonid", "input-box-contextmenu");

	notes.addEventListener('popupshowing',this,false);

	menu.insertBefore( CreateElement('menuseparator'), menu.firstChild );

	let popupmenu = NicoLiveMylist.createAddMylistMenu(mylists);
	popupmenu.setAttribute('id','addto-mylist-from-history');
	popupmenu.addEventListener("command", function(e){
				       NicoLiveHistory.addMylist(e.target.value,e.target.label);
				   },false );
	menu.insertBefore( popupmenu, menu.firstChild);

	// 詳細表示用のコンテキストメニュー.
	popupmenu = NicoLiveMylist.createAddMylistMenu(mylists);
	popupmenu.addEventListener("command",
				   function(e){
				       NicoLiveRequest.addMylist(e.target.value,e.target.label);
				   },false );
	$('popup-playlist').appendChild( popupmenu );
    },

    restorePlaylistText:function(){
	$('played-list-textbox').value = "";
	for(let i=0,item;item=NicoLiveHelper.playlist[i];i++){
	    $('played-list-textbox').value += item.video_id + " " + item.title + "\n";
	}
    },

    handleEvent:function(event){
	if(event.type=='popupshowing'){
	    let hidden = true;
	    let notes = $('played-list-textbox');
	    let n = notes.selectionEnd-notes.selectionStart;
	    if(n>0){
		hidden = false;
	    }
	    $('addto-mylist-from-history').hidden = hidden;
	}
    },

    init:function(){
    }
};

window.addEventListener("load", function(e){ NicoLiveHistory.init(); }, false);
