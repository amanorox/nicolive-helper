
var NicoLiveOverlay = {
    open:function(url,title,iscaster){
	let feature="chrome,centerscreen,resizable=yes,width=720,height=512";
	Application.storage.set("nico_request_id",url);
	Application.storage.set("nico_live_title",title);
	Application.storage.set("nico_live_caster",iscaster);
	window.open("chrome://nicolivehelper/content/requestwindow.xul","NLH_"+url,feature).focus();
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
    }
};

window.addEventListener("load", function() { NicoLiveOverlay.init(); }, false);
