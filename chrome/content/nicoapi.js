/*
Copyright (c) 2012 amano <amano@miku39.jp>

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

var NicoApi = {
    base_uri: "http://watch.live.nicovideo.jp/api/",

    callApi: function( url, postfunc ){
	let req = CreateXHR("GET",url);
	if( !req ){
	    postfunc( null );
	    return;
	}
	req.onreadystatechange = function(){
	    if( req.readyState!=4 ) return;
	    if( req.status!=200 ){
		debugprint( url+" failed.");
		postfunc( null );
		return;
	    }
	    postfunc( req.responseXML, req );
	};
	req.send("");
    },

    getthumbinfo: function( video_id, postfunc ){
	let url = "http://ext.nicovideo.jp/api/getthumbinfo/"+video_id;
	this.callApi( url, postfunc );
    },

    getplayerstatus: function( request_id, postfunc ){
	let url = this.base_uri + "getplayerstatus?v=" + request_id;
	this.callApi( url, postfunc );
    },

    getpublishstatus: function( request_id, postfunc ){
	let url = this.base_uri + "getpublishstatus?v=" + request_id + "&version=2";
	this.callApi( url, postfunc );
    }

};
