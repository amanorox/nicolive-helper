/**
 * いろいろと便利関数などを.
 */
 try{
     // Fx4.0
     Components.utils.import("resource://gre/modules/AddonManager.jsm");
} catch (x) {
} 

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
const HTML_NS= "http://www.w3.org/1999/xhtml";
const MYLIST_URL = "http://www.nicovideo.jp/mylistgroup_edit";
const COMMENT_LOG = 500;

// コメント送信状態.
const COMMENT_STATE_NONE = 0;
const COMMENT_STATE_MOVIEINFO_BEGIN = 1;
const COMMENT_STATE_MOVIEINFO_DONE = 2;

// コメント表示状態.
const COMMENT_VIEW_NORMAL = 0;      // 上コメに表示できる.
const COMMENT_VIEW_HIDDEN_PERM = 1; // 上コメに表示できない(表示するには/clsが必要).

// 送信する主コメの種別.
const COMMENT_MSG_TYPE_AUTOREPLY = 0; // 0というか実際はundefined,nullになる.
const COMMENT_MSG_TYPE_MOVIEINFO = 1; // 動画情報の主コメのとき.
const COMMENT_MSG_TYPE_NORMAL    = 2; // 普通の主コメをするとき.


function $(tag){
    return document.getElementById(tag);
}

function $$(tag){
    return document.getElementsByTagName(tag);
}

function GetAddonVersion()
{
    let version;
    try{
	var em = Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager);
	var addon = em.getItemForID("nicolivehelper@miku39.jp");
	version = addon.version;
    } catch (x) {
	// Fx4
	AddonManager.getAddonByID("nicolivehelper@miku39.jp",
				  function(addon) {
				      version = addon.version;
				      //alert("My extension's version is " + addon.version);
				  });
	// Piroさん(http://piro.sakura.ne.jp/)が値が設定されるまで待つことをやっていたので真似してしまう.
	var thread = Components.classes['@mozilla.org/thread-manager;1'].getService().mainThread;
	while (version === void(0)) {
	    thread.processNextEvent(true);
	}
    }
    return version;
}

// 特定の DOM ノードもしくは Document オブジェクト (aNode) に対して
// XPath 式 aExpression を評価し、その結果を配列として返す。
// 最初の作業を行った wanderingstan at morethanwarm dot mail dot com に感謝します。
function evaluateXPath(aNode, aExpr) {
    var xpe = new XPathEvaluator();
    var nsResolver = xpe.createNSResolver(aNode.ownerDocument == null ?
					  aNode.documentElement : aNode.ownerDocument.documentElement);
    var result = xpe.evaluate(aExpr, aNode, nsResolver, 0, null);
    var found = [];
    var res;
    while (res = result.iterateNext())
	found.push(res);
    return found;
}
function evaluateXPath2(aNode, aExpr) {
    var xpe = new XPathEvaluator();
    var nsResolver = function(){ return XUL_NS; };
    var result = xpe.evaluate(aExpr, aNode, nsResolver, 0, null);
    var found = [];
    var res;
    while (res = result.iterateNext())
	found.push(res);
    return found;
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

function RemoveElement(elem){
    elem.parentNode.removeChild(elem);
}

function RemoveChildren(elem){
    while(elem.hasChildNodes()) { 
	elem.removeChild(elem.childNodes[0]);
    }
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

// NicoLiveHelperのインストールパスを返す.
function GetExtensionPath(){
    let ext;
    try{
	ext = Components.classes["@mozilla.org/extensions/manager;1"]
            .getService(Components.interfaces.nsIExtensionManager)
            .getInstallLocation(id)
            .getItemLocation(id);
    } catch (x) {
	let _addon;
	AddonManager.getAddonByID("nicolivehelper@miku39.jp",
				  function(addon) {
				      _addon = addon;
				  });
	// Piroさん(http://piro.sakura.ne.jp/)が値が設定されるまで待つことをやっていたので真似してしまう.
	var thread = Components.classes['@mozilla.org/thread-manager;1'].getService().mainThread;
	while (_addon === void(0)) {
	    thread.processNextEvent(true);
	}
	ext = _addon.getResourceURI('/').QueryInterface(Components.interfaces.nsIFileURL).file.clone();
    }
    return ext;
}

function PlayAlertSound(){
    var sound = Components.classes["@mozilla.org/sound;1"].createInstance(Components.interfaces.nsISound);
    sound.playSystemSound("_moz_alertdialog");
}

function AlertPrompt(text,caption){
    var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
    var result = prompts.alert(window, caption, text);
    return result;
}

function ConfirmPrompt(text,caption){
    var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
    var result = prompts.confirm(window, caption, text);
    return result;
}

function InputPrompt(text,caption,input){
    var check = {value: false};
    var input_ = {value: input};

    var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
    var result = prompts.prompt(window, caption, text, input_, null, check);
    if( result ){
	return input_.value;
    }else{
	return null;
    }
}

function InputPromptWithCheck(text,caption,input,checktext){
    var check = {value: false};
    var input_ = {value: input};

    var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
    var result = prompts.prompt(window, caption, text, input_, checktext, check);
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
	//debugprint("window:"+win.name);
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
}

function htmlspecialchars(ch){
    ch = ch.replace(/&/g,"&amp;");
    ch = ch.replace(/"/g,"&quot;");
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

function debugconsole(txt){
    Application.console.log(txt);
}

function debugalert(txt){
    AlertPrompt(txt);
}



var noticeid;
function ShowNotice(txt, dontclear){
    debugprint(txt);
    $('noticewin').removeAllNotifications(false);
    $('noticewin').appendNotification(txt,null,null,
				      $('noticewin').PRIORITY_WARNING_LOW,null);
    clearInterval(noticeid);
    if( dontclear ) return;
    noticeid = setInterval( function(){
				$('noticewin').removeAllNotifications(false);
				clearInterval(noticeid);
			    }, 15*1000 );
}

function ShowPopupNotification(title,text){
    try {
	Components.classes['@mozilla.org/alerts-service;1'].getService(Components.interfaces.nsIAlertsService)
	    .showAlertNotification(null, title, text, false, '', null);
    } catch(e) {
	// prevents runtime error on platforms that don't implement nsIAlertsService
	var image = null;
	var win = Components.classes['@mozilla.org/embedcomp/window-watcher;1'].getService(Components.interfaces.nsIWindowWatcher)
	    .openWindow(null, 'chrome://global/content/alerts/alert.xul','_blank', 'chrome,titlebar=no,popup=yes', null);
	win.arguments = [image, title, text, false, ''];
    }
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


// 現在時刻を秒で返す(UNIX時間).
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

function GetSelectedTag(tags,selection,color){
    let r = new Array();
    let i,tag;
    for(i=0; tag=tags[i]; i++){
	for(let j=0,sel;sel=selection[j]; j++){
	    let reg = new RegExp(sel,"i");
	    if(tag.match(reg)){
		r.push(tag);
		break;
	    }
	}
    }
    // 正規表現でうまく色付きに置換できなかったので強引に.
    let s = "";
    let len = 0;
    for(i=0; tag=r[i]; i++){
	let l = tag.length;
	for(let j=0,sel;sel=selection[j]; j++){
	    let reg = new RegExp(sel,"i");
	    if( tag.match(reg) ){
		if(color[j]){
		    tag = "<font color=\""+color[j]+"\">"+tag+"</font>";
		}
		break;
	    }
	}
	s += tag;
	len += l;
	if(len>=35 && r[i+1]){
	    s += "<br>";
	    len = 0;
	}else if( r[i+1] ){
	    s+="　";
	    len++;
	}
    }
    return s;
}

function GetColoredTag(tags,selection,color){
    let s = "";
    let len = 0;
    for(let i=0,tag; tag=tags[i]; i++){
	let l = tag.length;
	for(let j=0,sel;sel=selection[j]; j++){
	    let reg = new RegExp(sel,"i");
	    if( tag.match(reg) ){
		if(color[j]){
		    tag = "<font color=\""+color[j]+"\">"+tag+"</font>";
		}
		break;
	    }
	}
	s += tag;
	len += l;
	if(len>=35 && tags[i+1]){
	    s += "<br>";
	    len = 0;
	}else if( tags[i+1] ){
	    s+="　";
	    len++;
	}
    }
    return s;
}

// string bundleから文字列を読みこむ.
function LoadString(name){
    return $('string-bundle').getString(name);
}
function LoadFormattedString(name,array){
    return $('string-bundle').getFormattedString(name,array);
}

// min:sec の文字列を返す.
function GetTimeString(sec){
    let str = "";
    if(sec<0) str = "-";
    sec = Math.abs(sec);
    str += parseInt(sec/60) + ":";
    str += (sec%60)<10?"0"+parseInt(sec%60):parseInt(sec%60);
    return str;
}

// min以上、max以下の範囲で乱数を返す.
function GetRandomInt(min, max){
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


// LCGの疑似乱数はランダム再生専用のため、他の用途では使用禁止.
var g_randomseed = GetCurrentTime();
function srand(seed)
{
    g_randomseed = seed;
}
function rand()
{
    g_randomseed = (g_randomseed * 214013 + 2531011) & 0x7fffffff;
    return g_randomseed;
}
// min以上、max以下の範囲で乱数を返す.
function GetRandomIntLCG(min,max)
{
    let tmp = rand() >> 4;
    return (tmp % (max-min+1)) + min;
}

function ZenToHan(str){
    return str.replace(/[ａ-ｚＡ-Ｚ０-９－（）＠]/g,
		       function(s){ return String.fromCharCode(s.charCodeAt(0)-65248); });
}

function HiraToKana(str){
    return str.replace(/[\u3041-\u3094]/g,
		      function(s){ return String.fromCharCode(s.charCodeAt(0)+0x60); });
}

/*
 *  convertKana JavaScript Library beta4
 *  
 *  MIT-style license. 
 *  
 *  2007 Kazuma Nishihata [to-R]
 *  http://www.webcreativepark.net
 * 
 * よりアルゴリズムを拝借.
 */
function HanToZenKana(str){
    let fullKana = new Array("ヴ","ガ","ギ","グ","ゲ","ゴ","ザ","ジ","ズ","ゼ","ゾ","ダ","ヂ","ヅ","デ","ド","バ","ビ","ブ","ベ","ボ","パ","ピ","プ","ペ","ポ","゛","。","「","」","、","・","ヲ","ァ","ィ","ゥ","ェ","ォ","ャ","ュ","ョ","ッ","ー","ア","イ","ウ","エ","オ","カ","キ","ク","ケ","コ","サ","シ","ス","セ","ソ","タ","チ","ツ","テ","ト","ナ","ニ","ヌ","ネ","ノ","ハ","ヒ","フ","ヘ","ホ","マ","ミ","ム","メ","モ","ヤ","ユ","ヨ","ラ","リ","ル","レ","ロ","ワ","ン","゜");
    let halfKana = new Array("ｳﾞ","ｶﾞ","ｷﾞ","ｸﾞ","ｹﾞ","ｺﾞ","ｻﾞ","ｼﾞ","ｽﾞ","ｾﾞ","ｿﾞ","ﾀﾞ","ﾁﾞ","ﾂﾞ","ﾃﾞ","ﾄﾞ","ﾊﾞ","ﾋﾞ","ﾌﾞ","ﾍﾞ","ﾎﾞ","ﾊﾟ","ﾋﾟ","ﾌﾟ","ﾍﾟ","ﾎﾟ","ﾞ","｡","｢","｣","､","･","ｦ","ｧ","ｨ","ｩ","ｪ","ｫ","ｬ","ｭ","ｮ","ｯ","ｰ","ｱ","ｲ","ｳ","ｴ","ｵ","ｶ","ｷ","ｸ","ｹ","ｺ","ｻ","ｼ","ｽ","ｾ","ｿ","ﾀ","ﾁ","ﾂ","ﾃ","ﾄ","ﾅ","ﾆ","ﾇ","ﾈ","ﾉ","ﾊ","ﾋ","ﾌ","ﾍ","ﾎ","ﾏ","ﾐ","ﾑ","ﾒ","ﾓ","ﾔ","ﾕ","ﾖ","ﾗ","ﾘ","ﾙ","ﾚ","ﾛ","ﾜ","ﾝ","ﾟ");
    for(let i = 0; i < 89; i++){
	let re = new RegExp(halfKana[i],"g");
	str=str.replace(re, fullKana[i]);
    }
    return str;
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
