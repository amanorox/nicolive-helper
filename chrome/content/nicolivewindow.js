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

    /**
     * 指定のURLを開く.
     * @param url URL
     * @param hasfocus 開いたタブがフォーカスを得るか
     */
    openDefaultBrowser:function(url, hasfocus){
	if( NicoLiveHelper._use_other_browser ){
	    // まず ioservice を用いて nsIURI オブジェクトを作る
	    var ioservice = Components.classes["@mozilla.org/network/io-service;1"]
		.getService(Components.interfaces.nsIIOService);
	
	    var uriToOpen = ioservice.newURI(url, null, null);
	
	    var extps = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"]
		.getService(Components.interfaces.nsIExternalProtocolService);
	
	    // そしてそれを開く
	    extps.loadURI(uriToOpen, null);
	    return null;
	}else{
	    let tab = window.opener.getBrowser().addTab( url );
	    if( hasfocus ){
		window.opener.getBrowser().selectedTab = tab;
	    }
	    return tab;
	}
    },

    openInAppBrowser:function(url, hasfocus, param1, param2, param3, param4, param5){
	let feature="chrome,resizable=yes";
	let win = window.openDialog("chrome://nicolivehelper/content/browser.xul","inappbrowser",feature, url, param1, param2, param3, param4 ,param5);
	if( hasfocus ){
	    win.focus();
	}
	return win;
    },

    openNicoAlertManager:function(){
	var value = null;
	var f = "chrome,resizable=yes,centerscreen";
	if(NicoLivePreference.topmost){
	    f += ',alwaysRaised=yes';
	}
	var w = window.openDialog("chrome://nicolivehelper/content/nicoalertmanager.xul","nicoalert",f,value);
	SetWindowTopMost(w,NicoLivePreference.topmost);
	w.focus();
    },

    checkNicoAlertConnected:function(){
	if( NicoLiveAlertModule.connected ){
	    $('nicoalert-disconnect').hidden = false;
	    $('nicoalert-connect').hidden = true;
	}else{
	    $('nicoalert-disconnect').hidden = true;
	    $('nicoalert-connect').hidden = false;
	}
    },

    // 左のタブから1,2,3,....,9,0 の番号としてタブを切り替える.
    changeTab:function(n){
	n = (n + 9) % 10;
	$('maintabs').selectedIndex = n;
    },
    moveRightTab:function(){
	let n = $('maintabs').selectedIndex+1;
	n++;
	this.changeTab(n);
    },
    moveLeftTab:function(){
	let n = $('maintabs').selectedIndex+1;
	n--;
	this.changeTab(n);
    },

    checkClock:function(){
	let urls = new Array();
	urls.push( "http://ntp-a1.nict.go.jp/cgi-bin/jsont" );
	urls.push( "http://ntp-b1.nict.go.jp/cgi-bin/jsont" );
	let url = urls[ GetRandomInt(0, urls.length-1) ];
	let req = new XMLHttpRequest();
	if( !req ) return;
	req.open("GET",url);
	req.onreadystatechange = function(){
	    if( req.readyState==4 && req.status==200 ){
		let str;
		let jsont = function(json){
		    let tm = new Date( json["st"] * 1000 );
		    let now = new Date();
		    let str;
		    str = tm.toLocaleString();
		    str += "(STD Time)\n";
		    str += (new Date).toLocaleString() + "(Your PC)";
		    AlertPrompt(str,'Current Date');
		};
		eval(req.responseText);
	    }
	};
	req.send("");
    },

    setWindowList:function(){
	this.winlist = WindowEnumerator();

	while($('popup-windowlist').childNodes[3]){
	    $('popup-windowlist').removeChild($('popup-windowlist').childNodes[3]);
	}
	for(let i=0,win;win=this.winlist[i];i++){
	    let menuitem;
	    let title = win.document.title.replace(/\(NicoLive\sHelper\)/,'');
	    menuitem = CreateMenuItem(title,i);
	    menuitem.setAttribute("oncommand","NicoLiveWindow.winlist[event.target.value].focus();");
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
	NicoLivePreference.getBranch().setCharPref("window-pos",JSON.stringify(pos));
    },

    defaultSize:function(){
	let dw = window.outerWidth-window.innerWidth;
	let dh = window.outerHeight-window.innerHeight;
	this.resize(720+dw,512+dh);
    },

    findTab:function(request_id){
	let wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
	let browserEnumerator = wm.getEnumerator("navigator:browser");
	let url = "http://live.nicovideo.jp/watch/"+request_id;
	while(browserEnumerator.hasMoreElements()) {
	    let browserInstance = browserEnumerator.getNext().gBrowser;
	    // browser インスタンスの全てのタブを確認する.
	    let numTabs = browserInstance.tabContainer.childNodes.length;
	    for(let index=0; index<numTabs; index++) {
		let currentBrowser = browserInstance.getBrowserAtIndex(index);
		if (currentBrowser.currentURI.spec.match(url)) {
		    return browserInstance.tabContainer.childNodes[index];
		}
	    }
	}
	return null;
    },

    removeConsole:function(){
	let tab = this.findTab(NicoLiveHelper.request_id);
	if(tab){
	    try{
		let console = tab.linkedBrowser.contentDocument.getElementById('console_container').wrappedJSObject;
		console.parentNode.removeChild(console);
	    } catch (x) {
		debugprint(x);
	    }
	}
    },

    setupWindowOpener:function(){
	// window.openerがないときに、ブラウザ本体を探して設定する.
	if( !window.opener ){
	    let wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
	    let browserwin = wm.getMostRecentWindow("navigator:browser");
	    window.opener = browserwin;
	}
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
		    NicoLiveHelper.connectNewBroadcasting(request_id,"",false,"");
		} catch (x) {
		}
	    }
	};
	req.send("");
    },

    // 放送IDを入力して接続.
    connectToBroadcasting:function(){
	let lvid = InputPrompt("接続する番組の放送ID(lvXXXX)またはコミュニティ・チャンネルID、\nもしくは、URLを入力してください。\n何も入力せずにOKすると、現在放送中の番組に接続します。","放送IDを入力","");
	let request_id;
	if( lvid==null ) return;
	if( lvid=="" ){
	    this.getCurrentBroadcasting();
	    return;
	}
	request_id = lvid.match(/lv\d+/);
	if(request_id){
	    NicoLiveHelper.connectNewBroadcasting(request_id,"",true,"");
	}
	request_id = lvid.match(/co\d+/) || lvid.match(/ch\d+/);
	if(request_id){
	    NicoLiveHelper.connectNewBroadcasting(request_id,"",true,request_id);
	}

	request_id = lvid.match(/nsen\/(.*)$/);
	if( request_id[1] ){
	    this.getNsenId(request_id[1]);
	}
    },

    getCurrentBroadcasting:function(){
	let url = "http://live.nicovideo.jp/my";
	let req = CreateXHR("GET",url);
	if(!req) return;

	$('btn-connect-to-current-broadcast').disabled = true;
	req.onreadystatechange = function(){
	    if( req.readyState==4 ){
		$('btn-connect-to-current-broadcast').disabled = false;
		if( req.status==200 ){
		    let str = req.responseText;
		    try{
			let lvid = str.match(/href=\"http.*\/watch\/(lv\d+)\"\s*class=\"now\"/)[1];
			debugprint( lvid );
			if(lvid){
			    NicoLiveHelper.connectNewBroadcasting(lvid,"",true,"");
			}
		    } catch (x) {
			ShowNotice("放送中の番組が見つかりませんでした。");
		    }
		}
	    }
	};
	req.send('');
	return;
    },

    backupCurrent:function(){
	this.backup('system-backup');
	this.createRestoreMenu();
    },

    // 復元を確認する.
    confirmRestore:function(backupname){
	if(ConfirmPrompt(LoadFormattedString('STR_BACKUP_WARN_RESTORE',[backupname]),
			 LoadString('STR_BACKUP_WARN_RESTORE_TITLE'))){
	    NicoLiveWindow.restore(backupname);
	    ShowNotice( LoadFormattedString('STR_BACKUP_RESTORE',[backupname]) );
	}
    },
    // 削除を確認する.
    confirmDelete:function(backupname){
	if(ConfirmPrompt(LoadFormattedString('STR_BACKUP_WARN_DELETE',[backupname]),
			 LoadString('STR_BACKUP_WARN_DEL_TITLE'))){
	    delete NicoLiveWindow.backuprestore[backupname];
	    NicoLiveWindow.createRestoreMenu();
	    Application.storage.set("nico_live_backup",NicoLiveWindow.backuprestore);
	    ShowNotice( LoadFormattedString('STR_BACKUP_DELETE',[backupname]) );
	}
    },

    createRestoreMenu:function(){
	let menu = $('toolbar-restore');
	let deletemenu = $('toolbar-deletebackup');
	while(menu.firstChild){
	    menu.removeChild(menu.firstChild);
	}
	while(deletemenu.firstChild){
	    deletemenu.removeChild(deletemenu.firstChild);
	}
	// 保存時刻順にソートするために一旦配列に.
	let tmp = new Array();
	for (backupname in this.backuprestore){
	    this.backuprestore[backupname].name = backupname;
	    tmp.push(this.backuprestore[backupname]);
	}
	tmp.sort( function(a,b){ return b.time-a.time; } );
	for(let i=0,item; item=tmp[i];i++){
	    let backupname = item.name;
	    let elem = CreateMenuItem(backupname,'');
	    if( item.time ){
		let str = GetDateString(item.time*1000);
		elem.setAttribute('tooltiptext',str);
	    }
	    // 復元用.
	    elem.setAttribute("oncommand","NicoLiveWindow.confirmRestore('"+backupname+"');");
	    menu.appendChild(elem);

	    // 削除用.
	    elem = CreateMenuItem(backupname,'');
	    elem.setAttribute("oncommand","NicoLiveWindow.confirmDelete('"+backupname+"');");
	    deletemenu.appendChild(elem);
	}
    },

    inputBackupName:function(){
	let backupname = InputPrompt( LoadString('STR_BACKUP_TEXT'), LoadString('STR_BACKUP_CAPTION'), '');
	if( backupname && backupname.length ){
	    if( backupname!='system-backup' ){
		this.backup(backupname);
		this.createRestoreMenu();
		ShowNotice( LoadFormattedString('STR_BACKUP_RESULT',[backupname]) );
	    }else{
		ShowNotice( LoadFormattedString('STR_BACKUP_FAILED',[backupname]) );
	    }
	}
    },

    // ウィンドウの、リク、ストック、履歴の状態をバックアップする.
    backup: function(name){
	let data = new Object;
	// オブジェクトのコピーにはちょっとセコイ手のような気がするが.
	// これはこれで有効な気がする(重い処理のような気もするけど)
	data.request   = JSON.parse(JSON.stringify(NicoLiveHelper.requestqueue));
	data.stock     = JSON.parse(JSON.stringify(NicoLiveHelper.stock));
	data.playlist  = JSON.parse(JSON.stringify(NicoLiveHelper.playlist));
	data.playlist_txt = JSON.parse(JSON.stringify($('played-list-textbox').value));
	if(name=='system-backup'){
	    data.time = 0;
	}else{
	    data.time = GetCurrentTime();
	}

	this.backuprestore[name] = data;
	Application.storage.set("nico_live_backup",this.backuprestore);
    },

    // ウィンドウの、リク、ストック、履歴の状態を復元する.
    restore: function(name){
	let data = this.backuprestore[name];

	$('played-list-textbox').value = data.playlist_txt;
	NicoLiveHelper.requestqueue = JSON.parse(JSON.stringify(data.request));
	NicoLiveHelper.stock = JSON.parse(JSON.stringify(data.stock));
	NicoLiveHelper.playlist = JSON.parse(JSON.stringify(data.playlist));
	for(let i=0,item;item=NicoLiveHelper.playlist[i];i++){
	    NicoLiveHelper.playlist["_"+item.video_id] = item.playedtime;
	}
	NicoLiveRequest.update(NicoLiveHelper.requestqueue);
	NicoLiveRequest.updateStockView(NicoLiveHelper.stock);
	NicoLiveHistory.update(NicoLiveHelper.playlist);
	NicoLiveHelper.updateRemainRequestsAndStocks();
	NicoLiveHelper.saveAll();
    },

    find:function(){
	let tr;
	let tabindex = $('tabpanels').selectedIndex;
	switch( tabindex ){
	case 0:// request
	case 1:// stock
	    NicoLiveRequest.findRequestStock();
	    return;

	case 4:// comment
	    tr = $('comment_table').getElementsByTagName('html:tr');
	    break;
	default:
	    return;
	}

	let searchword = InputPrompt(LoadString('STR_FIND_STRING'),LoadString('STR_FIND'),'');
	if(searchword==null) return;

	this.searchword = searchword;
	this.searchfoundidx = 0;
	this.searchtab = tabindex;

	for(let i=0,row;row=tr[i];i++){
	    if(row.innerHTML.match(searchword)){
		row.scrollIntoView(true);
		this.searchfoundidx = i;
		break;
	    }
	}
    },
    findNext:function(){
	let tr;
	let tabindex = $('tabpanels').selectedIndex;

	switch( tabindex ){
	case 0:// request
	case 1:// stock
	    NicoLiveRequest.findNextRequestStock();
	    return;

	case 4:// comment
	    tr = $('comment_table').getElementsByTagName('html:tr');
	    break;
	default:
	    return;
	}

	if( this.searchtab!=tabindex ) return;
	let searchword = this.searchword;

	for(let i=this.searchfoundidx+1,row;row=tr[i];i++){
	    if(row.innerHTML.match(searchword)){
		row.scrollIntoView(true);
		this.searchfoundidx = i;
		break;
	    }
	}

    },

    setCustomCSS:function(){
    },

    restoreTabPositions:function(){
	let tabs = NicoLiveDatabase.loadGPStorage("nico_live_tab_position", [] );
	let maintabs = $('maintabs');
	let tabindex = $('mainwindow-tab').selectedIndex;
	for(let i=0,item; item=tabs[i]; i++){
	    let elem = document.getElementById( item );
	    if( elem ){
		maintabs.insertBefore( elem, maintabs.firstChild );
	    }
	}
	$('mainwindow-tab').selectedIndex = tabindex;
    },

    setSubPlay:function(b){
	if( b ){
	    $('cp-mainscreen-label').style.fontWeight = 'normal';
	    $('cp-subscreen-label').style.fontWeight = 'bold';
	}else{
	    $('cp-mainscreen-label').style.fontWeight = 'bold';
	    $('cp-subscreen-label').style.fontWeight = 'normal';
	}
    },

    init: function(){
	let prefs = NicoLivePreference.getBranch();
	if( prefs.getBoolPref("autoscroll") ){
	    try{
		let tab = this.findTab(NicoLiveHelper.request_id) || this.findTab(NicoLiveHelper.community);
		let player;
		if(tab){
		    // watch_player_top_box for ニコニコ動画Zero
		    player = tab.linkedBrowser.contentDocument.getElementById('watch_player_top_box').wrappedJSObject
			|| tab.linkedBrowser.contentDocument.getElementById('WatchPlayer').wrappedJSObject; // for 原宿
		    tab.linkedBrowser.contentWindow.scroll(0,player.offsetTop-32);
		}
	    } catch (x) {
	    }
	}
	this.backuprestore = NicoLiveDatabase.loadGPStorage("nico_live_backup",{});
	this.createRestoreMenu();
	this.setupWindowOpener();

	this.restoreTabPositions();
	this.setCustomCSS();

	this.setSubPlay( $('do-subdisplay').checked );
    },
    destroy: function(){
	this.save();
	NicoLiveDatabase.saveGPStorage("nico_live_backup",this.backuprestore);
    }
};

window.addEventListener("load", function(e){ NicoLiveWindow.init(); }, false);
window.addEventListener("unload", function(e){ NicoLiveWindow.destroy(); }, false);
