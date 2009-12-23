/**
 * リクエストとストック
 */

var NicoLiveRequest = {
    // アイテムを全更新.
    update:function(requestqueue){
	let table = $('request-table');
	if(!table){ return; }

	clearTable(table);
	for(let i=0,item;item=requestqueue[i];i++){
	    this.add(item);
	}
	if(requestqueue.length==0){
	    this.setTotalPlayTime({min:0,sec:0});
	}
    },

    // リクエストテーブルにitemオブジェクトを追加.
    _add:function(table,item){
	let tr = table.insertRow(table.rows.length);
	tr.className = table.rows.length%2?"table_oddrow":"table_evenrow";
	if(item.iscasterselection){
	    tr.className = "table_casterselection";
	}
	if(item.selfrequest){
	    // green
	    tr.className = "color6";
	}
	let td;
	td = tr.insertCell(tr.cells.length);
	td.appendChild(document.createTextNode("#"+table.rows.length));
	if(item.cno>0){
	    td.appendChild(CreateHTMLElement('br'));
	    td.appendChild(document.createTextNode("C#"+item.cno));
	}

	let n = table.rows.length;

	td = tr.insertCell(tr.cells.length);

	let vbox = CreateElement('vbox');
	vbox.setAttribute('context','popup-copyrequest');
	vbox.setAttribute('tooltiptext',item.highbitrate+"kbps/"+item.lowbitrate+"kbps");

	let htmlspan = CreateHTMLElement('span');
	htmlspan.style.display = 'none';
	htmlspan.appendChild(document.createTextNode(item.video_id));
	vbox.appendChild(htmlspan);

	let div = CreateHTMLElement('div');
	let a = CreateHTMLElement('a');
	a.onclick = function(){
	    window.opener.getBrowser().addTab('http://www.nicovideo.jp/watch/'+item.video_id);
	};

	let img = CreateHTMLElement('img');
	img.src = item.thumbnail_url;
	img.style.cssFloat = 'left';
	img.style.marginRight = '0.5em';
	a.appendChild(img);

	let label;

	// 動画ID+タイトル.
	div.appendChild(a); // thumbnail
	div.appendChild(document.createTextNode(item.video_id+'/'+item.title));
	div.appendChild(CreateHTMLElement('br'));

	let datestr = GetDateString(item.first_retrieve*1000);
	div.appendChild(document.createTextNode("投稿日:" + datestr +" "
			   + "再生数:"+item.view_counter+" コメント:"+item.comment_num
			   + " マイリスト:"+item.mylist_counter+" 時間:"+item.length));
	let hr = CreateHTMLElement('hr');
	div.appendChild(hr);

	let div2 = CreateHTMLElement('div');
	//div2.appendChild(document.createTextNode(item.description));
	let str;
	// innerHTMLが使えないのでひたすらDOM操作.
	str = item.description.split(/(mylist\/\d+|sm\d+|nm\d+)/);
	for(let i=0,s;s=str[i];i++){
	    if( s.indexOf('mylist/')!=-1 ){
		let a = CreateHTMLElement('a');
		let mylist = s;
		a.onclick = function(){
		    window.opener.getBrowser().addTab('http://www.nicovideo.jp/'+mylist);
		};
		a.appendChild(document.createTextNode(s));
		div2.appendChild(a);
	    }else if( s.match(/(sm|nm)\d+/) ){
		let a = CreateHTMLElement('a');
		let vid = s;
		a.onclick = function(){
		    window.opener.getBrowser().addTab('http://www.nicovideo.jp/watch/'+vid);
		};
		a.appendChild(document.createTextNode(s));
		div2.appendChild(a);
	    }else{
		div2.appendChild(document.createTextNode(s));
	    }
	}

	div.appendChild(div2);

	vbox.appendChild(div);

	hr = CreateHTMLElement('hr');
	vbox.appendChild(hr);

	label = CreateElement('label');
	label.appendChild(document.createTextNode('タグ:'+item.tags.join(',')));
	vbox.appendChild(label);

	let hbox = CreateElement('hbox');
	let button = CreateElement('button');
	button.setAttribute("label",'再生');
	button.addEventListener("command",function(){ NicoLiveHelper.playMusic(n); },false);
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'削除');
	button.addEventListener("command",function(){ NicoLiveHelper.removeRequest(n); },false);
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'↑↑');
	button.addEventListener("command",function(){ NicoLiveHelper.topToRequest(n); },false);
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'↑');
	button.addEventListener("command",function(){ NicoLiveHelper.floatRequest(n); },false);
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'↓');
	button.addEventListener("command",function(){ NicoLiveHelper.sinkRequest(n); },false);
	hbox.appendChild(button);

	vbox.appendChild(hbox);
	td.appendChild(vbox);

	this.setTotalPlayTime(NicoLiveHelper.getTotalMusicTime());	
    },

    // アイテムを追加.
    add:function(item){
	let table = $('request-table');
	if(!table){ return; }
	this._add(table,item);
    },
    // ストックを全更新.
    updateStockView:function(requestqueue){
	//let table = $('stock-table');
	//clearTable(table);
	let table = CreateHTMLElement('table');
	table.setAttribute('id','stock-table');
	table.className = 'requestview';

	for(let i=0,item;item=requestqueue[i];i++){
	    this._addStockView(table,item);
	}

	$('vbox-stock').replaceChild(table,$('stock-table'));

	if(requestqueue.length==0){
	    this.setTotalStockTime({min:0,sec:0});
	}
    },

    _addStockView:function(table,item){
	let tr = table.insertRow(table.rows.length);
	tr.id ="stock-music-"+table.rows.length;
	tr.className = "table_casterselection";
	if(item.isplayed){
	    tr.className = "table_played";
	}
	if(item.error){
	    tr.className = "white";
	}

	let td;
	td = tr.insertCell(tr.cells.length);
	td.appendChild(document.createTextNode("#"+table.rows.length));

	let n = table.rows.length;

	td = tr.insertCell(tr.cells.length);

	let vbox = CreateElement('vbox');
	vbox.setAttribute('context','popup-sort-stock');
	vbox.setAttribute('tooltiptext',item.highbitrate+"kbps/"+item.lowbitrate+"kbps");

	let htmlspan = CreateHTMLElement('span');
	htmlspan.style.display = 'none';
	htmlspan.appendChild(document.createTextNode(item.video_id));
	vbox.appendChild(htmlspan);

	let div = CreateHTMLElement('div');

	// サムネ.
	let a = CreateHTMLElement('a');
	a.onclick = function(){
	    window.opener.getBrowser().addTab('http://www.nicovideo.jp/watch/'+item.video_id);
	};
	//a.className = 'detail';
	let img = CreateHTMLElement('img');
	img.className = 'stock-thumbnail';
	img.src = item.thumbnail_url;
	img.style.cssFloat = 'left';
	img.style.marginRight = '0.5em';
	img.setAttribute("width",this.visibleDetail?130:65 +"px");
	img.setAttribute("height",this.visibleDetail?100:50 + "px");
	a.appendChild(img);

	let label;

	// 動画ID + タイトル.
	div.appendChild(a); // thumbnail
	div.appendChild( document.createTextNode(item.video_id+"/"+item.title));
	div.appendChild(CreateHTMLElement('br'));

	// 動画情報.
	let datestr = GetDateString(item.first_retrieve*1000);
	div.appendChild(document.createTextNode("投稿日:" + datestr +" "
			   + "再生数:"+item.view_counter+" コメント:"+item.comment_num
			   + " マイリスト:"+item.mylist_counter+" 時間:"+item.length));
	let hr = CreateHTMLElement('hr');
	hr.className = 'detail';
	div.appendChild(hr);

	// 詳細.
	let div2 = CreateHTMLElement('div');
	div2.className = 'detail';
	//div2.appendChild(document.createTextNode(item.description));

	// descriptionにリンクを張る.
	let str,len;
	str = item.description.split(/(mylist\/\d+|sm\d+|nm\d+)/);
	len = str.length;
	for(let i=0,s;i<len;i++){
	    s = str[i];
	    if(!s) continue;
	    if( s.indexOf('mylist/')!=-1 ){
		let a = CreateHTMLElement('a');
		let mylist = s;
		a.onclick = function(){
		    window.opener.getBrowser().addTab('http://www.nicovideo.jp/'+mylist);
		};
		a.appendChild(document.createTextNode(s));
		div2.appendChild(a);
	    }else if( s.match(/(sm|nm)\d+/) ){
		let a = CreateHTMLElement('a');
		let vid = s;
		a.onclick = function(){
		    window.opener.getBrowser().addTab('http://www.nicovideo.jp/watch/'+vid);
		};
		a.appendChild(document.createTextNode(s));
		div2.appendChild(a);
	    }else{
		div2.appendChild(document.createTextNode(s));
	    }
	}

	div.appendChild(div2);

	vbox.appendChild(div);

	hr = CreateHTMLElement('hr');
	hr.className = 'detail';
	vbox.appendChild(hr);

	label = CreateElement('label');
	label.appendChild(document.createTextNode('タグ:'+item.tags.join(',')));
	vbox.appendChild(label);

	let hbox = CreateElement('hbox');
	let button = CreateElement('button');
	button.setAttribute('label','リクエスト');
	button.addEventListener("command",function(){ NicoLiveRequest.addRequestFromStock(n); },false);
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'再生');
	button.addEventListener("command",
				function(){
				    if(!NicoLiveHelper.isOffline()){
					NicoLiveHelper.playStock(n,true);
				    }else{
					let tab = window.opener.getBrowser().addTab('http://www.nicovideo.jp/watch/'+item.video_id);
					NicoLiveRequest.opentab = window.opener.getBrowser().getBrowserForTab(tab);
					NicoLiveRequest.playlist_start = n;
					clearInterval(NicoLiveRequest.playlist_timer);
					NicoLiveRequest.playlist_first = true;
					NicoLiveRequest.playlist_timer = setInterval("NicoLiveRequest.test();",2000);
				    }
				},
				false);
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'削除');
	button.addEventListener("command",function(){ NicoLiveHelper.removeStock(n); },false);
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'↑↑');
	button.addEventListener("command",function(){ NicoLiveHelper.topToStock(n); },false);
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'↑');
	button.addEventListener("command",function(){ NicoLiveHelper.floatStock(n); },false);
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'↓');
	button.addEventListener("command",function(){ NicoLiveHelper.sinkStock(n); },false);
	hbox.appendChild(button);

	vbox.appendChild(hbox);
	td.appendChild(vbox);

	this.setTotalStockTime(NicoLiveHelper.getTotalStockTime());
    },
    addStockView:function(item){
	let table = $('stock-table');
	if(!table){ return; }
	this._addStockView(table,item);
    },

    // ストックからリクエストリストする.
    addRequestFromStock:function(n){
	if(NicoLiveHelper.isOffline()) return;
	if(NicoLiveHelper.iscaster){
	    // 生主の場合は、リクエストリストに追加.
	    NicoLiveHelper.addRequestFromStock(n);
	}else{
	    // リスナーの場合は、動画IDをコメする.
	    try{
		NicoLiveHelper.postListenerComment(NicoLiveHelper.stock[n-1].video_id,"");
	    } catch (x) {
	    }
	}
    },

    // エラーリクエスト表示を更新する.
    updateErrorRequest:function(items){
	let item;
	clearTable($('error-request-table'));
	for each (item in items){
	    this.addErrorRequest(item);
	}
    },
    addErrorRequest:function(item){
	let table = $('error-request-table');
	let tr = table.insertRow(table.rows.length);
	tr.className = table.rows.length%2?"table_oddrow":"table_evenrow";
	if(item.iscasterselection){
	    tr.className = "table_casterselection";
	}
	if(item.error){
	    tr.className = "white";
	}
	if(item.selfrequest){
	    tr.className = "color6";  // green
	}

	let td;
	td = tr.insertCell(tr.cells.length);
	td.appendChild(document.createTextNode("#"+table.rows.length));
	if(item.cno>0){
	    td.appendChild(CreateHTMLElement('br'));
	    td.appendChild(document.createTextNode("C#"+item.cno));
	}

	let n = table.rows.length;

	td = tr.insertCell(tr.cells.length);

	let vbox = CreateElement('vbox');
	//vbox.setAttribute('context','popup-copyrequest');
	vbox.setAttribute('tooltiptext',item.highbitrate+"kbps/"+item.lowbitrate+"kbps");

	let htmlspan = CreateHTMLElement('span');
	htmlspan.style.display = 'none';
	htmlspan.appendChild(document.createTextNode(item.video_id));
	vbox.appendChild(htmlspan);

	let div = CreateHTMLElement('div');
	let a = CreateHTMLElement('a');
	a.onclick = function(){
	    window.opener.getBrowser().addTab('http://www.nicovideo.jp/watch/'+item.video_id);
	};

	let img = CreateHTMLElement('img');
	img.src = item.thumbnail_url;
	img.style.cssFloat = 'left';
	img.style.marginRight = '0.5em';
	a.appendChild(img);

	let label;

	// 動画ID+タイトル.
	div.appendChild(a); // thumbnail
	div.appendChild(document.createTextNode(item.video_id+'/'+item.title));
	div.appendChild(CreateHTMLElement('br'));

	let datestr = GetDateString(item.first_retrieve*1000);
	div.appendChild(document.createTextNode("投稿日:" + datestr +" "
						+ "再生数:"+item.view_counter+" コメント:"+item.comment_num
						+ " マイリスト:"+item.mylist_counter+" 時間:"+item.length));
	let hr = CreateHTMLElement('hr');
	div.appendChild(hr);

	let div2 = CreateHTMLElement('div');
	//div2.appendChild(document.createTextNode(item.description));
	let str;
	// innerHTMLが使えないのでひたすらDOM操作.
	str = item.description.split(/(mylist\/\d+|sm\d+|nm\d+)/);
	for(let i=0,s;s=str[i];i++){
	    if( s.indexOf('mylist/')!=-1 ){
		let a = CreateHTMLElement('a');
		let mylist = s;
		a.onclick = function(){
		    window.opener.getBrowser().addTab('http://www.nicovideo.jp/'+mylist);
		};
		a.appendChild(document.createTextNode(s));
		div2.appendChild(a);
	    }else if( s.match(/(sm|nm)\d+/) ){
		let a = CreateHTMLElement('a');
		let vid = s;
		a.onclick = function(){
		    window.opener.getBrowser().addTab('http://www.nicovideo.jp/watch/'+vid);
		};
		a.appendChild(document.createTextNode(s));
		div2.appendChild(a);
	    }else{
		div2.appendChild(document.createTextNode(s));
	    }
	}

	div.appendChild(div2);

	vbox.appendChild(div);

	hr = CreateHTMLElement('hr');
	vbox.appendChild(hr);

	label = CreateElement('label');
	label.appendChild(document.createTextNode('タグ:'+item.tags.join(',')));
	label.setAttribute("crop","end");
	vbox.appendChild(label);

	let hbox = CreateElement('hbox');
	let button = CreateElement('button');
	button.setAttribute("label",'リクエストに追加');
	button.addEventListener("command",function(){ NicoLiveHelper.addRequestQueue(item); },false);
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'削除');
	button.addEventListener("command",function(){ NicoLiveHelper.removeErrorRequest(item.video_id); },false);
	hbox.appendChild(button);

	vbox.appendChild(hbox);
	td.appendChild(vbox);
    },

    setTotalPlayTime:function(t){
	let elem = $("total-playtime");
	elem.value = "再生時間:"+t.min+"分"+t.sec+"秒/"+NicoLiveHelper.requestqueue.length+"件";
    },
    setTotalStockTime:function(t){
	let elem = $("stock-playtime");
	elem.value = "残時間:"+t.min+"分"+t.sec+"秒/"+NicoLiveHelper.stock.length+"件";
    },

    // 動画ID(複数OK)でリクエストに追加.
    addRequest:function(sm){
	if(sm.length<3) return;
	let l = sm.match(/(sm|nm)\d+/g);
	for(let i=0,id;id=l[i];i++){
	    NicoLiveHelper.addRequest(id,0,"1");
	}
	$('input-request').value="";
    },

    test:function(){
	// playing, pauseed, end
	try{
	    if(this.opentab.contentDocument){
		let status;
		let flv = this.opentab.contentDocument.getElementById('flvplayer').wrappedJSObject; 
		status = flv.ext_getStatus();
		if(this.playlist_first && flv.ext_getPlayheadTime()==0){
		    flv.ext_play(true);
		    this.playlist_first = false;
		    debugprint("play");
		}
		switch(status){
		case "end":
		    if(this.playlist_start>NicoLiveHelper.stock.length){
			debugprint("ストックの最後まで再生しました");
			// 最初に戻る.
			this.playlist_start = 0;
		    }
		    let nextmusic = NicoLiveHelper.stock[ this.playlist_start ];
		    this.playlist_start++;
		    debugprint(nextmusic.video_id+"を再生します");
		    this.opentab.contentDocument.wrappedJSObject.location.href = "http://www.nicovideo.jp/watch/"+nextmusic.video_id;
		    this.playlist_first = true;
		    break;
		}
	    }else{
		debugprint("動画再生タブがなくなったので停止します");
		clearInterval(this.playlist_timer);
	    }
	} catch (x) {
	}
    },

    // ストックに追加する. 動画IDはまとめて渡すことができる.
    addStock:function(sm){
	if(sm.length<3) return;
	$('input-stock').value="";

	try{
	    let l;
	    l = sm.match(/mylist\/\d+/g);
	    if(l){
		for(let i=0,mylist;mylist=l[i];i++){
		    let id = mylist.match(/mylist\/(\d+)/)[1];
		    NicoLiveMylist.addStockFromMylist(id,"");
		}
		return;
	    }
	    l = sm.match(/(sm|nm)\d+/g);
	    for(let i=0,id;id=l[i];i++){
		NicoLiveHelper.addStock(id,0);
	    }
	} catch (x) {
	    
	}
    },

    showhideDetail:function(){
	// [1]で直接アクセスするなんて卑怯な.
	let n = document.styleSheets[1].cssRules.length;
	let i;
	let visible = true;
	for(i=0;i<n;i++){
	    let css = document.styleSheets[1].cssRules[i];
	    if(css.selectorText==".detail"){
		if(css.style.display=="none"){
		    css.style.display="block";
		    visible = true;
		}else{
		    css.style.display="none";
		    visible = false;
		}
	    }
	}
	let elems = document.getElementsByClassName('stock-thumbnail');
	let elem;
	for(i=0;elem=elems[i];i++){
	    elem.setAttribute("width",visible?130:65 +"px");
	    elem.setAttribute("height",visible?100:50 + "px");
	}
	this.visibleDetail = visible;
    },

    copyRequestToClipboard:function(){
	let ids = new Array();
	for(let i=0,item;item=NicoLiveHelper.requestqueue[i];i++){
	    ids.push(item.video_id);
	}
	if(ids.length>0) CopyToClipboard(ids.join('\r\n'));
    },
    saveStockToFile:function(){
	let ids = new Array();
	for(let i=0,item;item=NicoLiveHelper.stock[i];i++){
	    ids.push(item.video_id + " " + item.title);
	}
	if(ids.length<=0) return;

	const nsIFilePicker = Components.interfaces.nsIFilePicker;
	let fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
	fp.init(window, "ストックの保存", nsIFilePicker.modeSave);
	fp.appendFilters(nsIFilePicker.filterText | nsIFilePicker.filterAll);
	let rv = fp.show();
	if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
	    let file = fp.file;
	    let path = fp.file.path;
	    debugprint("「"+path+"」にストックを保存します");
	    let os = Components.classes['@mozilla.org/network/file-output-stream;1'].createInstance(Components.interfaces.nsIFileOutputStream);
	    let flags = 0x02|0x08|0x20;// wronly|create|truncate
	    os.init(file,flags,0664,0);

	    let cos = GetUTF8ConverterOutputStream(os);
	    cos.writeString(ids.join('\r\n')+"\r\n");
	    cos.close();
	}
    },

    // ファイルからストックに登録する.
    readFileToStock:function(file){
	// file は nsIFile
	let istream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
	istream.init(file, 0x01, 0444, 0);
	istream.QueryInterface(Components.interfaces.nsILineInputStream);

	// 行を配列に読み込む
	let line = {}, hasmore;
	let first = true;
	do {
	    hasmore = istream.readLine(line);
	    if( line.value.match(/(sm|nm)\d+/) ){
		if(first){
		    //NicoLiveHelper.clearStock();
		    first = false;
		}
		this.addStock(line.value);
	    }
	} while(hasmore);

	istream.close();
    },

    /* ファイルをドロップしたとき
     * application/x-moz-file
     * text/x-moz-url
     * 
     * Firefoxからリンクをドロップしたとき
     * text/x-moz-url
     * text/x-moz-url-data
     * text/x-moz-url-desc
     * text/uri-list
     * text/_moz_htmlcontext
     * text/_moz_htmlinfo
     * text/html
     * text/plain
     * 
     * Firefoxからタブをドロップしたとき
     * application/x-moz-tabbrowser-tab
     * text/x-moz-text-internal
     */
    checkDrag:function(event){
	//let b = event.dataTransfer.types.contains("application/x-moz-file");
/*
	debugprint("--");
	for(let i=0;i<event.dataTransfer.types.length;i++){
	    debugprint('dragging:'+event.dataTransfer.types.item(i));
	}
*/
	event.preventDefault();
	return true;
    },

    dropToStock:function(event){
	//this.dataTransfer = event.dataTransfer;

	// ファイルをドロップしたとき.
	var file = event.dataTransfer.mozGetDataAt("application/x-moz-file", 0);
	if (file instanceof Components.interfaces.nsIFile){
	    if( !file.leafName.match(/\.txt$/) ) return;
	    debugprint("file dropped:"+file.path);
	    this.readFileToStock(file);
	    return;
	}
	if( event.dataTransfer.types.contains('text/plain') ){
	    let txt = event.dataTransfer.mozGetDataAt("text/plain",0);
	    this.addStock(txt);
	    return;
	}
	// アンカーをドロップしたとき.
	if( event.dataTransfer.types.contains("text/uri-list") ){
	    let uri = event.dataTransfer.mozGetDataAt("text/uri-list",0);
	    debugprint("uri dropped:"+uri);
	    this.addStock(uri);
	    return;
	}
	// タブをドロップしたとき.
	if( event.dataTransfer.types.contains("application/x-moz-tabbrowser-tab") ){
	    debugprint("tab dropped");
	    let tab = event.dataTransfer.mozGetDataAt("application/x-moz-tabbrowser-tab",0);
	    let doc = tab.linkedBrowser.contentDocument;
	    let str = "";
	    for(let i=1,item; item=doc.getElementById('item'+i);i++){
		try{
		    str += item.getElementsByClassName('watch')[0].getAttribute('href') + " ";
		} catch (x) {
		}
	    }
	    str += event.dataTransfer.mozGetDataAt("text/x-moz-text-internal",0);
	    this.addStock(str);
	    return;
	}
    },

    addMylist:function(mylist_id,mylist_name){
	let elem = FindParentElement(document.popupNode,'vbox');
	let video_id = elem.firstChild.textContent; // 動画IDを取れる.
	debugprint('add mylist from request tab:'+video_id);
	NicoLiveMylist._addMyList(mylist_id,mylist_name,video_id);
    },
    // リク、ストックタブ用のマイリス追加メニューを作る.
    appendAddMylistMenu:function(mylists){

	let popupmenu = CreateElement('menu');
	popupmenu.setAttribute('label','マイリストに追加');
	popupmenu.setAttribute('id','addto-mylist-from-history');

	let popup = CreateElement('menupopup');
	popupmenu.appendChild(popup);

	let elem = CreateMenuItem('とりあえずマイリスト','default');
	popup.appendChild(elem);

	for(let i=0,item;item=mylists[i];i++){
	    let elem;
	    let tmp = item.name.match(/.{1,20}/);
	    elem = CreateMenuItem(tmp,item.id);
	    elem.setAttribute("tooltiptext",item.name);
	    popup.appendChild(elem);
	}

	popupmenu.addEventListener("command", function(e){ NicoLiveRequest.addMylist(e.target.value,e.target.label); },false );
	$('popup-sort-stock').insertBefore( popupmenu, $('menu-stock-additionalinfo').nextSibling);

	popupmenu = popupmenu.cloneNode(true);
	popupmenu.addEventListener("command", function(e){ NicoLiveRequest.addMylist(e.target.value,e.target.label); },false );
	$('popup-copyrequest').insertBefore( popupmenu, $('menu-request-additionalinfo').nextSibling);
    },

    init:function(){
	debugprint("NicoLiveRequest.init");
	this.visibleDetail = true;
	this.setTotalPlayTime({min:0,sec:0});
	this.setTotalStockTime({min:0,sec:0});
	this.updateStockView(NicoLiveHelper.stock);
	if(NicoLiveHelper.isOffline()){
	    this.update(NicoLiveHelper.requestqueue);
	}
    }
};

window.addEventListener("load", function() { NicoLiveRequest.init(); }, false);
