var NicoLiveHistory = {

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

    appendMenu:function(mylists){
	let notes = $('played-list-textbox');
	let input = document.getAnonymousElementByAttribute(notes, 'anonid', 'input');
	let menu = document.getAnonymousElementByAttribute(input.parentNode, "anonid", "input-box-contextmenu");

	notes.addEventListener('popupshowing',this,false);

	menu.insertBefore( CreateElement('menuseparator'),menu.firstChild );

	let popupmenu = CreateElement('menu');
	popupmenu.setAttribute('label','マイリストに追加');
	popupmenu.setAttribute('id','addto-mylist-from-history');
	menu.insertBefore( popupmenu, menu.firstChild);

	let popup = CreateElement('menupopup');
	popupmenu.appendChild(popup);

	let elem = CreateMenuItem('とりあえずマイリスト','default');
	elem.addEventListener("command", function(e){ NicoLiveHistory.addMylist(e.target.value,e.target.label); },false );
	popup.appendChild(elem);

	for(let i=0,item;item=mylists[i];i++){
	    let elem;
	    let tmp = item.name.match(/.{1,20}/);
	    elem = CreateMenuItem(tmp,item.id);
	    elem.addEventListener("command",function(e){ NicoLiveHistory.addMylist(e.target.value,e.target.label);},false);
	    popup.appendChild(elem);
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
