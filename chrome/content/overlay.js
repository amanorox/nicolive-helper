var NicoLiveOverlay = {
    // from libs.js
    FormatCommas:function(str){
	return str.toString().replace(/(\d)(?=(?:\d{3})+$)/g,"$1,");
    },
    GetDateString:function(ms){
	var d = new Date(ms);
	return d.toLocaleFormat("%Y/%m/%d %H:%M:%S");
    },
    debugprint:function(txt){
	Application.console.log(txt);
    },

    getDatabase:function(){
        let file = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
        file.append("nicolivehelper_miku39jp.sqlite");
        let storageService = Components.classes["@mozilla.org/storage/service;1"].getService(Components.interfaces.mozIStorageService);
        let db = storageService.openDatabase(file);
	return db;
    },

    getPref:function(){
	return new PrefsWrapper1("extensions.nicolivehelper.");
    },

    isSingleWindowMode:function(){
	let pref = this.getPref();
	return pref.getBoolPref("singlewindow");
    },

    insertHistory:function(url,title){
	if(url=="lv0") return;

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
	elem.setAttribute("oncommand","window.content.location.href = 'http://live.nicovideo.jp/watch/"+url+"';");
	menu.insertBefore(elem,menu.firstChild);
	menu = null; elem = null; i = null; item = null;
    },

    findWindow:function(){
	let wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
	let win = wm.getMostRecentWindow("NicoLiveHelperMainWindow");
	return win;
    },

    findSpecificWindow:function(request_id){
	let wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
	let enumerator = wm.getEnumerator("NicoLiveHelperMainWindow");
	while(enumerator.hasMoreElements()) {
	    let win = enumerator.getNext();
	    if( win.name.indexOf(request_id)>=0 ){
		return win;
	    }
	}
	return null;
    },

    /** NicoLive Helperを開く
     * @param url 放送ID
     * @param title 番組名
     * @param iscaster 生主かどうか
     * @param community_id コミュニティID
     */
    open:function(url,title,iscaster,community_id){
	let feature="chrome,resizable=yes";
	Application.storage.set("nico_request_id",url);
	Application.storage.set("nico_live_title",title);
	Application.storage.set("nico_live_caster",iscaster);
	Application.storage.set("nico_live_coid",community_id);

	this.debugprint("request id:"+url);
	this.debugprint("title:"+title);
	this.debugprint("caster:"+iscaster);
	this.debugprint("community:"+community_id);

	if( this.isSingleWindowMode() ){
	    let win = this.findWindow();
	    if(win){
		this.debugprint("NicoLive Helper Window Exists.");
		win.NicoLiveHelper.connectNewBroadcasting(url,title,iscaster,community_id);
		win.focus();
	    }else{
		let w = window.open("chrome://nicolivehelper/content/requestwindow.xul","NLH_lv0",feature);
		w.arguments = [ url, title, iscaster, community_id ];
		w.focus();
		this.debugprint("Open NicoLive Helper Window.");
	    }
	}else{
	    let win = this.findSpecificWindow(url);
	    if( win ){
		win.focus();
	    }else{
		let w = window.open("chrome://nicolivehelper/content/requestwindow.xul","NLH_"+url,feature);
		w.arguments = [ url, title, iscaster, community_id ];
		w.focus();
	    }
	}
	this.insertHistory(url,title);
	//Application.console.log(url+' '+title);
    },

    getNsenId:function(ch){
	let url = "http://live.nicovideo.jp/nsen/"+ch+"?mode=getvid";
	let req = new XMLHttpRequest();
	if( !req ) return;
	req.open("GET", url);
	req.onreadystatechange = function(){
	    if( req.readyState==4 && req.status==200 ){
		let xml = req.responseXML;
		try{
		    let request_id = xml.getElementsByTagName("video_id")[0].textContent;
		    NicoLiveOverlay.openNicoLiveWindow("http://live.nicovideo.jp/watch/"+request_id);
		} catch (x) {
		}
	    }
	};
	req.send("");
    },

    // メニューからopenする.
    openNicoLiveWindow:function(url){
	let unsafeWin = window.content.wrappedJSObject;
	let request_id;
	if( !url ) url = window.content.location.href;

	let r = url.match(/watch\/nsen\/(.*)$/);
	if( r ){
	    this.getNsenId(r[1]);
	    return;
	}

	// URLからrequest idを.
	request_id = url.match(/watch\/((lv|co|ch)\d+)/);
	if(!request_id){
	    // URLから接続先が分からなければページ内の情報にアクセス.
	    try{
		request_id = unsafeWin.Video.id;
		if( !request_id || request_id.indexOf("lv")!=0 ){
		    request_id="lv0";
		}
	    } catch (x) {
		request_id="lv0";
	    }
	}else{
	    request_id = request_id[1];
	}

	let title;
	let iscaster = true;
	// 番組タイトルは id="title"
	// タイトルタグ
	// <h2 class="title" title="タイトル名">
	try{
	    title = doc.getElementById("title").textContent.match(/^\s+(.*)\s+$/)[1]; // 〜原宿
	} catch (x) {
	    try{
		if( request_id==unsafeWin.Video.id ){
		    title = unsafeWin.Video.title;// Zero〜
		}else{
		    title = doc.getElementsByTagName('title')[0];
		}
	    } catch (x) {
		try{
		    // タイトルタグで
		    title = doc.getElementsByTagName('title')[0];
		} catch (x) {
		    title = "";
		}
	    }
	}

	if(request_id!="lv0"){
	    if( !window.content.document.body.innerHTML.match(/console\.swf/) ){
		// 生主コンソールがないならリスナ.
		iscaster = false;
	    }
	    if( window.content.document.getElementById("utility_container") ){
		// 新バージョンではutility_containerがあれば生主.
		iscaster = true;
	    }
	}
	let community_id = "";
	if( url.match(/(ch|co)\d+/) ){
	    // co番号でアクセスした場合、コミュ番号を取得する.
	    community_id = request_id;
	    this.debugprint("to connect to broadcasting using community id:"+community_id);
	}
	this.open(request_id,title,iscaster,community_id);
    },

    onPageLoad:function(e){
	let unsafeWin = e.target.defaultView.wrappedJSObject;
	let url = e.target.location.href;
	let request_id;

	// URLからrequest idを.
	request_id = url.match(/nicovideo.jp\/watch\/((lv|co|ch)\d+)/);
	if(!request_id){
	    try{
		request_id = unsafeWin.Video.id;
		if( !request_id || request_id.indexOf("lv")!=0 ) return;
	    } catch (x) {
		Application.console.log(x);
		return;
	    }
	}else{
	    request_id = request_id[1];
	}

	let player;
	try{
	    player = e.target.getElementById("WatchPlayer") || e.target.getElementById("flvplayer_container");
	} catch (x) {
	}
	let iscaster = false;
	if( !player ) return;

	// innerHTMLを見るしかできないのです.
	if(player.innerHTML.match(/console\.swf/)){
	    // 配信コンソールがあれば生主.
	    iscaster = true;
	}
	try{
	    if( e.target.getElementById("utility_container") ){
		// 新バージョン用のチェック.
		iscaster = true;
		this.debugprint("utility_container is found.");
	    }
	} catch (x) {
	    this.debugprint(x);
	    iscaster = false;
	}

	let prefs = this.getPref();
	if( prefs.getBoolPref("autowindowopen") && iscaster ||
	    prefs.getBoolPref("autowindowopen-listener") && !iscaster ){
		let title;
		try{
		    let doc = e.target;
		    title = doc.getElementById("title").textContent.match(/^\s+(.*)\s+$/)[1]; // 〜原宿
		} catch (x) {
		    try{
			title = unsafeWin.Video.title;// Zero〜
		    } catch (x) {
			try{
			    // タイトルタグで
			    title = doc.getElementsByTagName('title')[0];
			} catch (x) {
			    title = "";
			}
		    }
		}

		let community_id = "";
		if( url.match(/(ch|co)\d+/) ){
		    community_id = request_id;
		}
		this.open(request_id,title,iscaster,community_id);
	    }
    },

    createExtraMylistItem:function(doc,item,id){
	let div = doc.createElement('div');
	div.className = "SYS_box_item";
	div.setAttribute('nlh_video_id',item.video_id);
	let table = doc.createElement('table');
	table.setAttribute('width','672');
	table.setAttribute('cellspacing','0');
	table.setAttribute('cellpadding','4');
	table.setAttribute('border','0');
	table.setAttribute('summary','');
	let tr = table.insertRow(table.rows.length);
	tr.setAttribute('valign','top');

	let min,sec,posteddate;
	min = parseInt(item.length/60);
	sec = parseInt(item.length%60);
	posteddate = this.GetDateString(item.first_retrieve*1000).match(/\d+/g);

	tr.innerHTML = '<td><input type="checkbox" name="checkbox" nlh_id="'+id+'" nlh_video_id="'+item.video_id+'"/></td>'
	    + '<td>'
	    + '<p><a href="http://www.nicovideo.jp/watch/'+item.video_id+'"><img class="img_std96 lazyimage" alt="" title="" src="'+item.thumbnail_url+'" /></a></p>'
	    + '<p></p><p class="vinfo_length"><span>'+(min+":"+(sec<10?("0"+sec):sec))+'</span></p>'
	    + '</td>'
	    + '<td width="100%" class="SYS_box_item_data">'
	    + '<div style="position: relative; display: block;" class="SYS_box_item_buttons"><p><a href="http://uad.nicovideo.jp/ads/?vid='+item.video_id+'&amp;video_my"><img title="宣伝" alt="" src="http://res.nimg.jp/img/common/tilebtn/uad.png" /></a><img title="削除" alt="" class="SYS_btn_remove_item" src="http://res.nimg.jp/img/common/tilebtn/delete.png" nlh_id="'+id+'" nlh_video_id="'+item.video_id+'" /></p></div>'
	    + '<p class="font12">'
	    + '<strong>'+posteddate[0]+'年'+posteddate[1]+'月'+posteddate[2]+'日 '+posteddate[3]+':'+posteddate[4]+'</strong> 投稿'
	    + '<br />'
	    + '再生：<strong>'+this.FormatCommas(item.view_counter)+'</strong>　コメント：<strong>'+this.FormatCommas(item.comment_num)+'</strong>　マイリスト：<a href="http://www.nicovideo.jp/mylistcomment/video/'+item.video_id+'"><strong>'+this.FormatCommas(item.mylist_counter)+'</strong></a></p>'
	    + '<h3 style="margin-top: 2px;"><a class="watch" href="http://www.nicovideo.jp/watch/'+item.video_id+'">'+item.title+'</a></h3>'
	    + '</td>';

	let div2 = doc.createElement('div');
	div2.setAttribute('style','padding: 4px;');
	div2.innerHTML = '<p class="dot_2"><img alt="" src="http://res.nimg.jp/img/_.gif" /></p>';

	div.appendChild(table);
	div.appendChild(div2);

	doc.getElementById('SYS_box_mylist_body').appendChild(div);
    },

    // 仮想マイリスト削除.
    deleteExtraMylist:function(e){
	if( !window.confirm('この仮想マイリストを削除しますか？') ) return;

	let doc = e.target.ownerDocument;
	let btn = e.target;
	let id = e.target.getAttribute('nlh_id');
	let db = this.getDatabase();

	// フォルダを削除.
	let st = db.createStatement('DELETE FROM folder WHERE id=?1 AND type=0');
	st.bindInt32Parameter(0,id);
	st.execute();
	st.finalize();

	// フォルダに含まれる動画を削除.
	st = db.createStatement('DELETE FROM folder WHERE parent=?1 AND type=1');
	st.bindInt32Parameter(0,id);
	st.execute();
	st.finalize();
	db.close();

	let table = doc.getElementById('nlh_extramylistgroups');
	let trs = table.getElementsByTagName('tr');
	for(let i=0,item; item=trs[i]; i++){
	    if(item.getAttribute('nlh_id')==id){
		// firstChild==tbody
		table.firstChild.removeChild(item);
		break;
	    }
	}
	let body = doc.getElementById("SYS_box_mylist_body");
	let header = doc.getElementById('SYS_box_mylist_header');
	while( header.firstChild ) header.removeChild(header.firstChild);
	while( body.firstChild ) body.removeChild(body.firstChild);
    },
    // 仮想マイリストの名前変更.
    renameExtraMylist:function(e){
	let name = window.prompt('新しい仮想マイリストの名前を入力してください','');
	if(name){
	    let doc = e.target.ownerDocument;
	    let id = e.target.getAttribute('nlh_id');
	    let db = this.getDatabase();

	    this.evaluateXPath(doc,doc,'//*[@id=\'SYS_box_mylist_header\']/h1')[0].innerHTML = name;
	    this.evaluateXPath(doc,doc,'//*[@id=\'nlh_extramylistgroups\']//a[@nlh_id=\''+id+'\']')[0].innerHTML = name;
	    // フォルダ名を変更.
	    let st = db.createStatement('UPDATE folder SET name=?1 WHERE id=?2 AND type=0');
	    st.bindUTF8StringParameter(0,name);
	    st.bindInt32Parameter(1,id);
	    st.execute();
	    st.finalize();
	    db.close();
	}
    },

    // 仮想マイリストの削除.
    appendDeleteExtraMylistButton:function(doc,id){
	let btn = doc.createElement('input');
	btn.setAttribute('type','button');
	btn.setAttribute('value','この仮想マイリストを削除');
	btn.setAttribute('nlh_id',id);
	btn.className = 'submit';
	btn.addEventListener('click',function(e){
				 NicoLiveOverlay.deleteExtraMylist(e);
			     },true);
	doc.getElementById('SYS_box_mylist_header').appendChild(btn);

	btn = doc.createElement('input');
	btn.setAttribute('type','button');
	btn.setAttribute('value','名前の変更');
	btn.setAttribute('nlh_id',id);
	btn.className = 'submit';
	btn.addEventListener('click',function(e){
				 NicoLiveOverlay.renameExtraMylist(e);
			     },true);
	doc.getElementById('SYS_box_mylist_header').appendChild(btn);
	doc = null; id = null; btn = null;
    },

    clickDeleteButton:function(e){
	let elem = e.target;
	let id = elem.getAttribute('nlh_id');
	let video_id = elem.getAttribute('nlh_video_id');
	let doc = e.target.ownerDocument;
	let title = doc.getElementById('SYS_box_mylist_header').getElementsByTagName('h1')[0].innerHTML;
	if(window.confirm('動画 '+video_id+' を仮想マイリスト「'+title+'」から削除しますか？')){
	    let db = this.getDatabase();
	    let st = db.createStatement('DELETE FROM folder WHERE parent=?1 AND video_id=?2 AND type=1');
	    st.bindInt32Parameter(0,id);
	    st.bindUTF8StringParameter(1,video_id);
	    st.execute();
	    st.finalize();
	    db.close();
	    this.debugprint('delete:'+id+'/'+video_id);

	    let items = doc.getElementsByClassName('SYS_box_item');
	    let i;
	    for(i=0;i<items.length;i++){
		if(items[i].getAttribute('nlh_video_id')==video_id){
		    doc.getElementById("SYS_box_mylist_body").removeChild(items[i]);
		    break;
		}
	    }
	}
    },

    createEventListenerForDeleteButton:function(doc){
	let elems = doc.getElementsByClassName('SYS_btn_remove_item');
	let i;
	for(i=0;i<elems.length;i++){
	    elems[i].addEventListener('click',function(e){
					  NicoLiveOverlay.clickDeleteButton(e);
				      },true);
	}
	i = null; doc = null; elems = null;
    },

    evaluateXPath:function(doc,root,path){
	let result = doc.evaluate(path,root,null,XPathResult.ORDERED_NODE_ITERATOR_TYPE,null);
	let res;
	let found = new Array();
	while (res = result.iterateNext())
	    found.push(res);
	return found;
    },

    moveFromExtraMylist:function(e){
	let doc = e.target.ownerDocument;
	let checkboxs = this.evaluateXPath(doc,doc,'//*[@class="SYS_box_item"]//input[@type="checkbox"]');
	let target_id = this.evaluateXPath(doc,doc,'//*[@id="SYS_box_check_editor"]//select')[0].value;
	if( target_id<=0 ) return;

	let db = this.getDatabase();
	for(let i=0,item;item=checkboxs[i];i++){
	    if(item.checked){
		let id = item.getAttribute('nlh_id');
		let video_id = item.getAttribute('nlh_video_id');
		if( this.checkExistExtraMylist(db,target_id,video_id) ) continue;

		let st = db.createStatement('UPDATE folder SET parent=?1 WHERE parent=?2 AND video_id=?3');
		st.bindInt32Parameter(0,target_id);
		st.bindInt32Parameter(1,id);
		st.bindUTF8StringParameter(2,video_id);
		st.execute();
		st.finalize();

		let removetarget = this.evaluateXPath(doc,doc,'//*[@class="SYS_box_item" and @nlh_video_id="'+video_id+'"]');
		if(removetarget.length) doc.getElementById('SYS_box_mylist_body').removeChild(removetarget[0]);
	    }
	}
	db.close();
	doc.getElementById('nlh-showresult').innerHTML = "移動しました";
    },
    copyFromExtraMylist:function(e){
	let doc = e.target.ownerDocument;
	let checkboxs = this.evaluateXPath(doc,doc,'//*[@class="SYS_box_item"]//input[@type="checkbox"]');
	let target_id = this.evaluateXPath(doc,doc,'//*[@id="SYS_box_check_editor"]//select')[0].value;
	if( target_id<=0 ) return;

	let db = this.getDatabase();
	for(let i=0,item;item=checkboxs[i];i++){
	    if(item.checked){
		let id = item.getAttribute('nlh_id');
		let video_id = item.getAttribute('nlh_video_id');
		if( this.checkExistExtraMylist(db,target_id,video_id) ) continue;
		let st = db.createStatement('INSERT INTO folder(type,parent,video_id) VALUES(1,?1,?2)');
		st.bindInt32Parameter(0,target_id);
		st.bindUTF8StringParameter(1,video_id);
		st.execute();
		st.finalize();
	    }
	}
	db.close();
	doc.getElementById('nlh-showresult').innerHTML = "コピーしました";
    },
    removeFromExtraMylist:function(e){
	let doc = e.target.ownerDocument;
	let checkboxs = this.evaluateXPath(doc,doc,'//*[@class="SYS_box_item"]//input[@type="checkbox"]');
	let target_id = this.evaluateXPath(doc,doc,'//*[@id="SYS_box_check_editor"]//select')[0].value;
	if( !window.confirm('削除しますか？') ) return;

	let db = this.getDatabase();
	for(let i=0,item;item=checkboxs[i];i++){
	    if(item.checked){
		let id = item.getAttribute('nlh_id');
		let video_id = item.getAttribute('nlh_video_id');
		let st = db.createStatement('DELETE FROM folder WHERE parent=?1 AND video_id=?2 AND type=1');
		st.bindInt32Parameter(0,id);
		st.bindUTF8StringParameter(1,video_id);
		st.execute();
		st.finalize();

		let removetarget = this.evaluateXPath(doc,doc,'//*[@class="SYS_box_item" and @nlh_video_id="'+video_id+'"]');
		if(removetarget.length) doc.getElementById('SYS_box_mylist_body').removeChild(removetarget[0]);
	    }
	}
	db.close();
	doc.getElementById('nlh-showresult').innerHTML = "削除しました";
    },

    addEventListenerForEditor:function(doc){
	doc.getElementById('SYS_btn_move_mylist').addEventListener('click',function(e){
								       NicoLiveOverlay.moveFromExtraMylist(e);
								   },true);
	doc.getElementById('SYS_btn_copy_mylist').addEventListener('click',function(e){
								       NicoLiveOverlay.copyFromExtraMylist(e);
								   },true);
	doc.getElementById('SYS_btn_remove_mylist').addEventListener('click',function(e){
									 NicoLiveOverlay.removeFromExtraMylist(e);
								     },true);
	doc = null;
    },

    listenToChangeSortOrderEvent:function(doc){
	let func = function(e){
	    let doc = e.target.ownerDocument;
	    let body = doc.getElementById("SYS_box_mylist_body");
	    let header = doc.getElementById('SYS_box_mylist_header');
	    let sel = doc.getElementById('nlh_sortorder');
	    let sortorder = ["",
			     "title ASC","title DESC",
			     "first_retrieve DESC","first_retrieve ASC",
			     "view_counter DESC","view_counter ASC",
			     "comment_num DESC","comment_num ASC",
			     "mylist_counter DESC","mylist_counter ASC",
			     "length DESC","length ASC"];

	    let db = NicoLiveOverlay.getDatabase();
	    let str = 'SELECT N.* FROM nicovideo N JOIN (SELECT * FROM folder F WHERE F.parent=?1 AND F.type=1) USING (video_id) ORDER BY '+sortorder[sel.value];
	    let st = db.createStatement(str);
	    let id = sel.getAttribute('nlh_id');
	    st.bindInt32Parameter(0,id);
	    while( body.firstChild ) body.removeChild(body.firstChild);

	    while(st.executeStep()){
		NicoLiveOverlay.createExtraMylistItem(doc,st.row, id);
	    }
	    st.finalize();
	    db.close();
	};
	doc.getElementById('nlh_sortorder').addEventListener('change',func,true);
	doc = null;
    },

    clickExtraMylist:function(event){
	let id = event.target.getAttribute('nlh_id');
	let doc = event.target.ownerDocument;
	let body = doc.getElementById("SYS_box_mylist_body");
	let header = doc.getElementById('SYS_box_mylist_header');

	while( header.firstChild ) header.removeChild(header.firstChild);
	while( body.firstChild ) body.removeChild(body.firstChild);

	let str = "";
	str = '<form id="SYS_box_check_editor"><table cellspacing="4" cellpadding="0" border="0" class="font12"><tbody><tr><td>チェックした項目を</td><td><select style="font-size: 12px; width: 160px;" name="target_group_id">';
	// フォルダリストを追加する.
	let db = this.getDatabase();
	let st = db.createStatement('SELECT id,name FROM folder WHERE type=0 ORDER BY name ASC');
	while(st.executeStep()){
	    if( event.target.innerHTML!=st.row.name )
		str += '<option value="'+st.row.id+'">'+st.row.name+'</option>';
	}
	st.finalize();
	str += '</select></td><td>に</td><td nowrap="nowrap"><input type="button" value="移動" id="SYS_btn_move_mylist" class="submit" /><input type="button" value="コピー" id="SYS_btn_copy_mylist" class="submit" /><input type="button" style="color: rgb(204, 0, 0);" value="削除" id="SYS_btn_remove_mylist" class="submit" /></td></tr></tbody></table></form><span id="nlh-showresult"></span>';
	header.innerHTML = str;

	this.debugprint('anchor was clicked:'+id);
	st = db.createStatement('SELECT N.* FROM nicovideo N JOIN (SELECT * FROM folder F WHERE F.parent=?1 AND F.type=1) USING (video_id)');
	st.bindInt32Parameter(0,id);

	let cnt=0;
	while(st.executeStep()){
	    //this.debugprint(st.row.video_id);
	    this.createExtraMylistItem(doc,st.row, id);
	    cnt++;
	}
	st.finalize();
	db.close();

	header.innerHTML += '<h1>'+event.target.innerHTML+'</h1>'
	    + '<strong>全'+cnt+'件</strong><br />'
	    + '<select id="nlh_sortorder" nlh_id="'+id+'" style="width: 160px;" name="sort">'
	    + '<option value="1">タイトル昇順</option>'
	    + '<option value="2">タイトル降順</option>'
	    + '<option value="3">投稿が新しい順</option>'
	    + '<option value="4">投稿が古い順</option>'
	    + '<option value="5">再生が多い順</option>'
	    + '<option value="6">再生が少ない順</option>'
	    + '<option value="7">コメントが多い順</option>'
	    + '<option value="8">コメントが少ない順</option>'
	    + '<option value="9">マイリスト登録が多い順</option>'
	    + '<option value="10">マイリスト登録が少ない順</option>'
	    + '<option value="11">時間が長い順</option>'
	    + '<option value="12">時間が短い順</option>'
	    + '</select>';

	this.appendDeleteExtraMylistButton(doc,id);

	this.createEventListenerForDeleteButton(doc);
	this.addEventListenerForEditor(doc);
	this.listenToChangeSortOrderEvent(doc);

	header.scrollIntoView(true);
    },

    // 仮想マイリスト一覧に行を追加.
    appendMylistRow:function(doc,table,itemname,id){
	let tr,td;
	tr = table.insertRow(table.rows.length);
	tr.setAttribute('nlh_id',id);
	td = tr.insertCell(tr.cells.length);
	td = tr.insertCell(tr.cells.length);
	let a = doc.createElement('a');
	this.debugprint('appendMylistRow:'+itemname+'/'+id);
	a.setAttribute("style","text-decoration: none; cursor:pointer;");
	a.setAttribute("nlh_id",id);
	a.addEventListener('click', function(e){
			       NicoLiveOverlay.clickExtraMylist(e);
			   },true);
	a.appendChild(doc.createTextNode(itemname));
	td.appendChild(a);
	tr = null; td = null; a = null; doc = null; table = null; itemname = null; id = null;
    },

    // 新規作成.
    newExtraMylist:function(e){
	let name = window.prompt('追加する仮想マイリストの名前を入力してください','');
	if(name){
	    let db = this.getDatabase();
	    let st = db.createStatement('INSERT INTO folder(type,parent,name) VALUES(0,-1,?1)');
	    st.bindUTF8StringParameter(0,name);
	    st.execute();
	    st.finalize();
	    let id = db.lastInsertRowID;
	    let doc = e.target.ownerDocument;
	    let table = doc.getElementById('nlh_extramylistgroups');
	    db.close();

	    this.debugprint('insert id:'+id);
	    this.appendMylistRow(doc,table, name, id );
	}
    },

    // 追加するボタン.
    extraMylistAddButton:function(doc){
	let p = doc.createElement('p');
	p.setAttribute("style","text-align: center; padding: 4px;");
	let btn = doc.createElement('input');
	btn.setAttribute('type','button');
	btn.setAttribute('value','新規作成');
	btn.className = 'submit';
	btn.addEventListener("click",function(e){
				 NicoLiveOverlay.newExtraMylist(e);
			     },true);
	p.appendChild(btn);
	doc.getElementById('SYS_box_mylistgroups').appendChild(p);
	doc = null; p = null; btn = null;
    },

    // マイリストページ.
    process_mylistpage:function(doc){
	let separator = doc.getElementById('SYS_box_mylistgroups').getElementsByTagName('div')[0].cloneNode(true);
	doc.getElementById('SYS_box_mylistgroups').appendChild(separator);

	let p = doc.createElement('p');
	p.appendChild(doc.createTextNode('NicoLive Helper'));
	doc.getElementById('SYS_box_mylistgroups').appendChild(p);

	let table;
	table = doc.createElement('table');
	table.setAttribute('id','nlh_extramylistgroups');
	table.className = "font12";
	table.style.width = 288;
	table.style.cellspacing = 4;
	table.style.cellpadding = 0;
	table.style.border = 0;
	doc.getElementById('SYS_box_mylistgroups').appendChild(table);

	// フォルダリストを追加する.
	let db = this.getDatabase();
	let st = db.createStatement('SELECT id,name FROM folder WHERE type=0 ORDER BY name ASC');
	while(st.executeStep()){
	    this.appendMylistRow(doc,table,st.row.name, st.row.id );
	}
	st.finalize();
	db.close();

	this.extraMylistAddButton(doc);
    },


    addVideoDatabase:function(db,music){
	let st;
	st = db.createStatement('SELECT * FROM nicovideo WHERE video_id=?1');
	st.bindUTF8StringParameter(0,music.id);
	let exist = false;
	while(st.executeStep()){
	    exist = true;
	}
	st.finalize();
	if(exist) return;

	st = db.createStatement('INSERT INTO nicovideo(video_id,title,description,thumbnail_url,first_retrieve,length,view_counter,comment_num,mylist_counter,tags,update_date) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)');
	st.bindUTF8StringParameter(0,music.id);
	st.bindUTF8StringParameter(1,music.title);
	st.bindUTF8StringParameter(2,music.description);
	st.bindUTF8StringParameter(3,music.thumbnail);
	let posteddate = new Date(music.postedAt);
	posteddate = parseInt(posteddate.getTime()/1000);
	st.bindInt32Parameter(4,posteddate);
	st.bindInt32Parameter(5,music.length);
	st.bindInt32Parameter(6,music.viewCount);
	st.bindInt32Parameter(7,0);
	st.bindInt32Parameter(8,music.mylistCount);
	st.bindUTF8StringParameter(9,music.tags.join(','));
	st.bindInt32Parameter(10,0);
	st.execute();
	st.finalize();
    },

    checkExistExtraMylist:function(db,id,video_id){
	let st = db.createStatement('SELECT * FROM folder WHERE parent=?1 AND video_id=?2');
	st.bindInt32Parameter(0,id);
	st.bindUTF8StringParameter(1,video_id);
	let exist = false;
	while(st.executeStep()){
	    exist = true;
	}
	st.finalize();
	return exist;
    },

    // 仮想マイリストに動画を追加する.
    addToExtraMylist:function(e){
	let doc = e.target.ownerDocument;
	let unsafeWin = doc.defaultView.wrappedJSObject;
	let select = doc.getElementById('nlh_extramylistgroups');
	let id = select.value;
	let video_id = unsafeWin.Video.id;
	let db = this.getDatabase();
	let st;
	st = db.createStatement('SELECT * FROM folder WHERE id=?1');
	st.bindInt32Parameter(0,id);
	let exist = false;
	while(st.executeStep()){
	    exist = true;
	}
	st.finalize();
	if(exist){
	    this.addVideoDatabase(db,unsafeWin.Video);
	    if(this.checkExistExtraMylist(db,id,video_id)){
		doc.getElementById('nlh_messages').innerHTML = video_id+'はすでに仮想マイリストに登録済みです';
	    }else{
		st = db.createStatement('INSERT INTO folder(type,parent,video_id) VALUES(1,?1,?2)');
		st.bindInt32Parameter(0,id);
		st.bindUTF8StringParameter(1,video_id);
		st.execute();
		st.finalize();
		this.debugprint('add:'+video_id+' -> '+id);
		doc.getElementById('nlh_messages').innerHTML = video_id+'を仮想マイリストに登録しました';
	    }
	}else{
	    doc.getElementById('nlh_messages').innerHTML = '仮想マイリストが存在しないため登録できませんでした';
	}

	db.close();
    },

    appendAddToExtraMylistButton:function(doc,div){
	let btn = doc.createElement('input');
	btn.setAttribute('type','button');
	btn.className = 'submit';
	btn.value = "仮想マイリストに登録";
	btn.addEventListener('click',function(e){
				 NicoLiveOverlay.addToExtraMylist(e);
			     },true);
	div.appendChild(btn);
	div = null; btn = null;
    },
    process_videopage:function(doc){
	this.debugprint('video page');
	let header = doc.getElementById('WATCHHEADER');
	let div = doc.createElement('div');
	div.setAttribute('id','nlh_toolbar');

	let db = this.getDatabase();
	let st = db.createStatement('SELECT id,name FROM folder WHERE type=0 ORDER BY name ASC');
	let str = "<select id=\"nlh_extramylistgroups\" style=\"font-size:12px; width:160px;\">";
	while(st.executeStep()){
	    str += "<option value=\""+st.row.id+"\">" + st.row.name + "</option>";
	}
	str += "</select>";
	st.finalize();
	db.close();

	div.innerHTML = str;
	this.appendAddToExtraMylistButton(doc,div);
	let elem = doc.createElement('span');
	elem.setAttribute('id','nlh_messages');
	div.appendChild(elem);
	header.appendChild(div);
    },

    onLoad:function(e){
	let doc = e.target;
	try{
	    
	    if( doc.location.href.match(/^http:\/\/www.nicovideo.jp\/my\/mylist/) ){
		this.process_mylistpage(doc);
	    }
	    if( 0 && doc.location.href.match(/^http:\/\/www.nicovideo.jp\/watch\/(.*)$/) ){
		this.process_videopage(doc);
	    }

	} catch (x) {
	}
    },

    GetAddonVersion:function(){
	let version;
	try{
	    let em = Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager);
	    let addon = em.getItemForID("nicolivehelper@miku39.jp");
	    version = addon.version;
	} catch (x) {
	    // Fx4
	    AddonManager.getAddonByID("nicolivehelper@miku39.jp",
				      function(addon) {
					  version = addon.version;
					  //alert("My extension's version is " + addon.version);
				      });
	    // Piroさん(http://piro.sakura.ne.jp/)が値が設定されるまで待つことをやっていたので真似してしまう.
	    let thread = Components.classes['@mozilla.org/thread-manager;1'].getService().mainThread;
	    while (version === void(0)) {
		thread.processNextEvent(true);
	    }
	}
	return version;
    },

    checkFirstRun:function(){
	var Prefs = Components.classes["@mozilla.org/preferences-service;1"]
	    .getService(Components.interfaces.nsIPrefService);
	Prefs = Prefs.getBranch("extensions.nicolivehelper.");

	var ver = -1, firstrun = true;
	var current = this.GetAddonVersion();
	//バージョン番号の取得
	try{
	    ver = Prefs.getCharPref("version");
	    firstrun = Prefs.getBoolPref("firstrun");
	}catch(e){
	    //nothing
	}finally{
	    if (firstrun){
		Prefs.setBoolPref("firstrun",false);
		Prefs.setCharPref("version",current);
		// ここに初めて実行したとき用のコードを挿入します。        
		window.setTimeout(function(){
				      gBrowser.selectedTab = gBrowser.addTab("http://code.google.com/p/nicolivehelper/wiki/Manual");
				  }, 1500);
	    }
	    if (ver!=current && !firstrun){ // !firstrun によりこのセクションは拡張機能を初めて使うときは実行されません。
		Prefs.setCharPref("version",current);
		// バージョンが異なるとき、すなわちアップグレードしたときに実行するコードを挿入します。
		window.setTimeout(function(){
				      gBrowser.selectedTab = gBrowser.addTab("http://code.google.com/p/nicolivehelper/wiki/UpdateHistory#1.1.51");
				  }, 1500);
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
	    if(0){
		appcontent.addEventListener("load",
					    function(e){
						NicoLiveOverlay.onLoad(e);
					    },true);
	    }
	}
	this.nicolivehistory = new Array();
	this.checkFirstRun();
	appcontent = null;
    }
};

window.addEventListener("load", function() { NicoLiveOverlay.init(); }, false);
