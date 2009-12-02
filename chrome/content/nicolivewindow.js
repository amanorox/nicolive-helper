

var NicoLiveWindow = {
    setWindowList:function(){
	this.winlist = WindowEnumerator();
	while($('popup-windowlist').firstChild){
	    $('popup-windowlist').removeChild( $('popup-windowlist').firstChild );
	}
	for(let i=0,win;win=this.winlist[i];i++){
	    let menuitem;
	    let title = win.document.title.replace(/\(NicoLive\sHelper\)/,'');
	    menuitem = CreateMenuItem(title,i);
	    menuitem.addEventListener("command",function(e){ NicoLiveWindow.winlist[e.target.value].focus(); },false);
	    $('popup-windowlist').appendChild(menuitem);
	}
	return true;
    }
};
