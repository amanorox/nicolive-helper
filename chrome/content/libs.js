/**
 * いろいろと便利関数などを.
 */

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
const HTML_NS= "http://www.w3.org/1999/xhtml";
const MYLIST_URL = "http://www.nicovideo.jp/mylistgroup_edit";
const COMMENT_LOG = 500;
const VersionNumber = "NicoLive Helper 0.9.3";

function $(tag){
    return document.getElementById(tag);
}

function $$(tag){
    return document.getElementsByTagName(tag);
}

function CreateElement(part){
    var elem;
    elem = document.createElementNS(XUL_NS,part);
    return elem;
}
function CreateHTMLElement(part){
    var elem;
    elem = document.createElementNS(HTML_NS,part);
    return elem;
}

function CreateMenuItem(label,value){
    var elem;
    elem = document.createElementNS(XUL_NS,'menuitem');
    elem.setAttribute('label',label);
    elem.setAttribute('value',value);
    return elem;
};

function CreateButton(label){
    var elem;
    elem = document.createElementNS(XUL_NS,'button');
    elem.setAttribute('label',label);
    return elem;
}

function CreateLabel(label){
    var elem;
    elem = document.createElementNS(XUL_NS,'label');
    elem.setAttribute('value',label);
    return elem;
}

function OpenFile(path){
    var localfileCID = '@mozilla.org/file/local;1';
    var localfileIID =Components.interfaces.nsILocalFile;
    try {
	var file = Components.classes[localfileCID].createInstance(localfileIID);
	file.initWithPath(path);
	return file;
    }
    catch(e) {
	return false;
    }
}

function ComfirmPrompt(text,caption){
    var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
    var result = prompts.confirm(null, caption, text);
    return result;
}

function InputPrompt(text,caption,input){
    var check = {value: false};
    var input_ = {value: input};

    var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
    var result = prompts.prompt(null, caption, text, input_, null, check);
    if( result ){
	return input_.value;
    }else{
	return null;
    }
}

function FindParentElement(elem,tag){
    while(elem.parentNode &&
	  (!elem.tagName || (elem.tagName.toUpperCase()!=tag.toUpperCase()))){
	elem = elem.parentNode;
    }
    return elem;
}

// NicoLive Helperのウィンドウをリストアップする.
function WindowEnumerator(){
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
    var enumerator = wm.getEnumerator("");
    var windowlist = new Array();
    while(enumerator.hasMoreElements()) {
	var win = enumerator.getNext();
	// win is [Object ChromeWindow] (just like window), do something with it
	debugprint("window:"+win.name);
	if(win.name.match(/^NLH_lv\d+$/)){
	    windowlist.push(win);
	}
    }
    return windowlist;
}

function CopyToClipboard(str){
    if(str.length<=0) return;
    var gClipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"].  
	getService(Components.interfaces.nsIClipboardHelper);  
    gClipboardHelper.copyString(str);
    debugprint('copy to clipboard:'+str);
}

function htmlspecialchars(ch){
    ch = ch.replace(/&/g,"&amp;");
    //ch = ch.replace(/"/g,"&quot;");
    //ch = ch.replace(/'/g,"&#039;");
    ch = ch.replace(/</g,"&lt;");
    ch = ch.replace(/>/g,"&gt;");
    return ch ;
}

function restorehtmlspecialchars(ch){
    ch = ch.replace(/&quot;/g,"\"");
    ch = ch.replace(/&amp;/g,"&");
    ch = ch.replace(/&lt;/g,"<");
    ch = ch.replace(/&gt;/g,">");
    ch = ch.replace(/&nbsp;/g," ");
    ch = ch.replace(/&apos;/g,"'");
    return ch;
}

function debugprint(txt){
    if( $('debug-textbox') )
	$('debug-textbox').value += txt + "\n";
    //Application.console.log(txt);
}
function debugalert(txt){
    alert(txt);
}

function debugnotice(txt){
    $('noticewin').removeAllNotifications(false);
    $('noticewin').appendNotification(txt,null,null,
				      $('noticewin').PRIORITY_WARNING_LOW,null);
}

function SetWindowTopMost(w,b){
    var Ci = Components.interfaces;
    var XULWindow = w
	.QueryInterface(Ci.nsIInterfaceRequestor)
	.getInterface(Ci.nsIWebNavigation)
	.QueryInterface(Ci.nsIDocShellTreeItem)
	.treeOwner
	.QueryInterface(Ci.nsIInterfaceRequestor)
	.getInterface(Ci.nsIXULWindow);
    XULWindow.zLevel = b ? Ci.nsIXULWindow.highestZ : Ci.nsIXULWindow.normalZ;
}

function GetUTF8ConverterInputStream(istream)
{
    var cis = Components.classes["@mozilla.org/intl/converter-input-stream;1"].createInstance(Components.interfaces.nsIConverterInputStream);
    cis.init(istream,"UTF-8",0,Components.interfaces.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);
    return cis;
}

function GetUTF8ConverterOutputStream(os)
{
    var cos = Components.classes["@mozilla.org/intl/converter-output-stream;1"].createInstance(Components.interfaces.nsIConverterOutputStream);
    cos.init(os,"UTF-8",0,Components.interfaces.nsIConverterOutputStream.DEFAULT_REPLACEMENT_CHARACTER);
    return cos;
}


// 現在時刻を秒で返す(C言語でいうところのtime()で).
function GetCurrentTime(){
    var d = new Date();
    return Math.floor(d.getTime()/1000);
}

function GetDateString(ms){
    var d = new Date(ms);
    return d.toLocaleFormat("%Y/%m/%d %H:%M:%S");
}

function GetFormattedDateString(format,ms){
    var d = new Date(ms);
    return d.toLocaleFormat(format);
}

// min:sec の文字列を返す.
function GetTimeString(sec){
    var str;
    str = parseInt(sec/60) + ":";
    str += (sec%60)<10?"0"+parseInt(Math.abs(sec)%60):parseInt(Math.abs(sec)%60);
    return str;
}

// min以上、max以下の範囲で乱数を返す.
function GetRandomInt(min, max){
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function ZenToHan(str){
    return str.replace(/[ａ-ｚＡ-Ｚ０-９（）＠]/g,
		       function(s){ return String.fromCharCode(s.charCodeAt(0)-65248); });
}

function FormatCommas(str){
    return str.toString().replace(/(\d)(?=(?:\d{3})+$)/g,"$1,");
}

function clearTable(tbody)
{
   while(tbody.rows.length>0){
      tbody.deleteRow(0);
   }
}

function IsWINNT()
{
    var osString = Components.classes["@mozilla.org/xre/app-info;1"]
        .getService(Components.interfaces.nsIXULRuntime).OS;
    if(osString=="WINNT"){
	return true;
    }
    return false;
}
