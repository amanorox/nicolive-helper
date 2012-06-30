/*
Copyright (c) 2012 amano <amano@miku39.jp>

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
 * リクエストタブの処理
 */

var NicoLiveRequest = {
    _summation_time: 0,    // リクエストの累積時間

    showThumbnail:function(event,video_id){
	$('iframe-thumbnail').src = "http://ext.nicovideo.jp/thumb/"+video_id;
	let x,y;
	// 312x176
	x = event.clientX;
	y = event.clientY;
	if( y+176 > window.innerHeight ){
	    y = y - 176 - 10;
	}
	if( x+312 > window.innerWidth ){
	    x = x - 312 - 10;
	}
	$('iframe-thumbnail').style.left = x + 5 + "px";
	$('iframe-thumbnail').style.top = y + 5 + "px";
	$('iframe-thumbnail').style.display = 'block';
	$('iframe-thumbnail').width = 312;
	$('iframe-thumbnail').height = 176;
	$('iframe-thumbnail').style.opacity = 1;
    },
    hideThumbnail:function(){
//	$('iframe-thumbnail').style.display = 'none';
	$('iframe-thumbnail').width = 312;
	$('iframe-thumbnail').height = 0;
	$('iframe-thumbnail').style.opacity = 0;
    },

    setTotalRequestTime:function(){
	let elem = $('request-playtime');
	let t = NicoLiveHelper.getRequestTime();
	elem.value = ""+t.min+"分"+t.sec+"秒/"+NicoLiveHelper.request.length+"件";
    },

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
	a.setAttribute("onclick","NicoLiveWindow.openDefaultBrowser('http://www.nicovideo.jp/watch/"+item.video_id+"');");

	let img = CreateHTMLElement('img');
	img.src = item.thumbnail_url;
	img.style.cssFloat = 'left';
	img.style.marginRight = '0.5em';
	img.className = "video-thumbnail";

	a.setAttribute("onmouseover","NicoLiveRequest.showThumbnail(event,'"+item.video_id+"');");
	a.setAttribute("onmouseout","NicoLiveRequest.hideThumbnail();");
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

	/*
	let mylist = NicoLiveMylist.isVideoExists(item.video_id);
	if(mylist){
	    text = document.createTextNode(' マ:'+mylist);
	    div.appendChild(text);
	}
	 */

	div.appendChild(CreateHTMLElement('br'));

	let datestr = GetDateString(item.first_retrieve*1000);
	div.appendChild(document.createTextNode("投稿日:" + datestr +" "
		+ "再生数:"+FormatCommas(item.view_counter)+" コメント:"+FormatCommas(item.comment_num)
		+ " マイリスト:"+FormatCommas(item.mylist_counter)+" 時間:"+item.length+(NicoLiveHelper.userdefinedvalue[item.video_id]?" 彡:"+NicoLiveHelper.userdefinedvalue[item.video_id]:'')));

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
	// innerHTMLで楽できないのでひたすらDOM操作.
	str = item.description.split(/(mylist\/\d+|sm\d+|nm\d+)/);
	for(i=0;i<str.length;i++){
	    let s = str[i];
	    if( s.match(/mylist\/\d+/) ){
		let a = CreateHTMLElement('a');
		let mylist = s;
		a.setAttribute("onclick","NicoLiveWindow.openDefaultBrowser('http://www.nicovideo.jp/"+mylist+"');");
		a.appendChild(document.createTextNode(s));
		div2.appendChild(a);
	    }else if( s.match(/(sm|nm)\d+/) ){
		let a = CreateHTMLElement('a');
		let vid = s;
		a.setAttribute("onclick","NicoLiveWindow.openDefaultBrowser('http://www.nicovideo.jp/watch/"+vid+"');");
		a.setAttribute("onmouseover","NicoLiveRequest.showThumbnail(event,'"+vid+"');");
		a.setAttribute("onmouseout","NicoLiveRequest.hideThumbnail();");
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
	label.appendChild(document.createTextNode('タグ:'+item.tags.join(',')+" "));
	let tiptext = "";
	for(domain in item.overseastags2){
	    label.appendChild( document.createTextNode("["+domain+"]") );
	    tiptext += "["+domain+"]:"+item.overseastags2[domain].join(',');
	    tiptext += "\n";
	}
	label.setAttribute("tooltiptext",tiptext);
	vbox.appendChild(label);
	return vbox;
    },

    // 指定のvboxに動画情報のvboxを追加する.
    addVideoInformation:function(vbox_parent, item, isstock){
	let vbox = this.createVideoInformation(item, isstock);
	vbox_parent.appendChild(vbox);
    },

    // リクエストテーブルにitemオブジェクトを追加.
    addRow:function(item){
	let table = $('request-table');
	let tr = table.insertRow(table.rows.length);
	tr.className = table.rows.length%2?"table_oddrow":"table_evenrow";
	if(item.iscasterselection){
	    tr.className = "table_casterselection";
	}

	if(item.selfrequest){
	    // green
	    tr.className = "table_selfreq";
	}
	let td;
	td = tr.insertCell(tr.cells.length);
	td.appendChild(document.createTextNode("#"+table.rows.length));
	if(item.cno){
	    td.appendChild(CreateHTMLElement('br'));
	    td.appendChild(document.createTextNode("C#"+item.cno));

	}
	let t;
	t = GetTimeString(this._summation_time);
	td.appendChild(CreateHTMLElement('br'));
	td.appendChild(document.createTextNode("+"+t));
	this._summation_time += NicoLivePreference.nextplay_interval + item.length_ms/1000;

	let n = table.rows.length;
	tr.setAttribute("request-index",n); // 1,2,3,...

	td = tr.insertCell(tr.cells.length);

	let vbox = CreateElement('vbox');
	vbox.setAttribute('class','vinfo');
	vbox.setAttribute('context','popup-copyrequest');

	if( NicoLiveHelper.co154playlog["_"+item.video_id] ){
	    let t = NicoLiveHelper.co154playlog["_"+item.video_id];
	    tr.className ="table_recently_play";
	    let txt = document.createTextNode("※この動画は"+GetDateString(t*1000)+"に再生されています。");
	    vbox.appendChild( txt );
	}

	this.addVideoInformation(vbox,item);

	let hbox = CreateElement('hbox');
	hbox.setAttribute("align","center");
	hbox.setAttribute("class","btn_command");
	let button = CreateElement('button');
	button.setAttribute("label",'再生');
	button.className = 'commandbtn';
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'削除');
	button.className = 'commandbtn';
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'↑↑');
	button.className = 'commandbtn';
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'↑');
	button.className = 'commandbtn';
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'↓');
	button.className = 'commandbtn';
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'↓↓');
	button.className = 'commandbtn';
	hbox.appendChild(button);

	if( item.product_code ){
	    let text = CreateElement('label');
	    text.appendChild( document.createTextNode("作品コード:"+item.product_code) );
	    hbox.appendChild( text );
	}

	vbox.appendChild(hbox);
	td.appendChild(vbox);
    },

    refreshRequest: function( requestqueue ){
	this._summation_time = 0;

	let table = $('request-table');
	if(!table){ return; }

	clearTable(table);
	for(let i=0,item;item=requestqueue[i];i++){
	    this.addRow(item);
	}
	this.setTotalRequestTime();
    },

    addRequest: function( sm ){
	if(sm.length<3) return;
	let l = sm.match(/(sm|nm)\d+|\d{10}/g);
	for(let i=0,id;id=l[i];i++){
	    NicoLiveHelper.addRequest( id, 0, "-" );
	}
	$('input-request').value="";
    },

    init: function(){
    }
};

window.addEventListener("load", function() { NicoLiveRequest.init(); }, false);
