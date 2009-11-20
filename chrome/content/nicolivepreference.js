/**
 * 設定
 */

var NicoLivePreference = {
    readAdvancedPrefs:function(){
	let branch = this.getBranch();
	this.videoinfo[0] = branch.getUnicharPref("videoinfo1");
	this.videoinfo[1] = branch.getUnicharPref("videoinfo2");
	this.videoinfo[2] = branch.getUnicharPref("videoinfo3");

	this.msg_deleted   = branch.getUnicharPref("msg-deleted");
	this.msg_notaccept = branch.getUnicharPref("msg-notaccept");
	this.msg_newmovie  = branch.getUnicharPref("msg-newmovie");
	this.msg_played    = branch.getUnicharPref("msg-played");
	this.msg_requested = branch.getUnicharPref("msg-requested");
	this.msg_accept    = branch.getUnicharPref("msg-accept");

	this.caster_comment_type = branch.getIntPref("comment-type-of-videoinfo");

	this.topmost = branch.getBoolPref("z-order");
	SetWindowTopMost(this.topmost);
    },

    readBasicPrefs:function(){
	let branch = this.getBranch();

	this.isjingle = branch.getBoolPref("jingle");
	this.jinglemovie = branch.getCharPref("jingle-movie");
	this.limit30min = branch.getBoolPref("limit30min");
	this.carelosstime = branch.getBoolPref("carelosstime");
	this.nextplay_interval = branch.getIntPref("nextplay-interval");
	this.max_movieplay_time = branch.getIntPref("max-movieplay-time");

	this.isautoreply = branch.getBoolPref("autoreply");
	this.limitnewmovie = branch.getBoolPref("limitnewmovie");
	this.nreq_per_ppl = branch.getIntPref("accept-nreq");

	this.mikuonly = branch.getBoolPref("mikuonly");

	$('pref-jingle').checked = this.isjingle;
	$('pref-jingle-movie').value = this.jinglemovie;
	$('pref-limit30min').checked = this.limit30min;
	$('pref-carelosstime').checked = this.carelosstime;
	$('pref-nextplay-interval').value = this.nextplay_interval;
	$('pref-movieplay-time').value = this.max_movieplay_time;
	$('pref-autoreply').checked = this.isautoreply;
	$('pref-limitnewmovie').checked = this.limitnewmovie;
	$('pref-accept-nreq').value = this.nreq_per_ppl;
	$('pref-mikuonly').checked = this.mikuonly;
    },

    // 適用ボタンを押したとき、prefs.jsの保存とHelperへの設定値の適用.
    applyBasicPrefs:function(){
	this.isjingle = $('pref-jingle').checked;
	this.jinglemovie = $('pref-jingle-movie').value;
	this.limit30min = $('pref-limit30min').checked;
	this.carelosstime = $('pref-carelosstime').checked;
	this.nextplay_interval = parseInt( $('pref-nextplay-interval').value );
	this.max_movieplay_time = parseInt( $('pref-movieplay-time').value );
	this.isautoreply = $('pref-autoreply').checked;
	this.limitnewmovie = $('pref-limitnewmovie').checked;
	this.nreq_per_ppl = $('pref-accept-nreq').value;
	this.mikuonly = $('pref-mikuonly').checked;

	let branch = this.getBranch();
	branch.setBoolPref("jingle",this.isjingle);
	branch.setCharPref("jingle-movie",this.jinglemovie);
	branch.setBoolPref("limit30min",this.limit30min);
	branch.setBoolPref("carelosstime",this.carelosstime);
	branch.setIntPref("nextplay-interval",this.nextplay_interval);
	branch.setIntPref("max-movieplay-time",this.max_movieplay_time);
	branch.setBoolPref("autoreply",this.isautoreply);
	branch.setBoolPref("limitnewmovie",this.limitnewmovie);
	branch.setIntPref("accept-nreq",this.nreq_per_ppl);

	branch.setBoolPref("mikuonly",this.mikuonly);

	$('noticewin').removeAllNotifications(false);
	$('noticewin').appendNotification('設定を反映しました',null,null,$('noticewin').PRIORITY_INFO_HIGH,null);
    },

    getCommentDir:function(){
	return this.getBranch().getFilePref('commentlogDir');
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
	this.readBasicPrefs();
	this.readAdvancedPrefs();
    },

    init:function(){
	this.videoinfo = new Array();
	this.readBasicPrefs();
	this.readAdvancedPrefs();
	this.register();
    },
    destroy:function(){
	this.unregister();
    }
};

window.addEventListener("load", function(e){ NicoLivePreference.init(); }, false);
window.addEventListener("unload", function(e){ NicoLivePreference.destroy(); }, false);
