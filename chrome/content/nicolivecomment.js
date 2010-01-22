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
	}else{
	    if( NicoLivePreference.ngwordfiltering && this.isNGWord(comment.text) ){
		tr.className = "table_played";
	    }	    
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
	if(comment.premium==3){
	    str = comment.text.replace(/<.*?>/g,""); // 主コメだけタグ除去.
	}else{
	    str = comment.text;
	}
	str = htmlspecialchars(str);

	// sm,nmにリンクを貼り付け.
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

    postComment:function(textbox,event){
	let str = textbox.value;
	if(event && event.keyCode != 13) return true;

	textbox.controller.searchString = "";

	// update autocomplete
	let tmp = {value:str,comment:""};
	for(let i=0,item;item=this.autocomplete[i];i++){
	    if(item.value==str){
		this.autocomplete.splice(i,1);
	    }
	}
	this.autocomplete.unshift(tmp);
	if(this.autocomplete.length>10){
	    this.autocomplete.pop();
	}

	let concat_autocomplete = this.preset_autocomplete.concat( this.autocomplete );
	textbox.setAttribute("autocompletesearchparam",JSON.stringify(concat_autocomplete));

	if(NicoLiveHelper.iscaster){
	    NicoLiveHelper.postCasterComment(str,$('textbox-mail').value);
	}else{
	    NicoLiveHelper.postListenerComment(str,$('textbox-mail').value);
	}
	$('textbox-comment').value = "";
	return true;
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
		NicoLiveComment.parseNGWordXML(req.responseXML);
	    }
	};
	let url = "http://watch.live.nicovideo.jp/api/configurengword?video="+NicoLiveHelper.request_id+"&mode=get";
	req.open('GET', url );
	req.send(null);
    },
    parseNGWordXML:function(xml){
	this.regexstrings = evaluateXPath(xml,"//ngclient[@is_regex='true']/source");
	this.caseinsensitivestrings = evaluateXPath(xml,"//ngclient[not(@is_regex='true') and @use_case_unify='true']/source");
	this.casesensitivestrings = evaluateXPath(xml,"//ngclient[not(@is_regex='true') and not(@use_case_unify='true')]/source");

	let i,item;
	for(i=0;item=this.casesensitivestrings[i];i++){
	    this.casesensitivestrings[i] = item.textContent;
	}
	for(i=0;item=this.caseinsensitivestrings[i];i++){
	    this.caseinsensitivestrings[i] = HiraToKana(item.textContent);
	}
	for(i=0;item=this.regexstrings[i];i++){
	    this.regexstrings[i] = item.textContent;
	}
    },
    isNGWord:function(str){
	let i,item;
	let normalizedstr;
	// case-sensitiveなのでindexOfでOK
	for(i=0;item=this.casesensitivestrings[i];i++){
	    if( str.indexOf(item) != -1 ){
		return true;
	    }
	}

	// case-insensitiveなので大文字小文字、ひらがなカタカナを区別しない.
	normalizedstr = HiraToKana(str);
	normalizedstr = ZenToHan(normalizedstr);
	for(i=0;item=this.caseinsensitivestrings[i];i++){
	    let regex = new RegExp(item,"i");
	    if(normalizedstr.match(regex)){
		return true;
	    }
	}
	// 正規表現.
	for(i=0;item=this.regexstrings[i];i++){
	    let regex = new RegExp(item);
	    if(str.match(regex)){
		return true;
	    }
	}
	return false;
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
	if(!f) return;
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

	cos.writeString('--- '+NicoLiveHelper.title+' ---\r\n');
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

    loadPresetAutocomplete:function(){
	let prefs = NicoLivePreference.getBranch();
	let str;
	try{
	    str = prefs.getUnicharPref("preset-autocomplete");	
	} catch (x) {
	    str = "";
	}
	let list = str.split(/\n|\r|\r\n/);
	this.preset_autocomplete = new Array();
	while(list.length){
	    let tmp = {};
	    let line = list.shift();
	    let data = line.split(",");
	    if(line.length){
		tmp.value = data[0];
		tmp.comment = data[1];
		this.preset_autocomplete.push(tmp);
	    }
	}
	let concat_autocomplete = this.preset_autocomplete.concat( this.autocomplete );
	$('textbox-comment').setAttribute("autocompletesearchparam",JSON.stringify(concat_autocomplete));
    },

    init:function(){
	this.regexstrings = new Array();
	this.caseinsensitivestrings = new Array();
	this.casesensitivestrings = new Array();

	this.colormap = new Object();
	this.commentlog   = new Array();
	this.namemap = NicoLiveDatabase.loadGPStorage("nico_live_kotehan",{});
	this.autocomplete = NicoLiveDatabase.loadGPStorage("nico_live_autocomplete",[]);
	this.loadPresetAutocomplete();
    },
    destroy:function(){
	this.closeFile();
	NicoLiveDatabase.saveGPStorage("nico_live_autocomplete",this.autocomplete);
    }
};

window.addEventListener("load", function(e){ NicoLiveComment.init(); }, false);
window.addEventListener("unload", function(e){ NicoLiveComment.destroy(); }, false);
