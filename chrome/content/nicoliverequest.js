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
 * リクエストとストック
 */

var NicoLiveRequest = {
    // 動画情報を表示しているvboxを作成して返す.
    createVideoInformation:function(item,isstock){
	let vbox = CreateElement('vbox');
	let tmp,tooltip="";
	tmp = NicoLiveDatabase.getFavorite(item.video_id) / 10;
	for(let i=0;i<tmp;i++){
	    tooltip += "★";
	}
	if(tooltip){
	    tooltip = "レート:"+tooltip+"\n";
	}else{
	    tooltip = "レート:なし\n";
	}
	tooltip += item.highbitrate+"kbps/"+item.lowbitrate+"kbps";
	vbox.setAttribute('tooltiptext',tooltip);
	vbox.setAttribute('nicovideo_id',item.video_id);

	if(isstock) vbox.className = 'stock-videoinfo';

	let div = CreateHTMLElement('div');
	let a = CreateHTMLElement('a');
	a.onclick = function(){
	    window.opener.getBrowser().addTab('http://www.nicovideo.jp/watch/'+item.video_id);
	};

	let img = CreateHTMLElement('img');
	img.src = item.thumbnail_url;
	img.style.cssFloat = 'left';
	img.style.marginRight = '0.5em';
	if(isstock){
	    img.className = 'stock-thumbnail';
	    img.setAttribute("width",this.visibleDetail?130:65 +"px");
	    img.setAttribute("height",this.visibleDetail?100:50 + "px");
	}else{
	    img.setAttribute("width","130px");
	    img.setAttribute("height","100px");
	}
	a.appendChild(img);

	let label;

	// 動画ID+タイトル.
	div.appendChild(a); // thumbnail
	div.appendChild(document.createTextNode(item.video_id+'/'+item.title));

	// P名.
	let pname = NicoLiveHelper.getPName(item);
	if(pname){
	    let text = document.createTextNode(' P名:'+pname);
	    text.className = "requestview-pname";
	    div.appendChild(text);
	}

	div.appendChild(CreateHTMLElement('br'));

	let datestr = GetDateString(item.first_retrieve*1000);
	div.appendChild(document.createTextNode("投稿日:" + datestr +" "
			   + "再生数:"+item.view_counter+" コメント:"+item.comment_num
			   + " マイリスト:"+item.mylist_counter+" 時間:"+item.length+(NicoLiveHelper.userdefinedvalue[item.video_id]?" 彡:"+NicoLiveHelper.userdefinedvalue[item.video_id]:'')));
	
	let hr = CreateHTMLElement('hr');
	if(isstock) hr.className = 'detail';
	div.appendChild(hr);

	let div2 = CreateHTMLElement('div');
	if(isstock) div2.className = 'detail';
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
	if(isstock) hr.className = 'detail';
	//hr.setAttribute("size","1");
	vbox.appendChild(hr);

	label = CreateElement('label');
	label.appendChild(document.createTextNode('タグ:'+item.tags.join(',')));
	vbox.appendChild(label);
	return vbox;
    },

    // 指定のvboxに動画情報のvboxを追加する.
    addVideoInformation:function(vbox_parent,item, isstock){
	let vbox = this.createVideoInformation(item,isstock);
	vbox_parent.appendChild(vbox);
    },

    // リクエストを全更新.
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

	this.addVideoInformation(vbox,item);

	let hbox = CreateElement('hbox');
	let button = CreateElement('button');
	button.setAttribute("label",'再生');
	button.className = 'commandbtn';
	button.addEventListener("command",function(){ NicoLiveHelper.playMusic(n); },false);
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'削除');
	button.className = 'commandbtn';
	button.addEventListener("command",function(){ NicoLiveHelper.removeRequest(n); },false);
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'↑↑');
	button.className = 'commandbtn';
	button.addEventListener("command",function(){ NicoLiveHelper.topToRequest(n); },false);
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'↑');
	button.className = 'commandbtn';
	button.addEventListener("command",function(){ NicoLiveHelper.floatRequest(n); },false);
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'↓');
	button.className = 'commandbtn';
	button.addEventListener("command",function(){ NicoLiveHelper.sinkRequest(n); },false);
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'↓↓');
	button.className = 'commandbtn';
	button.addEventListener("command",function(){ NicoLiveHelper.bottomToRequest(n); },false);
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


    // 再生済み動画の表示更新.
    updateStockViewForPlayedVideo:function(q){
	// ストックの配列とテーブルの行が1対1で対応しているので.
	let rows = $('stock-table').getElementsByTagName('tr');
	for(let i=0,item;item=q[i];i++){
	    if(NicoLiveHelper.isPlayedMusic(item.video_id)){
		rows[i].className = "table_played";
	    }else{
		rows[i].className = "table_casterselection";		
	    }
	}
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

    // ストックの行を交換する.
    // 行を丸々交換するのは、事前にコマンドや関数仕込んでいるので面倒くさいので
    // 動画情報表示部分だけ交換すればいいのに気付いた.
    // row1,row2 : 0,1,2,3,....
    exchangeStockRow:function(row1,row2){
	let vbox = document.getElementsByClassName('stock-videoinfo');
	let parent1 = vbox[row1].parentNode;
	let parent2 = vbox[row2].parentNode;

	let tmp1 = this.createVideoInformation( NicoLiveHelper.stock[row1], true );
	let tmp2 = this.createVideoInformation( NicoLiveHelper.stock[row2], true );

	parent1.replaceChild( tmp1, vbox[row1] );
	parent2.replaceChild( tmp2, vbox[row2] );
    },

    // ストックの行を削除する.
    // row : 0,1,2,3,...
    deleteStockRow:function(row){
	let table = $('stock-table');
	table.deleteRow(row);
	this.resetStockIndex();
	this.setTotalStockTime(NicoLiveHelper.getTotalStockTime());
    },

    // stock-indexを全部付け直す.
    resetStockIndex:function(){
	let tr = $('stock-table').getElementsByTagName('tr');	
	for(let i=0,row;row=tr[i];i++){
	    row.setAttribute("stock-index",i+1);
	    let td = row.firstChild;
	    td.replaceChild( document.createTextNode("#"+(i+1)), td.firstChild );
	}
    },

    // row : 0,1,2,...
    topToStock:function(row){
	debugprint( (new Date()).getTime() );

	let table = $('stock-table');
	table.deleteRow(row);
	let tr = table.insertRow(0);

	this.createRowOfStock(tr,1,NicoLiveHelper.stock[0]);

	this.resetStockIndex();

	debugprint( (new Date()).getTime() );
    },
    // row : 0,1,2,...
    bottomToStock:function(row){
	debugprint( (new Date()).getTime() );

	let table = $('stock-table');
	table.deleteRow(row);
	
	let n = NicoLiveHelper.stock.length-1;
	this._addStockView(table,NicoLiveHelper.stock[n]);

	this.resetStockIndex();
	debugprint( (new Date()).getTime() );
    },

    // ストックテーブルの行の中身を作成する.
    // tr : 行
    // n : n行目(1,2,...n)
    // item : 動画情報.
    createRowOfStock:function(tr,n,item){
	tr.className = "table_casterselection";
	tr.setAttribute("stock-index",n);

	if(item.isplayed){
	    tr.className = "table_played";
	}
	if(item.error){
	    // エラー動画タブ用意したから必要ないかも.
	    tr.className = "white";
	}

	let td;
	td = tr.insertCell(tr.cells.length);
	td.appendChild(document.createTextNode("#"+n));
	
	td = tr.insertCell(tr.cells.length);

	let vbox = CreateElement('vbox');
	vbox.setAttribute('context','popup-sort-stock');

	this.addVideoInformation(vbox,item,true);

	// コマンドボタンに作用するストックのインデックスはtrの属性から取ることにしよう.
	let hbox = CreateElement('hbox');
	let button = CreateElement('button');
	button.setAttribute('label','リクエスト');
	button.className = 'commandbtn';
	button.addEventListener("command",
				function(event){
				    let n = FindParentElement(event.target,'tr');
				    debugprint('stock-index:'+tr.getAttribute('stock-index') );
				    n = tr.getAttribute('stock-index');
				    NicoLiveRequest.addRequestFromStock(n);
				},false);
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'再生');
	button.className = 'commandbtn';
	button.addEventListener("command",
				function(event){
				    let n = FindParentElement(event.target,'tr');
				    debugprint('stock-index:'+tr.getAttribute('stock-index') );
				    n = tr.getAttribute('stock-index');
				    if(!NicoLiveHelper.isOffline()){
					NicoLiveHelper.playStock(n,true);
				    }else{
					let nextmusic = NicoLiveHelper.stock[ n-1 ];
					try{
					    NicoLiveRequest.opentab.contentDocument.wrappedJSObject.location.href = "http://www.nicovideo.jp/watch/"+nextmusic.video_id;
					} catch (x) {
					    let tab = window.opener.getBrowser().addTab('http://www.nicovideo.jp/watch/'+nextmusic.video_id);
					    NicoLiveRequest.opentab = window.opener.getBrowser().getBrowserForTab(tab);
					}
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
	button.className = 'commandbtn';
	button.addEventListener("command",
				function(event){
				    let n = FindParentElement(event.target,'tr');
				    debugprint('stock-index:'+tr.getAttribute('stock-index') );
				    n = tr.getAttribute('stock-index');
				    NicoLiveHelper.removeStock(n);
				},false);
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'↑↑');
	button.className = 'commandbtn';
	button.addEventListener("command",
				function(event){
				    let n = FindParentElement(event.target,'tr');
				    debugprint('stock-index:'+tr.getAttribute('stock-index') );
				    n = tr.getAttribute('stock-index');
				    NicoLiveHelper.topToStock(n);
				},false);
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'↑');
	button.className = 'commandbtn';
	button.addEventListener("command",
				function(event){
				    let n = FindParentElement(event.target,'tr');
				    debugprint('stock-index:'+tr.getAttribute('stock-index') );
				    n = tr.getAttribute('stock-index');
				    NicoLiveHelper.floatStock(n);
				},false);
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'↓');
	button.className = 'commandbtn';
	button.addEventListener("command",
				function(event){
				    let n = FindParentElement(event.target,'tr');
				    debugprint('stock-index:'+tr.getAttribute('stock-index') );
				    n = tr.getAttribute('stock-index');
				    NicoLiveHelper.sinkStock(n);
				},false);
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'↓↓');
	button.className = 'commandbtn';
	button.addEventListener("command",
				function(event){
				    let n = FindParentElement(event.target,'tr');
				    debugprint('stock-index:'+tr.getAttribute('stock-index') );
				    n = tr.getAttribute('stock-index');
				    NicoLiveHelper.bottomToStock(n);
				},false);
	hbox.appendChild(button);

	vbox.appendChild(hbox);
	td.appendChild(vbox);
    },

    _addStockView:function(table,item){
	let tr = table.insertRow(table.rows.length);
	let n = table.rows.length;

	this.createRowOfStock(tr,n,item);

	this.setTotalStockTime(NicoLiveHelper.getTotalStockTime());
    },
    addStockView:function(item){
	let table = $('stock-table');
	if(!table){ return; }
	this._addStockView(table,item);
    },

    // ストックからリクエストリストする.
    addRequestFromStock:function(n){
	if(NicoLiveHelper.iscaster || NicoLiveHelper.isOffline() ){
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
	if(item.isplayed){
	    tr.className = "table_played";
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
	vbox.setAttribute('context','popup-error-request');

	this.addVideoInformation(vbox,item);

	let hbox = CreateElement('hbox');
	let button = CreateElement('button');
	button.setAttribute("label",'リクエストに追加');
	button.className = 'commandbtn';
	button.addEventListener("command",function(){ NicoLiveHelper.addRequestQueue(item); },false);
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'削除');
	button.className = 'commandbtn';
	button.addEventListener("command",function(){ NicoLiveHelper.removeErrorRequest(item.video_id); },false);
	hbox.appendChild(button);

	vbox.appendChild(hbox);
	td.appendChild(vbox);
    },

    setTotalPlayTime:function(t){
	let elem = $("total-playtime");
	elem.value = "総時間:"+t.min+"分"+t.sec+"秒/"+NicoLiveHelper.requestqueue.length+"件";
    },
    setTotalStockTime:function(t){
	let elem = $("stock-playtime");
	elem.value = "残時間:"+t.min+"分"+t.sec+"秒/"+NicoLiveHelper.stock.length+"件";
    },

    // 再生時間表示を更新する.
    updateTotalPlayTime:function(){
	let req = NicoLiveHelper.getTotalMusicTime();
	let stock = NicoLiveHelper.getTotalStockTime();
	this.setTotalPlayTime(req);
	this.setTotalStockTime(stock);
	NicoLiveHelper.updateRemainRequestsAndStocks();
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
	// playing, paused, end
	try{
	    if(this.opentab.contentDocument){
		let status;
		let flv = this.opentab.contentDocument.getElementById('flvplayer').wrappedJSObject; 
		status = flv.ext_getStatus();
		if(this.playlist_first && flv.ext_getPlayheadTime()==0){
		    flv.ext_play(true);
		    this.playlist_first = false;
		    
		    let flvcontainer = this.opentab.contentDocument.getElementById('flvplayer_container').wrappedJSObject;
		    this.opentab.contentWindow.scroll(0,flvcontainer.offsetTop-32);
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
		    if(!NicoLiveHelper.isautoplay) break;
		    this.playlist_start++;
		    if(nextmusic){
			debugprint(nextmusic.video_id+"を再生します");
			this.opentab.contentDocument.wrappedJSObject.location.href = "http://www.nicovideo.jp/watch/"+nextmusic.video_id;
			this.playlist_first = true;
		    }
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


    // ストックの再生済み状態をOFFにする.
    offPlayedStatus:function(){
	let elem = FindParentElement(document.popupNode,'vbox');
	let video_id = elem.getAttribute('nicovideo_id');
	debugprint('off played flag:'+video_id);
	NicoLiveHelper.offPlayedStatus(video_id);

	this.updateStockViewForPlayedVideo(NicoLiveHelper.stock);	
	this.setTotalStockTime(NicoLiveHelper.getTotalStockTime());
	NicoLiveHelper.updateRemainRequestsAndStocks();
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
	let video_id = elem.getAttribute('nicovideo_id'); // 動画IDを取れる.
	debugprint('add mylist from request tab:'+video_id);
	NicoLiveMylist._addMyList(mylist_id,mylist_name,video_id);
    },

    // リク、ストックタブ用のマイリス追加メニューを作る.
    appendAddMylistMenu:function(mylists){
	let popupmenu = NicoLiveMylist.createAddMylistMenu(mylists);
	popupmenu.addEventListener("command",
				   function(e){
				       NicoLiveRequest.addMylist(e.target.value,e.target.label);
				   },false );
	$('popup-sort-stock').insertBefore( popupmenu, $('menu-stock-additionalinfo').nextSibling);

	popupmenu = NicoLiveMylist.createAddMylistMenu(mylists);
	popupmenu.addEventListener("command",
				   function(e){
				       NicoLiveRequest.addMylist(e.target.value,e.target.label);
				   },false );
	$('popup-copyrequest').insertBefore( popupmenu, $('menu-request-additionalinfo').nextSibling);
    },

    // ストックを再描画.
    // F5を押したときに使用.
    redrawStock:function(){
	debugprint('start:'+ (new Date()).getTime() );
	this.updateStockView(NicoLiveHelper.stock);
	NicoLiveHelper.updateRemainRequestsAndStocks();
	debugprint('end:'+ (new Date()).getTime() );
	debugprint('redraw stock is done.');
    },

    // ストック、リクエストを検索.
    findRequestStock:function(){
	let tr;
	let tabindex = $('tabpanels').selectedIndex;
	if( tabindex==1 ){
	    debugprint('find from stock');
	    tr = $('stock-table').getElementsByTagName('tr');
	}else if( tabindex==0 ){
	    debugprint('find from request');
	    tr = $('request-table').getElementsByTagName('html:tr');
	}else return;

	let searchword = InputPrompt('検索文字列を入力してください','検索','');
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

    // 次を検索.
    findNextRequestStock:function(){
	let tr;
	let tabindex = $('tabpanels').selectedIndex;
	if( this.searchtab!=tabindex ) return;

	if( tabindex==1 ){
	    tr = $('stock-table').getElementsByTagName('tr');
	}else if( tabindex==0 ){
	    tr = $('request-table').getElementsByTagName('html:tr');
	}else return;

	let searchword = this.searchword;

	for(let i=this.searchfoundidx+1,row;row=tr[i];i++){
	    if(row.innerHTML.match(searchword)){
		row.scrollIntoView(true);
		this.searchfoundidx = i;
		break;
	    }
	}
    },

    prepare:function(){
	let elem = FindParentElement(document.popupNode,'vbox');
	let vid = elem.getAttribute('nicovideo_id');
	NicoLiveHelper.postCasterComment('/prepare '+vid,""); // 動画IDを取れる.
    },

    // 学習を行う.
    doTrain:function(e){
	let vbox = FindParentElement(document.popupNode,'vbox');
	let vid = vbox.getAttribute('nicovideo_id');
	debugprint('train:'+e.target+"/"+e.target.value+"/"+vid);
	let item = NicoLiveHelper.findVideoInfo(vid);
	if(item==null) return;

	let str = new Array();
	for(let i=0,tag; tag=item.tags[i];i++){
	    str.push(ZenToHan(tag.toLowerCase()));
	}
	NicoLiveClassifier.train(str,e.target.value);
    },

    // 分類を行う.
    doClassify:function(e){
	let vbox = FindParentElement(document.popupNode,'vbox');
	let vid = vbox.getAttribute('nicovideo_id');
	let item = NicoLiveHelper.findVideoInfo(vid);
	if(item==null) return;

	let str = new Array();
	for(let i=0,tag; tag=item.tags[i];i++){
	    str.push(ZenToHan(tag.toLowerCase()));
	}
	debugalert('classify:'+NicoLiveClassifier.classify(str));
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
