/*
 * 生放送タブ
 */
var NicoLiveBrowser = {

    open:function(){
	$('live-page').setAttribute('src','http://live.nicovideo.jp/watch/'+NicoLiveHelper.request_id);	
    },

    close:function(){
	$('live-page').setAttribute('src','about:blank');
    },

    initContent:function(){
	try{
	    $('live-page').contentDocument.getElementById('footer').style.display = 'none';
	    $('live-page').contentDocument.getElementById('navi').style.display = 'none';
	    $('live-page').contentDocument.getElementById('header').style.display = 'none';
	    $('live-page').contentDocument.getElementById('nextprev').style.display = 'none';
	    $('live-page').contentDocument.getElementById('toTop').style.display = 'none';
	    let ichiba = $('live-page').contentDocument.getElementById('ichiba');
	    ichiba.children[1].style.display = 'none';
	} catch (x) {
	}
    },

    init:function(){
	$('live-page').addEventListener('load',function(){ NicoLiveBrowser.initContent(); },true );
    }
};

window.addEventListener('load',function(){NicoLiveBrowser.init();},false);
