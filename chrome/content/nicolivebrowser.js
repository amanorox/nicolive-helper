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
