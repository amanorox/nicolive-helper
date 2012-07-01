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
    // niconico.comで生放送するときにアクセスする先のドメイン
    live_base_uri_en: "http://watch.live.niconico.com/api/",
    live_base_uri_jp: "http://watch.live.nicovideo.jp/api/",
    live_base_uri: "",
    base_uri_jp: "http://www.nicovideo.jp/",
    base_uri_en: "http://video.niconico.com/",
    base_uri: "",

    callApi: function( url, postfunc, postdata ){
	let req;
	if( postdata ){
	    req = CreateXHR("POST",url);
	}else{
	    req = CreateXHR("GET",url);
	}
	if( !req ){
	    postfunc( null );
	    return;
	}
	req.onreadystatechange = function(){
	    if( req.readyState!=4 ) return;
	    if( req.status!=200 ){
		debugprint( url+" failed.");
		postfunc( null, req );
		return;
	    }
	    postfunc( req.responseXML, req );
	};
	if( postdata ){
	    req.setRequestHeader('Content-type','application/x-www-form-urlencoded; charset=UTF-8');
	    req.send( postdata.join("&") );
	}else{
	    req.send("");
	}
    },

    broadcast: function( request_id, postdata, postfunc ){
	let url = this.live_base_uri + "broadcast/" + request_id;
	this.callApi( url, postfunc, postdata );
    },

    presscast: function( postdata, postfunc ){
	// BSPはなぜか watch.live.nicovideo.jp じゃなくて live.nicovideo.jp
	let url = "http://live.nicovideo.jp/api/presscast";
	this.callApi( url, postfunc, postdata );
    },

    getpostkey: function( thread, block_no, postfunc ){
	let url = this.live_base_uri + "getpostkey?thread="+thread+"&block_no="+block_no;
	this.callApi( url, postfunc );
    },

    getthumbinfo: function( video_id, postfunc ){
	let url = "http://ext.nicovideo.jp/api/getthumbinfo/"+video_id;
	this.callApi( url, postfunc );
    },

    heartbeat:function( postdata, postfunc ){
	let url = this.live_base_uri + "heartbeat";
	this.callApi( url, postfunc, postdata );
    },
    
    configurestream:function( request_id, param, postfunc ){
	let url = "http://watch.live.nicovideo.jp/api/configurestream/" + request_id +"?"+param;
    },

    getplayerstatus: function( request_id, postfunc ){
	let url = this.live_base_uri + "getplayerstatus?v=" + request_id;
	this.callApi( url, postfunc );
    },

    getpublishstatus: function( request_id, postfunc ){
	let url = this.live_base_uri + "getpublishstatus?v=" + request_id + "&version=2";
	this.callApi( url, postfunc );
    },

    getremainpoint: function( postfunc ){
	let url = this.live_base_uri + "getremainpoint";
	this.callApi( url, postfunc );
    },

    getsalelist: function( request_id, postfunc ){
	let url = this.live_base_uri + "getsalelist?v=" + request_id;
	this.callApi( url, postfunc );
    },

    usepoint: function( postdata, postfunc ){
	let url = this.live_base_uri + "usepoint";
	this.callApi( url, postfunc , postdata );
    },

    getwaybackkey: function( thread, postfunc ){
	let url = this.live_base_uri + "getwaybackkey?thread="+thread;
	this.callApi( url, postfunc );
    },

    mylistRSS: function( mylist_id, postfunc ){
	let url = "http://www.nicovideo.jp/mylist/" + mylist_id + "?rss=2.0";
	this.callApi( url, postfunc );
    },

    addDeflist: function( item_id, token, additional_msg, postfunc ){
	let url = this.base_uri + "api/deflist/add";
	let reqstr = [];
	reqstr[0] = "item_id="+encodeURIComponent(item_id);
	reqstr[1] = "description="+encodeURIComponent(additional_msg);
	reqstr[2] = "token="+encodeURIComponent(token);
	reqstr[3] = "item_type=0";
	this.callApi( url, postfunc, reqstr );
    },
    addMylist: function(item_id,mylist_id,token,additional_msg,postfunc){
	let url = this.base_uri+"api/mylist/add";
	let reqstr = [];
	reqstr[0] = "group_id="+encodeURIComponent(mylist_id);
	reqstr[1] = "item_type=0"; // 0 means video.
	reqstr[2] = "item_id="+encodeURIComponent(item_id);
	reqstr[3] = "description="+encodeURIComponent(additional_msg);
	reqstr[4] = "token="+encodeURIComponent(token);
	this.callApi( url, postfunc, reqstr );
    },
    getMylistToken: function(video_id, postfunc){
	let url = this.base_uri + "mylist_add/video/"+video_id;
	this.callApi( url, postfunc );
    },

    getDeflist:function(postfunc){
	let url = this.base_uri+'api/deflist/list';
	this.callApi( url, postfunc );
    },
    getmylistgroup: function(postfunc){
	let url = this.base_uri+"api/mylistgroup/list";
	this.callApi( url, postfunc );
    },
    getmylist:function(item_id, postfunc){
	let url = this.base_uri+"api/mylist/list";
	let data = [];
	data[0] = "group_id="+item_id;
	this.callApi( url, postfunc, data );
    }

};

NicoApi.base_uri = NicoApi.base_uri_jp;
NicoApi.live_base_uri = NicoApi.live_base_uri_jp;
