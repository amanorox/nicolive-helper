
var NicoLiveOverlay = {
    insertHistory:function(url,title){
	let menu = document.getElementById('nicolive-menu-popup');
	for(let i=0,item;item=menu.children[i];i++){
	    if(item.value==url){
		return;
	    }
	}

	if(menu.children.length>=20){
	    menu.removeChild(menu.lastChild);
	}
	
	let elem = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",'menuitem');
	elem.setAttribute('label',title);
	elem.setAttribute('value',url);
	elem.addEventListener('command', function(e){ window.content.location.href = "http://live.nicovideo.jp/watch/"+e.target.value; }, false );
	menu.insertBefore(elem,menu.firstChild);
    },

    open:function(url,title,iscaster){
	let prefs = new PrefsWrapper1("extensions.nicolivehelper.");
	let pos;
	try {
	    pos = JSON.parse( prefs.getCharPref("window-pos") );
	} catch (x) {
	    pos = { x:0, y:0, w:0, h:0 };
	}
	let feature="chrome,resizable=yes";
	if( !(pos.x==0 && pos.y==0 && pos.w==0 && pos.h==0) ){
	    feature += ",width="+pos.w+",height="+pos.h;
	    feature += ",top="+pos.y+",left="+pos.x;
	}else{
	    feature += ",centerscreen,width=720,height=512";
	}
	Application.storage.set("nico_request_id",url);
	Application.storage.set("nico_live_title",title);
	Application.storage.set("nico_live_caster",iscaster);
	window.open("chrome://nicolivehelper/content/requestwindow.xul","NLH_"+url,feature).focus();

	this.insertHistory(url,title);
	//Application.console.log(url+' '+title);
    },

    openNicoLiveWindow:function(){
	let url = window.content.location.href;
	url = url.match(/lv\d+/);
	if(!url) url="lv0";

	let title;
	let iscaster = true;
	try{
	    title = window.content.document.getElementById("title").textContent;
	} catch (x) {
	    title = "タイトルなし";
	}
	if(url!="lv0"){
	    if( !window.content.document.body.innerHTML.match(/console\.swf/) ){
		iscaster = false;
	    }
	}
	this.open(url,title,iscaster);
    },

    onPageLoad:function(e){
	let player;
	try{
	    // 生放送のページかどうか.
	    player = e.target.getElementById("WatchPlayer");
	} catch (x) {
	}
	let iscaster = false;
	if( !player ) return;

	// innerHTMLを見るしかできないのです.
	if(player.innerHTML.match(/console\.swf/)){
	    iscaster = true;
	}

	let prefs = new PrefsWrapper1("extensions.nicolivehelper.");
	if( prefs.getBoolPref("autowindowopen") && iscaster ||
	    prefs.getBoolPref("autowindowopen-listener") && !iscaster ){
	    let url = e.target.location.href;
	    url = url.match(/lv\d+/);
	    if(url){
		let title;
		try{
		    title = e.target.getElementById("title").textContent;
		    this.open(url,title,iscaster);
		} catch (x) {
		}
	    }
	}
    },

    init:function(){
	let appcontent = document.getElementById("appcontent");   // ブラウザ
	if(appcontent){
	    appcontent.addEventListener("DOMContentLoaded",
					function(e){
					    NicoLiveOverlay.onPageLoad(e);
					},true);
	}
	this.nicolivehistory = new Array();
    }
};

window.addEventListener("load", function() { NicoLiveOverlay.init(); }, false);
