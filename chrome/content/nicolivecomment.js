/**
 * コメントウィンドウ
 */
var NicoLiveComment = {

    addRow:function(comment){
	let table = $('comment_table');
	if(!table){ return; }

	// 500行まで.
	if(table.rows.length>=COMMENT_LOG){
	    table.deleteRow(table.rows.length-1);
	}

	//var tr = table.insertRow(table.rows.length);
	let tr = table.insertRow(0);

	if(!this.colormap[comment.user_id]){
	    let sel = GetRandomInt(1,8);
	    let col = 'color'+sel;
	    tr.className = col;
	    this.colormap[comment.user_id] = col;
	}else{
	    tr.className = this.colormap[comment.user_id];
	}

	if(comment.premium==3){
	    tr.className = "table_casterselection";
	}

	let td;
	td = tr.insertCell(tr.cells.length);
	td.textContent = comment.no;

	td = tr.insertCell(tr.cells.length);

	let str;
	if(this.namemap[comment.user_id]){
	    str = this.namemap[comment.user_id].name;
	}else{
	    str = comment.user_id;
	}
	td.innerHTML = "<hbox context=\"popup-comment\"><html:span style=\"display:none;\">"+comment.user_id+"</html:span>"+str+"</hbox>";

	td = tr.insertCell(tr.cells.length);
	// sm,nmにリンクを貼り付け.
	str = comment.text.replace(/<.*?>/g,"");
	str = htmlspecialchars(str);
	str = str.replace(/((sm|nm)\d+)/g,"<html:a onmouseover=\"NicoLiveComment.showThumbnail(event,'$1');\" onmouseout=\"NicoLiveComment.hideThumbnail();\" onclick=\"window.opener.getBrowser().addTab('http://www.nicovideo.jp/watch/$1');\">$1</html:a>");
	td.innerHTML = "<hbox flex=\"1\" context=\"popup-copycomment\">"+str+"</hbox>";

	td = tr.insertCell(tr.cells.length);
	let datestr = GetDateString(comment.date*1000);
	td.textContent = datestr;
    },

    copyComment:function(){
	let elem = FindParentElement(document.popupNode,'hbox');
	CopyToClipboard(elem.textContent);
    },

    showThumbnail:function(event,video_id){
	//debugprint('mouseover:'+event.layerX+','+event.layerY+' video_id:'+video_id);
	$('iframe-thumbnail').src = "http://ext.nicovideo.jp/thumb/"+video_id;
	// なぜか移動できない.
	$('iframe-thumbnail').style.left = event.layerX;
	$('iframe-thumbnail').style.top = event.layerY;
	$('iframe-thumbnail').style.display = 'block';
    },
    hideThumbnail:function(){
	$('iframe-thumbnail').style.display = 'none';
    },

    postComment:function(str){
	if(NicoLiveHelper.iscaster){
	    NicoLiveHelper.postCasterComment(str,$('textbox-mail').value);
	}else{
	    NicoLiveHelper.postListenerComment(str,$('textbox-mail').value);
	}
	$('textbox-comment').value = "";
    },

    addName:function(){
	let userid = document.popupNode.firstChild.textContent;
	let name = InputPrompt("「"+userid+"」のコテハンを指定してください","コテハン入力",this.namemap[userid]?this.namemap[userid].name:userid);
	if(name && name.length){
	    let now = GetCurrentTime();
	    let id;
	    this.namemap[userid] = {"name":name, date:now};
	    for(id in this.namemap){
		if( id>0 ) continue;
		// 1週間経ったものは削除.
		if( now-this.namemap[id].date > 7*24*60*60 ){
		    delete this.namemap[id];
		    debugprint(id+'のコテハン情報は1週間経ったため削除します');
		}
	    }
	    NicoLiveDatabase.saveGPStorage("nico_live_kotehan",this.namemap);
	}
	this.updateCommentViewer();
    },
    updateCommentViewer:function(){
	clearTable($('comment_table'));
	for(let i=0,item;item=this.commentlog[i];i++){
	    this.addRow(item);
	}
    },

    getNGWords:function(){
	// GET /api/configurengword?video=lv4635894&mode=get&video=lv4635894 HTTP/1.1
	// Host: watch.live.nicovideo.jp

	let req = new XMLHttpRequest();
	if( !req ) return;
	req.onreadystatechange = function(){
	    if( req.readyState==4 && req.status==200 ){
		let ngwords = req.responseXML.getElementsByTagName('ngclient');
	    }
	};
	let url = "http://watch.live.nicovideo.jp/api/configurengword?video="+NicoLiveHelper.request_id+"&mode=get";
	req.open('GET', url );
	req.send(null);
    },

    openDialog:function(){
	let str = "";
	for(let i=0,item;item=this.commentlog[i];i++){
	    let datestr = GetDateString(item.date*1000);
	    str += item.no+' '+item.user_id+' '+item.text+' '+datestr+"\n";
	}
	window.openDialog("chrome://nicolivehelper/content/commentdialog.xul","comment","chrome,width=640,height=320,resizable=yes,centerscreen",str).focus();
    },

    push:function(chat){
	if(this.commentlog.length>=COMMENT_LOG){
	    this.commentlog.shift();
	}
	this.commentlog.push(chat);

	// ここでファイルに書く.
	this.writeFile(chat);
    },

    openFile:function(request_id){
	let f = NicoLivePreference.getCommentDir();
	f.append(request_id+'.txt');
	let file;
	let os;

	file = OpenFile(f.path);
	debugprint('open comment log:'+f.path);

	os = Components.classes['@mozilla.org/network/file-output-stream;1'].createInstance(Components.interfaces.nsIFileOutputStream);
	let flags = 0x02|0x10|0x08;// wronly|append|create
	os.init(file,flags,0664,0);

	let cos = Components.classes["@mozilla.org/intl/converter-output-stream;1"].createInstance(Components.interfaces.nsIConverterOutputStream);
	cos.init(os,"UTF-8",0,Components.interfaces.nsIConverterOutputStream.DEFAULT_REPLACEMENT_CHARACTER);

	this.ostream = cos;

	cos.writeString('--- begin log ---\r\n');
    },
    closeFile:function(){
	try{
	    this.ostream.close();
	} catch (x) {
	}
    },

    writeFile:function(item){
	if(this.ostream){
	    let str;
	    let datestr = GetDateString(item.date*1000);
	    str = item.no+'\t'+item.user_id+'\t'+item.text+'\t'+datestr+"\r\n";
	    this.ostream.writeString(str);
	}
    },

    init:function(){
	this.colormap = new Object();
	this.commentlog   = new Array();
	this.namemap = NicoLiveDatabase.loadGPStorage("nico_live_kotehan",{});
    },
    destroy:function(){
	this.closeFile();
    }
};

window.addEventListener("load", function(e){ NicoLiveComment.init(); }, false);
window.addEventListener("unload", function(e){ NicoLiveComment.destroy(); }, false);
