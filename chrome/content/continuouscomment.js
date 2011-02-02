var DirLists = new Array();

function SendOneLine()
{
    var str;
    str = document.getElementById('multiline-comment').value.split(/\n|\r|\r\n/);
    if(str.length){
	let cmd = document.getElementById('multiline-command').value;
	let comment = str[0];
	comment = comment.replace(/\\([\\n])/g,function(s,p){switch(p){case "n": return "\n"; case "\\": return "\\"; default: return s;}});
	opener.NicoLiveComment.postCommentMain(comment,cmd,"");
	str.splice(0,1);
	document.getElementById('multiline-comment').value = str.join('\r\n');
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

function FileDropped(event){
    var file = event.dataTransfer.mozGetDataAt("application/x-moz-file", 0);
    if (file instanceof Components.interfaces.nsIFile){
	if( !file.leafName.match(/\.txt$/) ) return;
	//	    Application.console.log("file dropped:"+file.path);
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
