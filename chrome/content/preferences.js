var NLHPreference = {

    previewVideoInfo:function(str){
	let info = {
	    cno: 99,
	    tags: ["ミクオリジナル曲","初音ミク","くちばしP","私の時間","VOCALOID殿堂入り","6/17発売「Vocalostar」収録曲","かわいいミクうた","弾幕ソング","職人とみんなの暖かいコメで作る動画"],
	    video_id: "sm1340413",
	    title: "初音ミクオリジナル「私の時間」",
	    description: "ボカロユーザー、リスナーの皆に捧ぐ音楽joysoundで配信されています作品リストmylist/7新曲sm75641558/11新曲sm790612810/31新曲sm866756511/4新曲sm871253212/13新曲sm908468180万ありがとうございます！ありがとうございます！歌声途切れなすぎです！",
	    thumbnail_url:"http://tn-skr2.smilevideo.jp/smile?i=1340413",
	    first_retrieve: 1193051579,
	    length: "4:28",
	    length_ms: 268000,
	    view_counter: 828280,
	    comment_num: 88034,
	    mylist_counter: 31815,
	    highbitrate: "619.70",
	    lowbitrate: "314.99",
	    pname: "くちばしP"
	};
	str = window.opener.NicoLiveHelper.replaceMacros(str,info);
	str = str.replace(/<\/(.*?)>/g,"</html:$1>");
	str = str.replace(/<([^/].*?)>/g,"<html:$1>");
	str = str.replace(/html:br/g,"html:br/");
	Application.console.log(str);
	$('preview-videoinfo').innerHTML = str;
    },

    initDB:function(){
	this.dbconnect = opener.NicoLiveDatabase.dbconnect;
    },

    // 運営コメントプリセット.
    createPresetCommentMenu:function(){
	this.presetcomment = opener.NicoLiveDatabase.loadGPStorage('nico_live_commentpreset',{});
	for (presetname in this.presetcomment){
	    let menuitem = CreateMenuItem(presetname,'');
	    menuitem.addEventListener("command",
				      function(e){
					  $('id-comment-preset-name').value = e.target.label;
					  NLHPreference.setPresetComment(e.target.label);
				      },false);
	    $('id-menu-comment-preset').insertBefore(menuitem,$('id-menu-comment-preset').lastChild);
	}
    },
    setPresetComment:function(presetname){
	let data = this.presetcomment[presetname];
	$('pref-msg-deleted').value = data["deleted"];
	$('pref-msg-notaccept').value = data["notaccept"];
	$('pref-msg-newmovie').value = data["newmovie"];
	$('pref-msg-played').value = data["played"];
	$('pref-msg-requested').value = data["requested"];
	$('pref-msg-accept').value = data["accept"];
	$('pref-msg-requestok').value = data["requestok"];
	$('pref-msg-requestng').value = data["requestng"];
	$('pref-msg-requestok-command').value = data["requestok_command"];
	$('pref-msg-requestng-command').value = data["requestng_command"];
	$('pref-startup-comment').value = data["startup_comment"];
	$('pref-msg-lessmylists').value = data["lessmylists"];
	$('pref-msg-greatermylists').value = data["greatermylists"];
	$('pref-msg-lessviews').value = data["lessviews"];
	$('pref-msg-greaterviews').value = data["greaterviews"];
	$('pref-msg-longertime').value = data["longertime"];
	$('pref-msg-outofdaterange').value = data["outofdaterange"];
	$('pref-msg-requiredkeyword').value = data["requiredkeyword"];
	$('pref-msg-forbiddenkeyword').value = data["forbiddenkeyword"];
	$('pref-msg-limitnumberofrequests').value = data["limitnumberofrequests"];
    },
    addPresetComment:function(presetname){
	let data = {
	    "deleted":$('pref-msg-deleted').value,
	    "notaccept":$('pref-msg-notaccept').value,
	    "newmovie":$('pref-msg-newmovie').value,
	    "played":$('pref-msg-played').value,
	    "requested":$('pref-msg-requested').value,
	    "accept":$('pref-msg-accept').value,
	    "requestok":$('pref-msg-requestok').value,
	    "requestng":$('pref-msg-requestng').value,
	    "requestok_command":$('pref-msg-requestok-command').value,
	    "requestng_command":$('pref-msg-requestng-command').value,
	    "startup_comment":$('pref-startup-comment').value,
	    "lessmylists":$('pref-msg-lessmylists').value,
	    "greatermylists":$('pref-msg-greatermylists').value,
	    "lessviews":$('pref-msg-lessviews').value,
	    "greaterviews":$('pref-msg-greaterviews').value,
	    "longertime":$('pref-msg-longertime').value,
	    "outofdaterange":$('pref-msg-outofdaterange').value,
	    "requiredkeyword":$('pref-msg-requiredkeyword').value,
	    "forbiddenkeyword":$('pref-msg-forbiddenkeyword').value,
	    "limitnumberofrequests":$('pref-msg-limitnumberofrequests').value
	};
	this.presetcomment[presetname] = data;
	opener.NicoLiveDatabase.saveGPStorage('nico_live_commentpreset',this.presetcomment);

	let existmenu = evaluateXPath(document,"//*[@id='id-menu-comment-preset']/*[@label='"+presetname+"']");
	if(existmenu.length) return;

	let menuitem = CreateMenuItem(presetname,'');
	menuitem.addEventListener("command",
				 function(e){
				     $('id-comment-preset-name').value = e.target.label;
				     NLHPreference.setPresetComment(e.target.label);
				 },false);
	$('id-menu-comment-preset').insertBefore(menuitem,$('id-menu-comment-preset').lastChild);
    },
    // 運営コメントプリセットから削除.
    deletePresetComment:function(presetname){
	delete this.presetcomment[presetname];
	opener.NicoLiveDatabase.saveGPStorage('nico_live_commentpreset',this.presetcomment);
	let existmenu = evaluateXPath(document,"//*[@id='id-menu-comment-preset']/*[@label='"+presetname+"']");
	if(existmenu.length){
	    RemoveElement(existmenu[0]);
	}
    },

    // P名ホワイトリスト.
    savePNameWhitelist:function(){
	opener.NicoLiveDatabase.saveGPStorage('nicolive_pnamewhitelist',$('pname-whitelist').value);
    },
    loadPNameWhitelist:function(){
	let pname = opener.NicoLiveDatabase.loadGPStorage('nicolive_pnamewhitelist','');
	$('pname-whitelist').value = pname;
    },

    // リク制限のプリセットをDBに登録する.
    savePresetRequestCond:function(name,obj){
	let st;
	let value = JSON.stringify(obj);
	//Application.console.log(value);
	try{
	    st = this.dbconnect.createStatement('insert into requestcond(presetname,value) values(?1,?2)');
	    st.bindUTF8StringParameter(0,name);
	    st.bindUTF8StringParameter(1,value);
	    st.execute();
	    st.finalize();
	} catch (x) {
	    st = this.dbconnect.createStatement('update requestcond set value=?1 where presetname=?2');
	    st.bindUTF8StringParameter(0,value);
	    st.bindUTF8StringParameter(1,name);
	    st.execute();
	    st.finalize();
	}
    },

    // リク制限のプリセット名を読む.
    readPresetCondName:function(){
	let st = this.dbconnect.createStatement('SELECT presetname FROM requestcond');
	let preset = new Array();
	while(st.step()){
	    preset.push(st.getString(0));
	}
	st.finalize();
	return preset;
    },

    // リク制限設定をDBからロードして入力欄にセットする.
    loadRestrictionPreset:function(name){
	$('id-edit-presetname').value = name;

	let st = this.dbconnect.createStatement('SELECT value FROM requestcond where presetname=?1');
	st.bindUTF8StringParameter(0,name);
	let value = "";
	while(st.step()){
	    value=st.getString(0);
	}
	st.finalize();
	try{
	    let item = JSON.parse(value);
	    $('pref-restrict-date-from').value = item.date_from;
	    $('pref-restrict-date-to').value   = item.date_to;
	    $('pref-restrict-view-from').value = item.view_from;
	    $('pref-restrict-view-to').value   = item.view_to;
	    $('pref-restrict-mylist-from').value= item.mylist_from;
	    $('pref-restrict-mylist-to').value  = item.mylist_to;
	    $('pref-restrict-videolength').value= item.videolength;
	    $('pref-restrict-tag-include').value= item.tag_include;
	    $('pref-restrict-tag-exclude').value= item.tag_exclude;
	    $('pref-date-from').value = $('pref-restrict-date-from').value;
	    $('pref-date-to').value = $('pref-restrict-date-to').value;
	} catch (x) {}
    },

    // プリセットをDBに登録する.
    addPreset:function(name){
	if(name.length<=0) return;
	let item = {};
	item.date_from     = $('pref-restrict-date-from').value;
	item.date_to       = $('pref-restrict-date-to').value;
	item.view_from     = $('pref-restrict-view-from').value;
	item.view_to       = $('pref-restrict-view-to').value;
	item.mylist_from   = $('pref-restrict-mylist-from').value;
	item.mylist_to     = $('pref-restrict-mylist-to').value;
	item.videolength   = $('pref-restrict-videolength').value;
	item.tag_include   = $('pref-restrict-tag-include').value;
	item.tag_exclude   = $('pref-restrict-tag-exclude').value;
	this.savePresetRequestCond(name,item);

	let existmenu;
	existmenu = evaluateXPath(document,"//*[@id='id-menu-preset']/*[@label='"+name+"']");
	if( existmenu.length ) return;

	let elem = CreateMenuItem(name,"");
	elem.addEventListener("command",
			      function(e){
				  $('id-preset-name').value=e.target.label;
				  NLHPreference.loadRestrictionPreset(e.target.label);
			      },
			      false);
	$('id-menu-preset').appendChild(elem);
    },

    // プリセットをDBから削除する
    delPreset:function(name){
	if(name.length<=0) return;
	let st = this.dbconnect.createStatement('DELETE FROM requestcond where presetname=?1');
	st.bindUTF8StringParameter(0,name);
	st.execute();
	st.finalize();

	let existmenu;
	existmenu = evaluateXPath(document,"//*[@id='id-menu-preset']/*[@label='"+name+"']");
	if( existmenu.length ){
	    RemoveElement(existmenu[0]);
	}
    },

    // リクエスト制限タブをリセットする.
    resetRequestRestriction:function(){
	// reset()がなぜか使えないので.
	$('id-preset-name').value = "";
	$('pref-restrict-date-from').value = "2007-08-31";
	$('pref-restrict-date-to').value = "2007-08-31";
	$('pref-restrict-view-from').value = 0;
	$('pref-restrict-view-to').value = 0;
	$('pref-restrict-mylist-from').value = 0;
	$('pref-restrict-mylist-to').value = 0;
	$('pref-restrict-videolength').value = 0;
	$('pref-restrict-tag-include').value = "";
	$('pref-restrict-tag-exclude').value = "";
    },

    // 動画情報をデフォルトにする.
    resetMovieInfo:function(){
	/*
	 * 再生数/{view} コメント/{comment} マイリスト/{mylist}({mylistrate})<br>{pname}
	 * タグ/{tags}
	 * ♪{id} {title}<br>投稿日/{date} 時間/{length}<br>{additional}
	 */
	$('pref-videoinfo1').value = "♪Length:{length} Views:{view} Comments:{comment} NumMylist:{mylist}";
	$('pref-videoinfo2').value = "♪{title}<br>Date:{date}";
	$('pref-videoinfo3').value = "";
	$('pref-videoinfo4').value = "";
	$('pref-typeofvideoinfo').value = 0;
	$('pref-revert-videoinfo').value = 0;
	$('pref-userdefined-uri').value = "";

	$('pref-videoinfo1-command').value = "";	
	$('pref-videoinfo2-command').value = "";	
	$('pref-videoinfo3-command').value = "";	
	$('pref-videoinfo4-command').value = "";	
    },

    // 運営コメントをデフォルトにする.
    resetAutoReply:function(){
	$('pref-msg-deleted').value   = "その動画は削除されているか、見つかりません";
	$('pref-msg-notaccept').value = "現在リクエストを受け付けていません";
	$('pref-msg-newmovie').value  = "その動画は7日以内に投稿された動画です(新着制限)";
	$('pref-msg-played').value    = "その動画は既に再生されました";
	$('pref-msg-requested').value = "その動画は既にリクエストされています";
	$('pref-msg-accept').value    = "リクエストを受け付けました";
	$('pref-msg-requestok').value = "";
	$('pref-msg-requestng').value = "";
	$('pref-msg-requestok-command').value = "";
	$('pref-msg-requestng-command').value = "";
	$('pref-startup-comment').value = "";

	$('pref-msg-lessmylists').value = "リクエストエラー:マイリスト数が少ないです";
	$('pref-msg-greatermylists').value = "リクエストエラー:マイリスト数が多いです";
	$('pref-msg-lessviews').value = "リクエストエラー:再生数が少ないです";
	$('pref-msg-greaterviews').value = "リクエストエラー:再生数が多いです";
	$('pref-msg-longertime').value = "リクエストエラー:再生時間が長いです";
	$('pref-msg-outofdaterange').value = "リクエストエラー:投稿日時が範囲外です";
	$('pref-msg-requiredkeyword').value = "リクエストエラー:タグにキーワードが含まれていません<br>{=info.restrict.requiredkeyword}";
	$('pref-msg-forbiddenkeyword').value = "リクエストエラー:タグに「{=info.restrict.forbiddenkeyword}」が含まれています";
	$('pref-msg-limitnumberofrequests').value = "リクエストは1人{=info.restrict.numberofrequests.toString()}件までです";
    },

    // 視聴者コマンドの応答をリセットする.
    resetListenerCommand:function(){
	$('pref-cmd-s').value = "リクエスト:{requestnum}件({requesttime}) ストック:{stocknum}件({stocktime})<br>現在:{=NicoLiveHelper.allowrequest?\"リクエスト受付中\":\"リクエスト受付停止中\"}";
	$('pref-cmd-del').value = ">>{=info.comment_no} {=info.cancelnum}件のリクエストを削除しました";
    },

    // コメントログの保存先を選択.
    refDirectory:function(){
	const nsIFilePicker = Components.interfaces.nsIFilePicker;
	var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
	fp.init(window, "コメントログの保存先を指定してください", nsIFilePicker.modeGetFolder);
	var rv = fp.show();
	if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
	    var file = fp.file;
	    // Get the path as string. Note that you usually won't 
	    // need to work with the string paths.
	    var path = fp.file.path;
	    // work with returned nsILocalFile...
	    debugprint('commentlog='+path);

	    $('pref-commentlogDir').value = file;
	    $('commentlog').file = file;
	    $('commentlog').label = path;
	}
    },

    refContinuousCommentDirectory:function(){
	const nsIFilePicker = Components.interfaces.nsIFilePicker;
	var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
	fp.init(window, "連続コメント用テキストファイルの保存先を指定してください", nsIFilePicker.modeGetFolder);
	var rv = fp.show();
	if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
	    var file = fp.file;
	    // Get the path as string. Note that you usually won't 
	    // need to work with the string paths.
	    var path = fp.file.path;
	    // work with returned nsILocalFile...
	    debugprint('continuous comment dir='+path);

	    $('pref-continuousCommentDir').value = file;
	    $('continuouscomment').file = file;
	    $('continuouscomment').label = path;
	}
    },

    // リクエスト制限のプリセット読み込みメニューを作成など.
    updateRestrictPane:function(){
	$('pref-date-from').value = $('pref-restrict-date-from').value;
	$('pref-date-to').value = $('pref-restrict-date-to').value;

	let preset = this.readPresetCondName();
	for(let i=0,item;item=preset[i];i++){
	    let elem = CreateMenuItem(item,"");
	    elem.addEventListener("command",
				  function(e){
				      $('id-preset-name').value=e.target.label;
				      NLHPreference.loadRestrictionPreset(e.target.label);
				  },
				  false);
	    $('id-menu-preset').appendChild(elem);
	}
    },

    updateFilePicker:function(){
        var file = $('pref-commentlogDir').value;
        if (file) {
            var fileField = $('commentlog');
            fileField.file = file;
            fileField.label = file.path;
        }
	file = $('pref-continuousCommentDir').value;
        if (file) {
            var fileField = $('continuouscomment');
            fileField.file = file;
            fileField.label = file.path;
        }
    },

    saveScript:function(){
	let data = new Object();
	data.requestchecker = $('custom-script').value;
	opener.NicoLiveDatabase.saveGPStorage('nico_live_customscript',data);
    },

    init:function(){
	let data = opener.NicoLiveDatabase.loadGPStorage('nico_live_customscript',{});
	if( data.requestchecker ){
	    $('custom-script').value = data.requestchecker;
	}
    },
    destroy:function(){
	//Application.console.log('close advanced setting');
    }
};

NLHPreference.initDB();
window.addEventListener("load", function(e){ NLHPreference.init(); }, false);
window.addEventListener("unload", function(e){ NLHPreference.destroy(); }, false);
