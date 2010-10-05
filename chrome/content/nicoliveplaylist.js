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

// プレイリストに関する機能を徐々にこちらに移行.
var NicoLivePlaylist = {
    _tab: null,
    _firsttime: true,

    playing:function(){
	
    },

    newTab:function(video_id){
	this._firsttime = true;
	this._current_video_id = video_id;
	try{
	    this._tab.contentDocument.wrappedJSObject.location.href = "http://www.nicovideo.jp/watch/"+video_id;
	} catch (x) {
	    let tab = window.opener.getBrowser().addTab('http://www.nicovideo.jp/watch/'+video_id);
	    this._tab = window.opener.getBrowser().getBrowserForTab(tab);
	}
	return this._tab;
    }
};
