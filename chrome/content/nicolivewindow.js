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
	NicoLivePreference.getBranch().setCharPref("window-pos",JSON.stringify(pos));
    },

    defaultSize:function(){
	let dw = window.outerWidth-window.innerWidth;
	let dh = window.outerHeight-window.innerHeight;
	this.resize(720+dw,512+dh);
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

	this.backuprestore = NicoLiveDatabase.loadGPStorage("nico_live_backup",{});
	this.createRestoreMenu();
    },
    destroy: function(){
	this.save();
    },


    backupCurrent:function(){
	this.backup('system-backup');
	this.createRestoreMenu();
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
	    elem.addEventListener('command', function(){
				      if(ConfirmPrompt(LoadFormattedString('STR_BACKUP_WARN_RESTORE',[backupname]),
						       LoadString('STR_BACKUP_WARN_RESTORE_TITLE'))){
					  NicoLiveWindow.restore(backupname);
					  ShowNotice( LoadFormattedString('STR_BACKUP_RESTORE',[backupname]) );
				      }
				  },false);
	    menu.appendChild(elem);

	    // 削除用.
	    elem = CreateMenuItem(backupname,'');
	    elem.addEventListener('command', function(){
				      if(ConfirmPrompt(LoadFormattedString('STR_BACKUP_WARN_DELETE',[backupname]),
						       LoadString('STR_BACKUP_WARN_DEL_TITLE'))){
					  delete NicoLiveWindow.backuprestore[backupname];
					  NicoLiveWindow.createRestoreMenu();
					  NicoLiveDatabase.saveGPStorage("nico_live_backup",NicoLiveWindow.backuprestore);
					  ShowNotice( LoadFormattedString('STR_BACKUP_DELETE',[backupname]) );
				      }
				  },false);
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
	data.request   = NicoLiveHelper.requestqueue;
	data.stock     = NicoLiveHelper.stock;
	data.playlist  = NicoLiveHelper.playlist;
	data.playlist_txt = $('played-list-textbox').value;
	if(name=='system-backup'){
	    data.time = 0;
	}else{
	    data.time = GetCurrentTime();
	}

	this.backuprestore[name] = data;
	NicoLiveDatabase.saveGPStorage("nico_live_backup",this.backuprestore);
    },

    // ウィンドウの、リク、ストック、履歴の状態を復元する.
    restore: function(name){
	let data = this.backuprestore[name];

	$('played-list-textbox').value = data.playlist_txt;
	NicoLiveHelper.requestqueue = data.request;
	NicoLiveHelper.stock = data.stock;
	NicoLiveHelper.playlist = data.playlist;

	NicoLiveRequest.update(NicoLiveHelper.requestqueue);
	NicoLiveRequest.updateStockView(NicoLiveHelper.stock);
	NicoLiveHistory.update(NicoLiveHelper.playlist);
	NicoLiveHelper.updateRemainRequestsAndStocks();
    }
};

function NicoLiveWindowRestorePosition()
{
    NicoLiveWindow.init();
}

window.addEventListener("load", function(e){ NicoLiveWindow.init(); }, false);
window.addEventListener("unload", function(e){ NicoLiveWindow.destroy(); }, false);
