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
	let dw = window.outerWidth-window.innerWidth;
	let dh = window.outerHeight-window.innerHeight;
	this.resize(720+dw,512+dh);
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
