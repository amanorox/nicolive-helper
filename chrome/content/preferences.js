var NLHPreference = {

    initDB:function(){
	let file = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
        file.append("nicolivehelper_miku39jp.sqlite");

        let storageService = Components.classes["@mozilla.org/storage/service;1"].getService(Components.interfaces.mozIStorageService);
        this.dbconnect = storageService.openDatabase(file);
	//Application.console.log('initDB in advanced setting');
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
    },

    // 自動応答をデフォルトにする.
    resetAutoReply:function(){
	$('pref-msg-deleted').value   = "その動画は削除されているか、見つかりません";
	$('pref-msg-notaccept').value = "現在リクエストを受け付けていません";
	$('pref-msg-newmovie').value  = "その動画は7日以内に投稿された動画です(新着制限)";
	$('pref-msg-played').value    = "その動画は既に再生されました";
	$('pref-msg-requested').value = "その動画は既にリクエストされています";
	$('pref-msg-accept').value    = "リクエストを受け付けました";
	$('pref-msg-requestok').value = "";
	$('pref-msg-requestng').value = "";
    },

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
    },

    destroy:function(){
	this.dbconnect.close();
	//Application.console.log('close advanced setting');
    }
};

NLHPreference.initDB();
window.addEventListener("unload", function(e){ NLHPreference.destroy(); }, false);
