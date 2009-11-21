var NLHPreference = {

    resetMovieInfo:function(){
	/*
	 * 再生数/{view} コメント/{comment} マイリスト/{mylist}({mylistrate})<br>{pname}
	 * タグ/{tags}
	 * ♪{id} {title}<br>投稿日/{date} 時間/{length}<br>{additional}
	 */
	try{
	    $('pref-videoinfo1').reset();
	} catch (x) {}
	try{
	    $('pref-videoinfo2').reset();
	} catch (x) {}
	try{
	    $('pref-videoinfo3').reset();
	} catch (x) {}
	try{
	    $('pref-typeofvideoinfo').reset();
	} catch (x) {}
    },

    resetAutoReply:function(){
	try{
	    $('pref-msg-deleted').reset();
	} catch (x) {}
	try{
	    $('pref-msg-notaccept').reset();
	} catch (x) {}
	try{
	    $('pref-msg-newmovie').reset();
	} catch (x) {}
	try{
	    $('pref-msg-played').reset();
	} catch (x) {}	
	try{
	    $('pref-msg-requested').reset();
	} catch (x) {}	
	try{
	    $('pref-msg-accept').reset();
	} catch (x) {}	
    },

    refDirectory:function(){
	const nsIFilePicker = Components.interfaces.nsIFilePicker;
	var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
	fp.init(window, "コメントログの保存先を指定してください", nsIFilePicker.modeGetFolder);
	var rv = fp.show();
	if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
	    var file = fp.file;
	    // Get the path as string. Note that you usually won't 
	    // need to work with the string paths.
	    var path = fp.file.path;
	    // work with returned nsILocalFile...
	    debugprint('commentlog='+path);

	    $('pref-commentlogDir').value = file;
	    $('commentlog').file = file;
	    $('commentlog').label = path;
	}
    },

    updateFilePicker:function(){
        var file = $('pref-commentlogDir').value;
        if (file) {
            var fileField = $('commentlog');
            fileField.file = file;
            fileField.label = file.path;
        }
    }

};
