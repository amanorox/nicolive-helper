function OpenAboutDialog(){
    var f='chrome,toolbar,modal=yes,resizable=no,centerscreen';
    var w = window.openDialog('chrome://nicolivehelperadvance/content/about.xul','NLHAAbout',f);
    SetWindowTopMost(w,NicoLivePreference.topmost);
    w.focus();
}


function OpenSettingsDialog(){
    var f='chrome,toolbar,modal=no,resizable=yes,centerscreen';
    if(NicoLivePreference.topmost){
	f += ',alwaysRaised=yes';
    }
    var w = window.openDialog('chrome://nicolivehelper/content/preferences.xul','NLHPreference',f);
    SetWindowTopMost(w,NicoLivePreference.topmost);
    w.focus();
}

function OpenVoteDialog(){
    var value = null;
    var f = "chrome,resizable=yes,centerscreen";
    if(NicoLivePreference.topmost){
	f += ',alwaysRaised=yes';
    }
    var w = window.openDialog("chrome://nicolivehelper/content/votedialog.xul","vote",f,value);
    SetWindowTopMost(w,NicoLivePreference.topmost);
    w.focus();
}

function OpenContinuousCommentWindow(){
    var value = null;
    var f = "chrome,resizable=yes,centerscreen";
    if(NicoLivePreference.topmost){
	f += ',alwaysRaised=yes';
    }
    var w = window.openDialog("chrome://nicolivehelper/content/continuouscomment.xul","vote",f,value);
    SetWindowTopMost(w,NicoLivePreference.topmost);
    w.focus();
}

function OpenSimpleCommentWindow(){
    var value = null;
    var f = "chrome,resizable=yes,centerscreen";
    if(NicoLivePreference.topmost){
	f += ',alwaysRaised=yes';
    }
    var w = window.openDialog("chrome://nicolivehelper/content/simplecomment.xul","vote",f,value);
    SetWindowTopMost(w,NicoLivePreference.topmost);
    w.focus();
}

function OpenAnchorWindow(){
    var value = null;
    var f = "chrome,dialog,centerscreen,modal";
    if(NicoLivePreference.topmost){
	f += ',alwaysRaised=yes';
    }
    var w = window.openDialog("chrome://nicolivehelper/content/anchorwin.xul","vote",f,value);
    SetWindowTopMost(w,NicoLivePreference.topmost);
    w.focus();
}

function OpenMyListManager(){
    var value = {};
    var f = "chrome,resizable=yes,centerscreen";
    if(NicoLivePreference.topmost){
	f += ',alwaysRaised=yes';
    }
    value.cookie = LibUserSessionCookie;
    value.agent = LibUserAgent;
    var w = window.openDialog("chrome://nicolivehelper/content/mylistmanager/mylistmanager.xul","mylistmanager",f,value);
    SetWindowTopMost(w,NicoLivePreference.topmost);
    w.focus();
}
