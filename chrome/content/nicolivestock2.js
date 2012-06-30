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
 * ストックタブ
 */

var NicoLiveStock = {
    setTotalStockTime:function(t){
	let elem = $("stock-playtime");
	let t = NicoLiveHelper.getStockTime();
	elem.value = ""+t.min+"分"+t.sec+"秒/"+NicoLiveHelper.stock.length+"件";
    },

    refreshStock: function( requestqueue ){
	this._summation_time = 0;

	let table = $('stock-table');
	if(!table){ return; }

	clearTable(table);
	for(let i=0,item;item=requestqueue[i];i++){
	    this.addRow(item);
	}
	this.setTotalStockTime();
    },

    // ストックテーブルの行の中身を作成する.
    // tr : 行
    // n : n行目(1,2,...n)
    // item : 動画情報.
    createRow:function(tr,n,item){
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
	vbox.setAttribute('class','vinfo');

	NicoLiveRequest.addVideoInformation(vbox,item,true);

	// コマンドボタンに作用するストックのインデックスはtrの属性から取ることにしよう.
	let hbox = CreateElement('hbox');
	hbox.setAttribute("class","btn_command");
	let button = CreateElement('button');
	button.setAttribute('label','リクエスト');
	button.className = 'commandbtn';
	hbox.appendChild(button);

	button = CreateElement('button');
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

	vbox.appendChild(hbox);
	td.appendChild(vbox);
    },

    addRow: function(item){
	let table = $('stock-table');
	let tr = table.insertRow(table.rows.length);
	let n = table.rows.length;
	this.createRow(tr,n,item);
    },

    addStock: function( sm ){
	if(sm.length<3) return;
	let l = sm.match(/(sm|nm)\d+|\d{10}/g);
	for(let i=0,id;id=l[i];i++){
	    NicoLiveHelper.addStock( id, 0, "-" );
	}
	$('input-stock').value="";
    },

    init: function(){
    }
};

//window.addEventListener("load", function() { NicoLiveStock.init(); }, false);
