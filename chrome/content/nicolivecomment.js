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
    prev_comment_no: 0,    // 直前のコメ番(NGコメント検出・表示のためのコメ番記録).
    current_comment_no: 0, // 現在のコメ番(単純増加のみで表示リフレッシュがあっても不変).

    addRow:function(comment,disablereflection){
	let table = $('comment_table');
	if(!table){ return; }

	if( this.prev_comment_no!=0 ){
	    while( NicoLivePreference.ngwordfiltering && this.prev_comment_no+1!=comment.no ){
		// コメ番がスキップしていたらそれはNGコメ.
		let tmp = NicoLiveComment.prev_comment_no+1;
		let com = {
		    no: tmp,
		    comment_no: tmp,
		    user_id: "--------",
		    text: "=== NGコメント ===",
		    date: 0,
		    premium: 0,
		    anonimity: 0,
		    mail: "",
		    name: "",
		    isNGWord: 1
		};
		this.addRow(com,disablereflection);

		// リスナーコメだけがNGワードフィルタの対象.
		if( this.current_comment_no <= com.no ){
		    if( NicoLiveHelper.iscaster && NicoLivePreference.ngword_recomment ){
			if( !NicoLiveHelper._timeshift && comment.date>=NicoLiveHelper.connecttime ){
			    let recomment = ">>"+com.no+" NGワードが含まれています";
			    //LoadFormattedString('STR_RECOMMENT_NGWORD',[comment.no, comment.text, ngword]);
			    NicoLiveHelper.postCasterComment(recomment,"");
			}
		    }
		}
	    }
	}
	this.prev_comment_no = comment.no;
	if(this.current_comment_no<comment.no) this.current_comment_no = comment.no;

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
	    this.colormap[comment.user_id] = {"color":col, "date":GetCurrentTime()};
	}else{
	    let col = this.colormap[comment.user_id].color;
	    if( col.indexOf('color')==0 ){
		tr.className = col;
	    }else{
		tr.style.backgroundColor = col;
	    }
	}

	if(comment.premium >= 2){
	    tr.className = "table_casterselection";
	}else{
	    if( comment.isNGWord ){
		tr.className = "table_played";
	    }
	}

	let td;
	td = tr.insertCell(tr.cells.length);
	td.textContent = comment.no;

	td = tr.insertCell(tr.cells.length);

	let str;
	// nameが指定されていればその名前を使用する.
	str = comment.name || this.namemap[comment.user_id] && this.namemap[comment.user_id].name || comment.user_id;

	str = htmlspecialchars(str);
	td.innerHTML = "<hbox class=\"selection\" tooltiptext=\""+(this.namemap[comment.user_id]?comment.user_id:"")+"\" context=\"popup-comment\" user_id=\""+comment.user_id+"\" comment_no=\""+comment.no+"\">"+str+"</hbox>";

	td = tr.insertCell(tr.cells.length);
	if(comment.premium==3){
	    str = comment.text.replace(/<.*?>/g,""); // 主コメだけタグ除去.
	}else{
	    str = comment.text;
	}
	str = htmlspecialchars(str);
	    
	let tmp = str.split(/(sm\d+|nm\d+|\d{10}|&\w+;)/);
	for(let i=0;i<tmp.length;i++){
	    if( !tmp[i].match(/(sm\d+|nm\d+|\d{10}|&\w+;)/) ){
		tmp[i] = tmp[i].replace(/(.{35,}?)/g,"$1<html:wbr/>");
	    }
	}
	str = tmp.join("");
	str = str.replace(/(\r\n|\r|\n)/gm,"<html:br/>");

	// sm,nmにリンクを貼り付け.
	str = str.replace(/((sm|nm)\d+)/g,"<hbox class=\"selection\" context=\"popup-comment-anchor\"><html:a onmouseover=\"NicoLiveComment.showThumbnail(event,'$1');\" onmouseout=\"NicoLiveComment.hideThumbnail();\" onclick=\"window.opener.getBrowser().addTab('http://www.nicovideo.jp/watch/$1');\">$1</html:a></hbox>");
	if( comment.premium!=3 ){
	    // 数字10桁にもリンク.
	    if( !str.match(/(sm|nm)\d+/) ){
		str = str.replace(/(\d{10})/g,"<html:a onmouseover=\"NicoLiveComment.showThumbnail(event,'$1');\" onmouseout=\"NicoLiveComment.hideThumbnail();\" onclick=\"window.opener.getBrowser().addTab('http://www.nicovideo.jp/watch/$1');\">$1</html:a>");
	    }
	}
	try{
	    td.innerHTML = "<hbox flex=\"1\" class=\"selection\" context=\"popup-copycomment\">"+str+"</hbox>";
	} catch (x) {
	    debugprint(x);
	    debugprint(str);
	}

	td = tr.insertCell(tr.cells.length);
	let datestr = GetDateString(comment.date*1000);
	td.textContent = datestr;

	if(comment.premium<2 && !disablereflection){
	    this.reflection(comment);
	}
    },

    // コメントリフレクションを行う.
    reflection:function(comment){
	if( !NicoLiveHelper.iscaster ) return;
	let name,disptype;
	if(this.reflector[comment.user_id]){
	    name = this.reflector[comment.user_id].name;
	    disptype = this.reflector[comment.user_id].disptype;
	}else{
	    return;
	}
	let str;
	switch(disptype){
	case 0:
	    str = LoadFormattedString('STR_NAME_POSTFIX',[name])+":<br>"+comment.text;
	    name = null;
	    break;
	case 1:// 運営コメ欄左上に名前.
	    //str = '　' + comment.text + '　';
	    str = '\u200b' + comment.text;
	    name = LoadFormattedString('STR_NAME_POSTFIX',[name]);
	    break;
	case 2:
	    // BSP
	    str = "/press show green \""+comment.text+"\" \""+name+"さん\"";
	    name = null;
	    break;
	}
	str = str.replace(/{=/g,'{-');
	if( disptype==2 ){
	    // BSPコメ
	    NicoLiveHelper.postCasterComment(str,"",name);
	}else{
	    let func = function(){
		NicoLiveHelper.postCasterComment(str,"",name,COMMENT_MSG_TYPE_NORMAL);
	    };
	    NicoLiveHelper.clearCasterCommentAndRun(func);
	}
    },

    /** コメントをコピーする.
     * @param node メニューがポップアップしたノード
     */
    copyComment:function(node){
	let elem = FindParentElement(node,'hbox');
	let str = window.getSelection().toString() || elem.textContent;
	CopyToClipboard(str);
    },

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

	let mail = $('textbox-mail').value;

	if(NicoLiveHelper.iscaster){
	    if( str.match(/^((sm|nm)\d+|\d{10})$/) ){
		//debugprint(str+'を手動再生しようとしています');
		NicoLiveHelper._comment_video_id = str;
		NicoLiveHelper.postCasterComment(str,mail,"",COMMENT_MSG_TYPE_NORMAL);
	    }else{
		if( $('overwrite-hidden-perm').checked ){
		    if( str.indexOf('/')==0 ){
			// コマンドだった場合/clsを送らない.
			NicoLiveHelper.postCasterComment(str,mail,"",COMMENT_MSG_TYPE_NORMAL);
		    }else{
			// 直前のコメがhidden+/permで、上コメ表示にチェックがされていたら、/clsを送ってから.
			let func = function(){
			    NicoLiveHelper.postCasterComment(str,mail,"",COMMENT_MSG_TYPE_NORMAL);
			};
			NicoLiveHelper.clearCasterCommentAndRun(func);
		    }
		}else{
		    NicoLiveHelper.postCasterComment(str,mail,"",COMMENT_MSG_TYPE_NORMAL);
		}
	    }
	}else{
	    NicoLiveHelper.postListenerComment(str,mail);
	}
	$('textbox-comment').value = "";
	return true;
    },

    addNGUser:function(userid){
	if( !NicoLiveHelper.iscaster ) return;
	if( !userid ) return;

	let req = new XMLHttpRequest();
	if(!req) return;
	req.onreadystatechange = function(){
	    if( req.readyState==4 && req.status==200 ){

	    }
	};
	let url = "http://watch.live.nicovideo.jp/api/configurengword?video="+NicoLiveHelper.request_id+"&mode=add&source="+userid+"&type=ID&use_case_unify=false";
	req.open('GET', url );
	req.send(null);
    },
    delNGUser:function(userid){
	if( !NicoLiveHelper.iscaster ) return;
	if( !userid ) return;

	let req = new XMLHttpRequest();
	if(!req) return;
	req.onreadystatechange = function(){
	    if( req.readyState==4 && req.status==200 ){

	    }
	};
	let url = "http://watch.live.nicovideo.jp/api/configurengword?video="+NicoLiveHelper.request_id+"&mode=delete&source="+userid+"&type=ID";
	req.open('GET', url );
	req.send(null);
    },

    // コメントリフレクタから削除する.
    removeFromCommentReflector:function(userid,name){
	NicoLiveComment.delNGUser(userid);
	let user = evaluateXPath(document,"//*[@comment-reflector='"+userid+"']");
	delete NicoLiveComment.reflector[userid];
	RemoveElement(user[0]);
	ShowNotice( LoadFormattedString('STR_OK_RELEASE_REFLECTION',[name,userid]) );

	// %Sさん　運営コメント:OFF
	let str = LoadFormattedString("STR_TURN_OFF_REFLECTION",[name]);
	NicoLiveHelper.postCasterComment(str,"");
    },

    addCommentReflectorCore:function(userid,name,disptype,addnguser){
	if(name && name.length){
	    let user = evaluateXPath(document,"//*[@comment-reflector='"+userid+"']");
	    this.reflector[userid] = {"name":name, "disptype":disptype };
	    if(user.length==0){
		// ここからリフレクション解除メニューの追加.
		let menuitem = CreateMenuItem( LoadFormattedString('STR_MENU_RELEASE_REFLECTION',[name]), userid);
		menuitem.setAttribute("comment-reflector",userid);
		menuitem.setAttribute("comment-name",name);
		menuitem.setAttribute("tooltiptext","ID="+userid);
		menuitem.setAttribute("oncommand","NicoLiveComment.removeFromCommentReflector('"+userid+"','"+name+"');");
		$('popup-comment').insertBefore(menuitem,$('id-release-reflection'));
		// ここまで
	    }else{
		user[0].setAttribute('label',LoadFormattedString('STR_MENU_RELEASE_REFLECTION',[name]));
	    }
	    ShowNotice( LoadFormattedString('STR_OK_REGISTER_REFRECTION',[userid,name]) );
	    if( addnguser ){
		debugprint(userid+'をNGユーザに追加します');
		//this.addNGUser(userid);
	    }
	    return true;
	}
	return false;
    },

    // リフレクション登録ダイアログを表示して設定する.
    showCommentReflectorDialog:function(userid, comment_no){
	if( !userid ) return;
	let param = {
	    "info": LoadFormattedString("STR_TEXT_REGISTER_REFLECTION",[userid]),
	    "default": "★",
	    "disptype": 0
	};
	let f = "chrome,dialog,centerscreen,modal";
	if(NicoLivePreference.topmost){ f += ',alwaysRaised=yes'; }
	if( this.reflector[userid] ){
	    param['default'] = this.reflector[userid].name;
	}
	window.openDialog("chrome://nicolivehelper/content/commentdialog.xul","reflector",f,param);
	let name = param['default'];
	let disptype = param['disptype'];

	if(this.addCommentReflectorCore(userid,name,disptype, param.addnguser )){
	    // >>%S %Sさん　運営コメント:ON
	    let str;
	    if( !comment_no ) comment_no = "";
	    if( disptype==2 ){
		// BSP
		str = LoadFormattedString("STR_TURN_ON_REFLECTION_BSP",[comment_no, name]);
	    }else{
		str = LoadFormattedString("STR_TURN_ON_REFLECTION",[comment_no, name]);
	    }
	    NicoLiveHelper.postCasterComment(str,"");
	}
    },

    /** コメントリフレクション登録.
     * @param node メニューがポップアップしたノード
     */
    addCommentReflector:function(node){
	let userid = node.getAttribute('user_id');
	let comment_no = node.getAttribute('comment_no');
	this.showCommentReflectorDialog(userid, comment_no);
    },
    addReflectionFromCommentNo:function(comment_no){
	if(comment_no<=0) return;
	for(let i=0;i<this.commentlog.length;i++){
	    if( this.commentlog[i].no == comment_no ){
		this.showCommentReflectorDialog( this.commentlog[i].user_id, comment_no);
	    }
	}
    },

    releaseReflector:function(){
	// コメント反射を全解放.
	let cnt=0;
	for (u in this.reflector){
	    // %Sさん　運営コメント:OFF
	    let name = this.reflector[u].name;
	    let str = LoadFormattedString("STR_TURN_OFF_REFLECTION",[name]);
	    this.delNGUser(u);
	    NicoLiveHelper.postCasterComment(str,"");
	    cnt++;
	}
	this.reflector = new Object();
	try{
	    if(cnt) ShowNotice( LoadString('STR_OK_ALL_RELEASE_REFLECTION') );
	    let users = evaluateXPath(document,"//*[@comment-reflector]");
	    for(let i=0,user;user=users[i];i++){
		RemoveElement(user);
	    }
	} catch (x) {
	}
    },

    clearColorSetting:function(node){
	let userid = node.getAttribute('user_id');
	delete this.colormap[userid];
	this.updateCommentViewer();
    },

    changeColor:function(node){
	let userid = node.getAttribute('user_id');
	let color = $('comment-color').color;
	if( !color ) return;
	let now = GetCurrentTime();
	this.colormap[userid] = {"color":color,"date":now};
	for(id in this.colormap){
	    if( id>0 ) continue;
	    // 1週間経ったものは削除.
	    if( now-this.colormap[id].date > 7*24*60*60 ){
		delete this.colormap[id];
	    }
	}
	this.updateCommentViewer();
    },

    addKotehanDatabase:function(userid,name){
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
	}else if(name!=null){
	    delete this.namemap[userid];
	    NicoLiveDatabase.saveGPStorage("nico_live_kotehan",this.namemap);
	}
    },

    /** プロフィールページを開く.
     * @param node メニューがポップアップしたノード
     */
    openProfile:function(node){
	let userid = node.getAttribute('user_id');
	if(userid>0){
	    window.opener.getBrowser().addTab('http://www.nicovideo.jp/user/'+userid);
	}
    },

    addNameFromId:function(userid){
	if( !userid ) return;

	let name = InputPrompt( LoadFormattedString('STR_TEXT_SET_KOTEHAN',[userid]),
				LoadString('STR_CAPTION_SET_KOTEHAN'), this.namemap[userid]?this.namemap[userid].name:userid);

	this.addKotehanDatabase(userid,name);
	this.updateCommentViewer();
	this.createNameList();
    },

    /** コテハン登録.
     * @param node メニューがポップアップしたノード.
     */
    addName:function(node){
	let userid = node.getAttribute('user_id');
	this.addNameFromId(userid);
    },

    // 選択行のコテハン設定を削除.
    deleteKotehanFromListbox:function(){
	let n = $('kotehan-list').selectedIndex;
	if(n>=0){
	    let userid = $('kotehan-list').selectedItem.firstChild.value;
	    $('kotehan-list').removeItemAt(n);
	    delete this.namemap[userid];
	    NicoLiveDatabase.saveGPStorage("nico_live_kotehan",this.namemap);
	    this.updateCommentViewer();
	}
    },

    pressKeyOnNameList:function(e){
	if( e && e.keyCode==46 ){
	    // 46 は DELキー(Winで確認)
	    this.deleteKotehanFromListbox();
	}
    },

    createNameList:function(){
	let list = $('kotehan-list');
	while( list.getRowCount() ){
	    list.removeItemAt(0);
	}

	for (kotehan in this.namemap){
	    let elem = CreateElement('listitem');
	    elem.appendChild( CreateLabel(kotehan) );
	    elem.appendChild( CreateLabel(this.namemap[kotehan].name) );
	    list.appendChild(elem);
	}
    },

    updateCommentViewer:function(){
	clearTable($('comment_table'));
	this.prev_comment_no = 0;
	for(let i=0,item;item=this.commentlog[i];i++){
	    this.addRow(item,true);
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
	//this._tmpxml = xml;
	this.regexstrings = evaluateXPath(xml,"//ngclient[type='word' and @is_regex='true']/source");
	this.caseinsensitivestrings = evaluateXPath(xml,"//ngclient[type='word' and (not(@is_regex='true') and @use_case_unify='true')]/source");
	this.casesensitivestrings = evaluateXPath(xml,"//ngclient[type='word' and (not(@is_regex='true') and not(@use_case_unify='true'))]/source");

	let i,item;
	for(i=0;item=this.casesensitivestrings[i];i++){
	    this.casesensitivestrings[i] = item.textContent.replace(/\s+/g,'');
	}
	for(i=0;item=this.caseinsensitivestrings[i];i++){
	    this.caseinsensitivestrings[i] = HiraToKana(item.textContent).replace(/\s+/g,'');
	}
	for(i=0;item=this.regexstrings[i];i++){
	    this.regexstrings[i] = item.textContent.replace(/\s+/g,'');;
	}
    },

    // 引っかかったNGワードを返す.
    // 問題ないときはundefinedを返す.
    isNGWord:function(str){
	let i,item;
	let normalizedstr;
	// case-sensitiveなのでindexOfでOK
	for(i=0;item=this.casesensitivestrings[i];i++){
	    if( str.indexOf(item) != -1 ){
		return item;
	    }
	}

	// NGワードに()が含まれているとRegExpのコンパイルで例外発生.

	// case-insensitiveなので大文字小文字、ひらがなカタカナを区別しない.
	normalizedstr = HiraToKana(str);
	normalizedstr = ZenToHan(normalizedstr);
	normalizedstr = HanToZenKana(normalizedstr);
	for(i=0;item=this.caseinsensitivestrings[i];i++){
	    try{
		let regex = new RegExp(item,"i");
		if(normalizedstr.match(regex)){
		    return item;
		}
	    } catch (x) {
		debugprint(x+'/'+item);
	    }
	}
	// 正規表現.
	for(i=0;item=this.regexstrings[i];i++){
	    try{
		let regex = new RegExp(item);
		if(str.match(regex)){
		    return item;
		}
	    } catch (x) {
		debugprint(x+'/'+item);
	    }
	}
	return undefined;
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
	this.closeFile();

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

    // ログファイルに任意の文字列を書き込む.
    writeMessageLog:function(str){
	if(this.ostream){
	    this.ostream.writeString(str+"\r\n");
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

    initView:function(){
	// ウィンドウ使いまわしで接続するときの初期化.
	this.commentlog = new Array();
	this.prev_comment_no = 0;
	this.current_comment_no = 0;
	clearTable($('comment_table'));
    },

    /** コメント内の動画へのリンクでのポップアップメニュー処理.
     * @param node メニューがポップアップしたノード.
     */
    setSelfRequest:function(node){
	let video_id = node.textContent;
	NicoLiveHelper.setSelfRequestFlag(video_id);
    },
    moveRequestToTop:function(node){
	let video_id = node.textContent;
	NicoLiveHelper.topToRequestById(video_id);
    },

    /** ID欄でのポップアップメニューの表示処理.
     * @param node ポップアップしたノード.
     */
    showPopupMenuForID:function(node){
	let userid = node.getAttribute('user_id');
	let commentno = node.getAttribute('comment_no');
	$('popup-comment-displayuserid').value = "No."+commentno+"/" + userid;
	if(userid>0){
	    $('popup-comment-openprofile').hidden = false;
	}else{
	    $('popup-comment-openprofile').hidden = true;
	}
    },

    // コメント用ポップアップメニュー表示処理.
    showPopupMenuForComment:function(){
	let str = window.getSelection().toString();
	if( str.match(/...[-+=/]....[-+=/]./) ){
	    $('comment-search-jasrac').hidden = false;
	    $('comment-search-elicense').hidden = true;
	}else if( str.match(/\d{5}/) ){
	    $('comment-search-jasrac').hidden = true;
	    $('comment-search-elicense').hidden = false;
	}else{
	    $('comment-search-jasrac').hidden = true;
	    $('comment-search-elicense').hidden = true;
	}
    },

    init:function(){
	// コメントリフレクターの登録用.
	this.reflector = new Object();

	// NGコメント.
	this.regexstrings = new Array();
	this.caseinsensitivestrings = new Array();
	this.casesensitivestrings = new Array();

	this.commentlog   = new Array();
	this.colormap = NicoLiveDatabase.loadGPStorage("nico_live_colormap",{});
	this.namemap = NicoLiveDatabase.loadGPStorage("nico_live_kotehan",{});
	this.autocomplete = NicoLiveDatabase.loadGPStorage("nico_live_autocomplete",[]);
	this.loadPresetAutocomplete();

	this.createNameList();

	$('popup-comment').addEventListener('popupshowing',
					    function(event){
						NicoLiveComment.showPopupMenuForID(document.popupNode||$('popup-comment').triggerNode);
					    }, false);
    },
    destroy:function(){
	this.closeFile();
	for (a in this.colormap){
	    if( this.colormap[a].color.indexOf('color')==0 ){
		delete this.colormap[a];
	    }
	}
	NicoLiveDatabase.saveGPStorage("nico_live_colormap",this.colormap);
	NicoLiveDatabase.saveGPStorage("nico_live_autocomplete",this.autocomplete);

	this.releaseReflector(); // 一応呼んでおく.
    }
};

window.addEventListener("load", function(e){ NicoLiveComment.init(); }, false);
window.addEventListener("unload", function(e){ NicoLiveComment.destroy(); }, false);
