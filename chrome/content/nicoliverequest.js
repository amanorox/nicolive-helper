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
	let tooltip="";
	let i;
	tooltip = "レート:"+GetFavRateString(NicoLiveDatabase.getFavorite(item.video_id)) + "\n";
	tooltip += item.highbitrate+"kbps/"+item.lowbitrate+"kbps";
	vbox.setAttribute('tooltiptext',tooltip);
	vbox.setAttribute('nicovideo_id',item.video_id);

	if(isstock) vbox.className = 'stock-videoinfo';

	let div = CreateHTMLElement('div');
	div.className ="selection";
	let a = CreateHTMLElement('a');
	a.className = "";
	a.setAttribute("onclick","window.opener.getBrowser().addTab('http://www.nicovideo.jp/watch/"+item.video_id+"');");

	let img = CreateHTMLElement('img');
	img.src = item.thumbnail_url;
	img.style.cssFloat = 'left';
	img.style.marginRight = '0.5em';
	if(isstock){
	    img.className = 'stock-thumbnail';
	    img.setAttribute("width",this.visibleDetail?130:65 +"px");
	    img.setAttribute("height",this.visibleDetail?100:50 + "px");
	}else{
	    if(item.no_live_play){
		img.className = "no_live_play";
	    }
	    img.setAttribute("width","130px");
	    img.setAttribute("height","100px");
	}
	a.setAttribute("onmouseover","NicoLiveComment.showThumbnail(event,'"+item.video_id+"');");
	a.setAttribute("onmouseout","NicoLiveComment.hideThumbnail();");
	a.appendChild(img);

	let label;
	// 動画ID+タイトル.
	div.appendChild(a); // thumbnail
	let text = document.createTextNode(item.video_id+'/'+item.title);
	div.appendChild(text);

	let pname = NicoLiveHelper.getPName(item); // P名.
	if(pname){
	    text = document.createTextNode(' P名:'+pname);
	    div.appendChild(text);
	}
	let mylist = NicoLiveMylist.isVideoExists(item.video_id);
	if(mylist){
	    text = document.createTextNode(' マ:'+mylist);
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
	if(isstock){
	    div2.className = 'detail selection';
	}else{
	    div2.className = "selection";
	}
	let str;
	// innerHTMLが使えないのでひたすらDOM操作.
	str = item.description.split(/(mylist\/\d+|sm\d+|nm\d+)/);
	for(i=0;i<str.length;i++){
	    let s = str[i];
	    if( s.indexOf('mylist/')!=-1 ){
		let a = CreateHTMLElement('a');
		let mylist = s;
		a.setAttribute("onclick","window.opener.getBrowser().addTab('http://www.nicovideo.jp/"+mylist+"');");
		a.appendChild(document.createTextNode(s));
		div2.appendChild(a);
	    }else if( s.match(/(sm|nm)\d+/) ){
		let a = CreateHTMLElement('a');
		let vid = s;
		a.setAttribute("onclick","window.opener.getBrowser().addTab('http://www.nicovideo.jp/watch/"+vid+"');");
		a.setAttribute("onmouseover","NicoLiveComment.showThumbnail(event,'"+vid+"');");
		a.setAttribute("onmouseout","NicoLiveComment.hideThumbnail();");
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
	vbox.appendChild(hr);

	label = CreateElement('description');
	if( item.classify ){
	    // 動画情報に分類情報があれば、タグの前にラベルを付ける.
	    let text = CreateHTMLElement('span');
	    //text.className = item.classify.class;
	    text.style.backgroundColor = NicoLivePreference.classes["_"+item.classify['class']];
	    text.appendChild(document.createTextNode('['+item.classify['class']+']'));
	    label.appendChild(text);
	}
	label.className = "selection";
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
	tr.setAttribute("request-index",n); // 1,2,3,...

	td = tr.insertCell(tr.cells.length);

	let vbox = CreateElement('vbox');
	vbox.setAttribute('context','popup-copyrequest');

	this.addVideoInformation(vbox,item);

	let hbox = CreateElement('hbox');
	let button = CreateElement('button');
	button.setAttribute("label",'再生');
	button.className = 'commandbtn';
	button.setAttribute("oncommand","NicoLiveHelper.playMusic("+n+");");
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'削除');
	button.className = 'commandbtn';
	button.setAttribute("oncommand","NicoLiveHelper.removeRequest("+n+");");
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'↑↑');
	button.className = 'commandbtn';
	button.setAttribute("oncommand","NicoLiveHelper.topToRequest("+n+");");
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'↑');
	button.className = 'commandbtn';
	button.setAttribute("oncommand","NicoLiveHelper.floatRequest("+n+");");
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'↓');
	button.className = 'commandbtn';
	button.setAttribute("oncommand","NicoLiveHelper.sinkRequest("+n+");");
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'↓↓');
	button.className = 'commandbtn';
	button.setAttribute("oncommand","NicoLiveHelper.bottomToRequest("+n+");");
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
	    if(item.isplayed){
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
	let table = $('stock-table');
	table.deleteRow(row);
	let tr = table.insertRow(0);
	this.createRowOfStock(tr,1,NicoLiveHelper.stock[0]);
	this.resetStockIndex();
    },
    // row : 0,1,2,...
    bottomToStock:function(row){
	let table = $('stock-table');
	table.deleteRow(row);
	let n = NicoLiveHelper.stock.length-1;
	this._addStockView(table,NicoLiveHelper.stock[n]);
	this.resetStockIndex();
    },

    // ストックのリクエストボタン.
    _stockRequest:function(event){
	let tr = FindParentElement(event.target,'tr');
	let n = tr.getAttribute('stock-index');
	NicoLiveRequest.addRequestFromStock(n);
    },
    // ストックの再生ボタン.
    _stockPlay:function(event){
	let tr = FindParentElement(event.target,'tr');
	let n = tr.getAttribute('stock-index');
	if(!NicoLiveHelper.isOffline()){
	    NicoLiveHelper.playStock(n,true);
	}else{
	    let nextmusic = NicoLiveHelper.stock[ n-1 ];
	    NicoLiveRequest.opentab = NicoLivePlaylist.newTab(nextmusic.video_id);

	    NicoLiveRequest.playlist_start = n;
	    clearInterval(NicoLiveRequest.playlist_timer);
	    NicoLiveRequest.playlist_first = 1;

	    NicoLiveRequest.playlist_timer = setInterval("NicoLiveRequest.test();",3000);
	}
    },

    // ストックの削除ボタン.
    _stockDelete:function(event){
	let tr = FindParentElement(event.target,'tr');
	let n = tr.getAttribute('stock-index');
	NicoLiveHelper.removeStock(n);
    },
    // ストックの↑↑ボタン.
    _stockTop:function(event){
	let tr = FindParentElement(event.target,'tr');
	let n = tr.getAttribute('stock-index');
	NicoLiveHelper.topToStock(n);
    },
    // ストックの↑ボタン.
    _stockFloat:function(event){
	let tr = FindParentElement(event.target,'tr');
	let n = tr.getAttribute('stock-index');
	NicoLiveHelper.floatStock(n);
    },
    // ストックの↓ボタン.
    _stockSink:function(event){
	let tr = FindParentElement(event.target,'tr');
	let n = tr.getAttribute('stock-index');
	NicoLiveHelper.sinkStock(n);
    },
    // ストックの↓↓ボタン.
    _stockBottom:function(event){
	let tr = FindParentElement(event.target,'tr');
	let n = tr.getAttribute('stock-index');
	NicoLiveHelper.bottomToStock(n);
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
	button.setAttribute("oncommand","NicoLiveRequest._stockRequest(event);");
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'再生');
	button.className = 'commandbtn';
	button.setAttribute("oncommand","NicoLiveRequest._stockPlay(event);");
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'削除');
	button.className = 'commandbtn';
	button.setAttribute("oncommand","NicoLiveRequest._stockDelete(event);");
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'↑↑');
	button.className = 'commandbtn';
	button.setAttribute("oncommand","NicoLiveRequest._stockTop(event);");
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'↑');
	button.className = 'commandbtn';
	button.setAttribute("oncommand","NicoLiveRequest._stockFloat(event);");
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'↓');
	button.className = 'commandbtn';
	button.setAttribute("oncommand","NicoLiveRequest._stockSink(event);");
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'↓↓');
	button.className = 'commandbtn';
	button.setAttribute("oncommand","NicoLiveRequest._stockBottom(event);");
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

    _addRequestFromError:function(video_id){
	let item = NicoLiveHelper.findVideoInfo(video_id);
	if(item==null) return;
	NicoLiveHelper.addRequestQueue(item);
    },
    _addStockFromError:function(video_id){
	let item = NicoLiveHelper.findVideoInfo(video_id);
	if(item==null) return;
	NicoLiveHelper.addStockQueue(item);
    },


    addErrorRequest:function(item){
	let table = $('error-request-table');
	let tr = table.insertRow(table.rows.length);
	tr.className = table.rows.length%2?"table_oddrow":"table_evenrow";
	if(item.selfrequest){
	    tr.className = "color6";  // green
	}else if(item.no_live_play){
	    tr.className = "table_played";
	}else if(item.error){
	    tr.className = "white";
	}else if(item.isplayed){
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
	button.setAttribute("oncommand","NicoLiveRequest._addRequestFromError('"+item.video_id+"');");
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'ストックに追加');
	button.className = 'commandbtn';
	button.setAttribute("oncommand","NicoLiveRequest._addStockFromError('"+item.video_id+"');");
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'削除');
	button.className = 'commandbtn';
	button.setAttribute("oncommand","NicoLiveHelper.removeErrorRequest('"+item.video_id+"');");
	hbox.appendChild(button);

	vbox.appendChild(hbox);
	td.appendChild(vbox);
    },

    setTotalPlayTime:function(t){
	let elem = $("total-playtime");
	elem.value = ""+t.min+"分"+t.sec+"秒/"+NicoLiveHelper.requestqueue.length+"件";
    },
    setTotalStockTime:function(t){
	let elem = $("stock-playtime");
	elem.value = ""+t.min+"分"+t.sec+"秒/"+NicoLiveHelper.stock.length+"件";
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
	if(this.opentab.contentDocument){
	    try{
		let status,loadratio;
		let flv = this.opentab.contentDocument.getElementById('flvplayer').wrappedJSObject.__proto__;
		status = flv.ext_getStatus();
		loadratio = flv.ext_getLoadedRatio();

		if(loadratio>0.1 && this.playlist_first && flv.ext_getPlayheadTime()==0){
		    flv.ext_play(true);
		    if( this._screensize ){
			flv.ext_setVideoSize( NicoLiveRequest._screensize );
		    }
		    //flv.ext_setVideoSize("full");
		    this.playlist_first--;
		    
		    let flvcontainer = this.opentab.contentDocument.getElementById('flvplayer_container').wrappedJSObject;
		    this.opentab.contentWindow.scroll(0,flvcontainer.offsetTop-32);

		    let vid = NicoLiveHelper.stock[this.playlist_start-1].video_id;
		    let t = NicoLiveHelper.stock[this.playlist_start-1].length;
		    debugprint(vid+","+GetTimeString(flv.ext_getTotalTime()));
		}
		//debugprint(status);
		switch(status){
		case "playing":
		    let playprogress = $('statusbar-music-progressmeter');
		    let progress = parseInt(flv.ext_getPlayheadTime()/flv.ext_getTotalTime()*100,10);
		    playprogress.value = progress;
		    $('statusbar-music-name').label = NicoLiveHelper.stock[this.playlist_start-1].title;
		    //debugprint(flv.ext_getVideoSize());
		    this._screensize = flv.ext_getVideoSize();
		    break;

		case "end":
		    if(this.playlist_start>NicoLiveHelper.stock.length){
			// 最初に戻る.
			this.playlist_start = 0;
		    }
		    let nextmusic = NicoLiveHelper.stock[ this.playlist_start ];
		    if(!NicoLiveHelper.isautoplay) break;
		    this.playlist_start++;
		    if(nextmusic){
			this.opentab.contentDocument.wrappedJSObject.location.href = "http://www.nicovideo.jp/watch/"+nextmusic.video_id;
			this.playlist_first = 1;
		    }
		    break;
		}
	    } catch (x) {
//		debugprint(GetCurrentTime()+"/"+x);
	    }
	}else{
	    clearInterval(this.playlist_timer);
	}
    },

    /** ストックに追加する.
     * @param sm 動画IDの文字列(複数可)
     */
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
	    l = sm.match(/(sm|nm|so)\d+|\d{10}/g);
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
    offPlayedStatus:function(node){
	let elem = FindParentElement(node,'vbox');
	let video_id = elem.getAttribute('nicovideo_id');
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
	fp.init(window, LoadString("STR_SAVE_STOCK"), nsIFilePicker.modeSave);
	fp.appendFilters(nsIFilePicker.filterText);
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
	    if( line.value.match(/(sm|nm)\d+|\d{10}/) ){
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
	    let str = "";
	    let tab = event.dataTransfer.mozGetDataAt("application/x-moz-tabbrowser-tab",0);
	    let doc = tab.linkedBrowser.contentDocument;
	    // 検索ページ.
	    let items = evaluateXPath(doc,"//*[@class='uad_thumbfrm' or @class='uad_thumbfrm_1' or @class='uad_thumbfrm_2']/table/tbody/tr/td/p/a/@href");
	    for(let i=0,item; item=items[i]; i++){
		//debugprint(item.textContent);
		str += item.textContent + " ";
	    }
	    // ランキングページ.
	    items = evaluateXPath(doc,"//div/p/a[@class='watch']/@href");
	    for(let i=0,item; item=items[i]; i++){
		//debugprint(item.textContent);
		str += item.textContent + " ";
	    }

	    str += event.dataTransfer.mozGetDataAt("text/x-moz-text-internal",0);
	    this.addStock(str);
	    return;
	}
    },

    /** リクエスト、ストック、プレイリストの詳細表示のマイリス登録メニューから登録.
     * @param mylist_id マイリストID
     * @param mylist_name マイリスト名
     * @param ev eventオブジェクト
     * @param node メニューがポップアップしたノード
     */
    addMylist:function(mylist_id,mylist_name,ev,node){
	let elem = FindParentElement(node,'vbox');
	let video_id = elem.getAttribute('nicovideo_id'); // 動画IDを取れる.
	NicoLiveMylist._addMyList(mylist_id,mylist_name,video_id, ev);
    },

    // リク、ストックタブ用のマイリス追加メニューを作る.
    appendAddMylistMenu:function(mylists){
	// こちらはストックのコンテキストメニューのマイリスト追加メニュー.
	let popupmenu = NicoLiveMylist.createAddMylistMenu(mylists);
	popupmenu.setAttribute("oncommand",
			       "NicoLiveRequest.addMylist(event.target.value,event.target.label,event,document.popupNode||$('popup-sort-stock').triggerNode);");
	$('popup-sort-stock').insertBefore( popupmenu, $('menu-stock-additionalinfo').nextSibling);

	// こっちはリクエストの方.
	popupmenu = NicoLiveMylist.createAddMylistMenu(mylists);
	popupmenu.setAttribute("oncommand",
			       "NicoLiveRequest.addMylist(event.target.value,event.target.label,event,document.popupNode||$('popup-copyrequest').triggerNode);");
	$('popup-copyrequest').insertBefore( popupmenu, $('menu-request-additionalinfo').nextSibling);
    },

    // ストックを再描画.
    // F5を押したときに使用.
    redrawStock:function(){
	debugprint('start:'+ (new Date()).getTime() );
	this.update(NicoLiveHelper.requestqueue);
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
	    tr = $('stock-table').getElementsByTagName('tr');
	}else if( tabindex==0 ){
	    tr = $('request-table').getElementsByTagName('html:tr');
	}else return;

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

    // リク主をコメントリフレクタに登録する.
    addToCommentReflector:function(node){
	try{
	    let tr = FindParentElement(node,'html:tr');
	    let n = tr.getAttribute('request-index');
	    let item = NicoLiveHelper.getRequestItem(n);
	    NicoLiveComment.showCommentReflectorDialog(item.user_id,item.cno);
	} catch (x) {
	    debugprint(x);
	}
    },

    /** 動画の先読みを行う.
     * @param node メニューがポップアップしたノード
     */
    prepare:function(node){
	let elem = FindParentElement(node,'vbox');
	let vid = elem.getAttribute('nicovideo_id');
	NicoLiveHelper.postCasterComment('/prepare '+vid,""); // 動画IDを取れる.
    },

    // 学習を行う.
    doTrain:function(e,node){
	let vbox = FindParentElement(node,'vbox');
	let vid = vbox.getAttribute('nicovideo_id');
	let item = NicoLiveHelper.findVideoInfo(vid);
	if(item==null) return;

	// 半角小文字で正規化して学習させる.
	let str = new Array();
	for(let i=0,tag; tag=item.tags[i];i++){
	    str.push(ZenToHan(tag.toLowerCase()));
	}
	NicoLiveClassifier.train(str,e.target.value);
    },

    // 分類を行う.
    doClassify:function(e,node){
	let vbox = FindParentElement(node,'vbox');
	let vid = vbox.getAttribute('nicovideo_id');
	let item = NicoLiveHelper.findVideoInfo(vid);
	if(item==null) return;

	let str = new Array();
	for(let i=0,tag; tag=item.tags[i];i++){
	    str.push(ZenToHan(tag.toLowerCase()));
	}
	if( item.overseastags ){
	    // 日本タグだと編集されやすく海外タグに重要な情報が書かれている場合もあるので.
	    for(let i=0,tag; tag=item.overseastags[i];i++){
		str.push(ZenToHan(tag.toLowerCase()));
	    }
	}
	AlertPrompt('分類:'+NicoLiveClassifier.classify(str)['class'],"分類チェック");
    },

    init:function(){
	debugprint("NicoLiveRequest.init");
	this.visibleDetail = true;
	this.setTotalPlayTime({min:0,sec:0});
	this.setTotalStockTime({min:0,sec:0});
	this.updateStockView(NicoLiveHelper.stock);
	this.update(NicoLiveHelper.requestqueue);
    }
};

window.addEventListener("load", function() { NicoLiveRequest.init(); }, false);
