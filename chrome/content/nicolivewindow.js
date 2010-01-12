

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
	    "w" : window.innerWidth,
	    "h" : window.innerHeight
	};
	//NicoLiveDatabase.saveGPStorage("xywh",pos);
	if(!window.fullScreen){
	    NicoLivePreference.getBranch().setCharPref("window-pos",JSON.stringify(pos));
	}
    },

    defaultSize:function(){
	this.resize(720,512);
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
	let prefs = NicoLivePreference.getBranch();
	if( prefs.getBoolPref("autoscroll") ){
	    try{
		let player = window.opener.content.document.getElementById('WatchPlayer');
		window.opener.content.scroll(0,player.offsetTop-32);
	    } catch (x) {
	    }
	}
    },
    destroy: function(){
	this.save();
    }
};

function NicoLiveWindowRestorePosition()
{
    NicoLiveWindow.init();
}

window.addEventListener("load", function(e){ NicoLiveWindow.init(); }, false);
window.addEventListener("unload", function(e){ NicoLiveWindow.destroy(); }, false);
