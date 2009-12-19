

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
    },
    move: function(x,y){
	window.moveTo(x,y);
    },
    resize: function(w,h){
	window.resizeTo(w,h);	
    },
    save: function(){
	let pos = {
	    "x" : window.screenX,
	    "y" : window.screenY,
	    "w" : window.outerWidth,
	    "h" : window.outerHeight
	};
	NicoLiveDatabase.saveGPStorage("xywh",pos);
    },
    restore:function(){
	let def = {
	    x:0,
	    y:0,
	    w:0,
	    h:0
	};
	let pos = NicoLiveDatabase.loadGPStorage("xywh",def);
	if( !(pos.x==0 && pos.y==0 && pos.w==0 && pos.h==0) ){
	    this.move(pos.x,pos.y);
	    this.resize(pos.w,pos.h);
	}
    },
    init: function(){
	NicoLiveWindow.restore();
	window.removeEventListener("focus",NicoLiveWindowRestorePosition,false);

	/*
	let id = setInterval(
	    function(){ NicoLiveWindow.restore();
			clearInterval(id); },
	    1000);
	 */
    },
    destroy: function(){
	this.save();
    }
};

function NicoLiveWindowRestorePosition()
{
    NicoLiveWindow.init();
}

window.addEventListener("focus", NicoLiveWindowRestorePosition, false);
window.addEventListener("unload", function(e){ NicoLiveWindow.destroy(); }, false);
