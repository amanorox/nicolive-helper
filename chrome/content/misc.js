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
