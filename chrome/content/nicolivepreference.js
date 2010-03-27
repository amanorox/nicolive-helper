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
/**
 * 設定
 */
var NicoLivePreference = {
    readAdvancedPrefs:function(fromobserver){
	let branch = this.getBranch();
	this.nocomment_for_directplay = branch.getBoolPref("nocomment-for-directplay");

	this.listenercommand = new Object();
	try{
	    this.listenercommand.enable = branch.getBoolPref("listenercommand.enable");
	    this.listenercommand.s      = branch.getUnicharPref("listenercommand.s");
	    this.listenercommand.del    = branch.getUnicharPref("listenercommand.del");
	} catch (x) {
	    this.listenercommand.enable = false;
	    this.listenercommand.s      = "";
	    this.listenercommand.del    = "";
	}

	// 動画情報.
	for(let i=0;i<4;i++){
	    this.videoinfo[i] = new Object();
	    this.videoinfo[i].comment = branch.getUnicharPref("videoinfo"+(i+1));
	    this.videoinfo[i].command = branch.getUnicharPref("videoinfo"+(i+1)+"-command");
	}
	this.revert_videoinfo = branch.getIntPref("revert-videoinfo");

	this.msg = new Object();

	// リクエストの自動応答.
	this.msg.deleted   = branch.getUnicharPref("msg-deleted");
	this.msg.notaccept = branch.getUnicharPref("msg-notaccept");
	this.msg.newmovie  = branch.getUnicharPref("msg-newmovie");
	this.msg.played    = branch.getUnicharPref("msg-played");
	this.msg.requested = branch.getUnicharPref("msg-requested");
	this.msg.accept    = branch.getUnicharPref("msg-accept");
	this.msg.requestok = branch.getUnicharPref("msg-requestok");
	this.msg.requestng = branch.getUnicharPref("msg-requestng");
	this.msg.requestok_command = branch.getUnicharPref("msg-requestok-command");
	this.msg.requestng_command = branch.getUnicharPref("msg-requestng-command");
	this.msg.lessmylists = branch.getUnicharPref("msg-lessmylists");
	this.msg.greatermylists = branch.getUnicharPref("msg-greatermylists");
	this.msg.lessviews = branch.getUnicharPref("msg-lessviews");
	this.msg.greaterviews = branch.getUnicharPref("msg-greaterviews");
	this.msg.longertime = branch.getUnicharPref("msg-longertime");
	this.msg.outofdaterange = branch.getUnicharPref("msg-outofdaterange");
	this.msg.requiredkeyword = branch.getUnicharPref("msg-requiredkeyword");
	this.msg.forbiddenkeyword = branch.getUnicharPref("msg-forbiddenkeyword");
	this.msg.limitnumberofrequests = branch.getUnicharPref("msg-limitnumberofrequests");

	this.caster_comment_type = branch.getIntPref("comment-type-of-videoinfo");

	this.comment184 = branch.getBoolPref("184comment");

	this.notice = {};
	this.notice.area    = branch.getBoolPref("notice.area");
	this.notice.dialog  = branch.getBoolPref("notice.dialog");
	this.notice.comment = branch.getBoolPref("notice.comment");

	this.topmost = branch.getBoolPref("z-order");
	SetWindowTopMost(window,this.topmost);

	this.startup_comment = branch.getUnicharPref("startup-comment");

	// リクエスト制限設定.
	let restrict = {};
	restrict.numberofrequests = this.nreq_per_ppl;
	restrict.dorestrict = branch.getBoolPref("request.restrict");
	restrict.date_from  = branch.getCharPref("request.date-from");
	restrict.date_to    = branch.getCharPref("request.date-to");
	restrict.mylist_from= branch.getIntPref("request.mylist-from");
	restrict.mylist_to  = branch.getIntPref("request.mylist-to");
	let exclude = branch.getUnicharPref("request.tag-exclude");
	restrict.tag_exclude = new Array();
	if(exclude.length>0){
	    restrict.tag_exclude = exclude.split(/\s+/);
	}
	let include = branch.getUnicharPref("request.tag-include");
	restrict.tag_include = new Array();
	if(include.length>0){
	    restrict.tag_include = include.split(/\s+/);
	}
	restrict.videolength = branch.getIntPref("request.videolength");
	restrict.view_from   = branch.getIntPref("request.view-from");
	restrict.view_to     = branch.getIntPref("request.view-to");
	this.restrict = restrict;

	NicoLiveComment.loadPresetAutocomplete();

	this.ngwordfiltering = branch.getBoolPref("ngwordfiltering");

	this.do_customscript = branch.getBoolPref("custom-script");
	this.customscript = NicoLiveDatabase.loadGPStorage('nico_live_customscript',{});

	this.readClasses();
	this.readFont();
    },

    readFont:function(){
	let branch = this.getBranch();
	try{
	    this.font = branch.getUnicharPref("font");
	    $('requestwindow').style.fontFamily = this.font;
	} catch (x) {
	}
    },

    // 動画分類設定を読みこむ.
    readClasses:function(){
	let branch = this.getBranch();
	this.do_classify = branch.getBoolPref("do-classify");
	try{
	    this.classes = eval(branch.getUnicharPref("classes-value"));
	} catch (x) {
	    this.classes = new Array();
	}
	if( !this.classes || this.classes.length<=0 ) this.setDefaultClass();
	for(let i=0;i<this.classes.length;i++){
	    this.classes["_"+this.classes[i].label] = this.classes[i].color;
	}

	let menus = evaluateXPath(document,"//*[@class='training-menu']");
	for(let i=0,menu; menu=menus[i];i++){
	    while(menu.firstChild) RemoveElement(menu.firstChild);
	    for(let j=0,cls; cls=this.classes[j]; j++){
		menu.appendChild( CreateMenuItem(cls['name'],cls['label']) );
	    }
	}
    },
    setDefaultClass:function(){
	this.classes = new Array();
	this.classes.push({"name":"初音ミク","label":"Miku","color":"#7fffbf"});
	this.classes.push({"name":"鏡音リン・レン","label":"RinLen","color":"#ffff00"});
	this.classes.push({"name":"巡音ルカ","label":"Luka","color":"#ffb2d3"});
	this.classes.push({"name":"その他","label":"Other","color":"#ffeeee"});
	this.classes.push({"name":"NG","label":"NG","color":"#888888"});
    },

    readBasicPrefs:function(fromobserver){
	let branch = this.getBranch();

	this.playstyle = branch.getIntPref("playstyle");

	this.isjingle = branch.getBoolPref("jingle");
	this.jinglemovie = branch.getCharPref("jingle-movie");
	this.limit30min = branch.getBoolPref("limit30min");
	this.carelosstime = branch.getBoolPref("carelosstime");
	this.nextplay_interval = branch.getIntPref("nextplay-interval");
	this.max_movieplay_time = branch.getIntPref("max-movieplay-time");
	if( 'undefined'!=typeof NicoLiveHelper.requestqueue ){
	    NicoLiveHelper.updateRemainRequestsAndStocks();
	}

	this.isautoreply = branch.getBoolPref("autoreply");
	this.show_autoreply = branch.getBoolPref("show-autoreply"); // リクエストの応答を運営コメ欄に表示する.
	this.limitnewmovie = branch.getBoolPref("limitnewmovie");
	this.accept_playedvideo = branch.getBoolPref("accept-playedvideo");
	this.nreq_per_ppl = branch.getIntPref("accept-nreq");

	this.mikuonly = branch.getBoolPref("mikuonly");
	this.doprepare = branch.getBoolPref("prepare");

	if(!fromobserver){
	    // NicoLiveHelper側でNicoLivePreferenceを読むからここでセットする必要なし.
	    //NicoLiveHelper.setPlayStyle(this.playstyle);
	    //NicoLiveHelper.allowrequest = this.allowrequest;
	    this.allowrequest = branch.getBoolPref("allowrequest");
	    $('toolbar-allowrequest').label = this.allowrequest?"リクエスト許可":"リクエスト不可";
	}
    },

    readUserDefinedValueURI:function(){
	let branch = this.getBranch();
	let uri;
	try{
	    uri = branch.getCharPref("userdefined-data-uri");
	} catch (x) {
	    uri = "";
	}
	return uri;
    },

    writePlayStyle:function(){
	let branch = this.getBranch();
	branch.setBoolPref("allowrequest",NicoLiveHelper.allowrequest);
	branch.setIntPref("playstyle",NicoLiveHelper.playstyle);
    },

    isSingleWindowMode:function(){
	try{
	    return this.getBranch().getBoolPref("singlewindow");
	} catch (x) {
	    return false;
	}
    },

    isLoadAllMylist:function(){
	try{
	    return this.getBranch().getBoolPref("load-all-mylist");
	} catch (x) {
	    return false;
	}
    },

    getCommentDir:function(){
	try{
	    return this.getBranch().getFilePref('commentlogDir');
	} catch (x) {
	    return null;
	}
    },
    getContinuousCommentDir:function(){
	try{
	    return this.getBranch().getFilePref('continuous-commentDir');
	} catch (x) {
	    return null;
	}
    },

    getBranch:function(){
	var prefs = new PrefsWrapper1("extensions.nicolivehelper.");
	return prefs;
    },

    register:function(){
	let prefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
	this._branch = prefService.getBranch("extensions.nicolivehelper.");
	this._branch.QueryInterface(Components.interfaces.nsIPrefBranch2);
	this._branch.addObserver("", this, false);
    },

    unregister:function(){
	if(!this._branch) return;
	this._branch.removeObserver("", this);
    },

    observe:function(aSubject, aTopic, aData){
	if(aTopic != "nsPref:changed") return;
	this.readBasicPrefs(true);
	this.readAdvancedPrefs(true);
    },

    init:function(){
	this.videoinfo = new Array();
	this.readBasicPrefs();
	this.readAdvancedPrefs();
	this.register();
	debugprint('NicoLivePreference.init');
    },
    destroy:function(){
	this.writePlayStyle();
	this.unregister();
    }
};

function NicoLiveUpdateWindowZOrder(){
    let branch = NicoLivePreference.getBranch();
    let topmost = branch.getBoolPref("z-order");
    SetWindowTopMost(window,topmost);
    //Application.console.log('update z-order');
}

window.addEventListener("load", function(e){ NicoLivePreference.init(); }, false);
window.addEventListener("unload", function(e){ NicoLivePreference.destroy(); }, false);
window.addEventListener("resize", NicoLiveUpdateWindowZOrder, false );
