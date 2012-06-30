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

var NicoLiveHistory = {

    // プレイリストにアイテムを追加.
    addPlayList:function(item){
	let table = $('playlist-table');
	if(!table) return;

	let tr = table.insertRow(table.rows.length);
	tr.className="table_played";
	let td = tr.insertCell(tr.cells.length);
	td.appendChild(document.createTextNode("#"+table.rows.length));

	td = tr.insertCell(tr.cells.length);
	let vbox = CreateElement('vbox');

	NicoLiveRequest.addVideoInformation(vbox,item);

	let hbox = CreateElement('hbox');
	let button = CreateElement('button');
	button.setAttribute("label",'リクエストに追加');
	button.className = 'commandbtn';
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute("label",'ストックに追加');
	button.className = 'commandbtn';
	hbox.appendChild(button);

	button = CreateElement('button');
	button.setAttribute('label','再生');
	button.className = 'commandbtn';
	hbox.appendChild(button);
	vbox.appendChild(hbox);
	td.appendChild(vbox);
    },

    // 再生履歴の更新.
    refreshPlayHistory:function(array){
	let table = $('playlist-table');
	if(!table){ return; }

	clearTable(table);
	for(let i=0,item;item=array[i];i++){
	    this.addPlayList(item);
	}
    },

    /** プレイリストのテキストから範囲選択して指定した動画のマイリス登録.
     */
    addMylist:function(mylist_id,mylist_name,ev){
	let notes = $('played-list-textbox');
	let substring;
	substring = notes.value.substr(notes.selectionStart,notes.selectionEnd-notes.selectionStart);

	if(substring.length>=3){
	    NicoLiveMylist.addMyList1(mylist_id,mylist_name,substring, ev);
	}
    },

    // 詳細表示の内容でテキストを復元する.
    restorePlaylistText:function(){
	$('played-list-textbox').value = "";
	for(let i=0,item;item=NicoLiveHelper.playlist[i];i++){
	    $('played-list-textbox').value += item.video_id + " " + item.title + "\n";
	}
    },

    handleEvent:function(event){
	if(event.type=='popupshowing'){
	    // テキスト表示のとき範囲選択されていればマイリストに追加を表示する.
	    let hidden = true;
	    let notes = $('played-list-textbox');
	    let n = notes.selectionEnd-notes.selectionStart;
	    if(n>0){
		hidden = false;
	    }
	    $('addto-mylist-from-history').hidden = hidden;
	}
    },

    init:function(){
    }
};

window.addEventListener("load", function(e){ NicoLiveHistory.init(); }, false);
