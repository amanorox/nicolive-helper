var DirLists = new Array();
var interval_id;

function SendContinuousComment(){
    let interval = document.getElementById('menu-interval').value;
    if( interval==0 ){
	SendOneLine();
    }else{
	SendOneLine();
	ChangeInterval( interval );
    }
}

function ChangeInterval(value){
    clearInterval(interval_id);
    if( value!=0 ){
	interval_id = setInterval( SendOneLine, value*1000 );
    }
}

function SendOneLine()
{
    var str;
    str = document.getElementById('multiline-comment').value.split(/\n|\r|\r\n/);
    if(str.length){
	let cmd = document.getElementById('multiline-command').value;
	let comment = str[0];
	if( !document.getElementById('using-bsp').checked ){
	    comment = comment.replace(/\\([\\n])/g,function(s,p){switch(p){case "n": return "\n"; case "\\": return "\\"; default: return s;}});
	    if( comment.indexOf("/")==0 ){
		let tmp = comment.split("/");
		cmd += " " + tmp[1];
		tmp.splice(0,2);
		comment = tmp.join("/");
	    }
	    //Application.console.log("cmd:"+cmd);
	    //Application.console.log("comment:"+comment);
	    opener.NicoLiveHelper.postCommentMain(comment,cmd,"");
	}else{
	    let color = document.getElementById('bsp-name-color').selectedItem.value;
	    opener.NicoLiveHelper.postUserPress(cmd,comment,color);
	}
	str.splice(0,1);
	document.getElementById('multiline-comment').value = str.join('\r\n');
    }else{
	clearInterval(interval_id);
    }
}

function ReadTextFile(file){
    var istream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
    istream.init(file, 0x01, 0444, 0);
    istream.QueryInterface(Components.interfaces.nsILineInputStream);
    
    var cis = GetUTF8ConverterInputStream(istream);
    
    // 行を配列に読み込む
    var line = {}, hasmore;
    var str = "";
    do {
	hasmore = cis.readString(1024,line);
	str += line.value;
    } while(hasmore);
    istream.close();
    
    document.getElementById('multiline-comment').value = str;
}

function ChangeUsingBSP(){
    let cbox = document.getElementById('label-1');
    let b = document.getElementById('using-bsp').checked;
    cbox.setAttribute("value", b ? "名前:" : "コマンド:");
    
    document.getElementById('bsp-name-color').style.display = b ? "block":"none";
}

function FileDropped(event){
    var file = event.dataTransfer.mozGetDataAt("application/x-moz-file", 0);
    if (file instanceof Components.interfaces.nsIFile){
	if( !file.leafName.match(/\.txt$/) ) return;
	//Application.console.log("file dropped:"+file.path);
	ReadTextFile(file);
	return;
    }
}

function Init(){
    let file = window.opener.NicoLivePreference.getContinuousCommentDir();
    file.QueryInterface(Components.interfaces.nsILocalFile);
    let direntry = file.directoryEntries.QueryInterface(Components.interfaces.nsIDirectoryEnumerator);

    let dir;
    let i=0;
    while( dir = direntry.nextFile ){
	if( dir.leafName.match(/\.txt$/) ){
	    DirLists.push(dir);
	    let menuitem = CreateMenuItem(dir.leafName,i);
	    $('menu-filelist').appendChild(menuitem);
	    i++;
	}
    }
}

window.addEventListener("load", function(e){ Init(); }, false);
