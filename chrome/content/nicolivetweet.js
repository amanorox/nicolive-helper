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

var NicoLiveTweet = {
    consumer: "YOUR-CONSUMER-KEY",
    consumerSecret: "YOUR-CONSUMER-SECRET",

    requestTokenURL: "http://twitter.com/oauth/request_token",
    accessTokenURL: "https://api.twitter.com/oauth/access_token",
    updateURL: "http://api.twitter.com/1/statuses/update.json",

    oauth: {},

    getRequestToken:function(){
	this.accessor = {
	    consumerSecret: this.consumerSecret,
	    tokenSecret: ""
	};
	this.message = {
	    action: this.requestTokenURL,
	    method: "POST",
	    parameters: []
	};
	this.message.parameters.push(["oauth_consumer_key",this.consumer]);
	this.message.parameters.push(["oauth_signature_method","HMAC-SHA1"]);
	this.message.parameters.push(["oauth_timestamp",""]);
	this.message.parameters.push(["oauth_nonce",""]);
	this.message.parameters.push(["oauth_signature",""]);
	OAuth.setTimestampAndNonce(this.message);
	OAuth.SignatureMethod.sign(this.message,this.accessor);

	let req = new XMLHttpRequest();
	if( !req ) return;

	req.onreadystatechange = function(){
	    if( req.readyState!=4 ) return;
	    if( req.status==200 ){
		let values = req.responseText.split('&');
		for(let i=0,item;item=values[i];i++){
		    let val = item.split('=');
		    NicoLiveTweet.oauth[val[0]] = val[1];
		}
	    }
	    debugprint('request token:'+req.responseText);
	};
	let url = this.requestTokenURL;
	req.open('POST', url );
	req.setRequestHeader('Content-type','application/x-www-form-urlencoded');

	let str = new Array();
	for(let i=0,item;item=this.message.parameters[i];i++){
	    str.push(item[0] +"=" + item[1]);
	}
	req.send(str.join('&'));
    },

    getAccessTokenByXAuth:function(user_id,password){
	let accessor = {
	    consumerSecret: this.consumerSecret,
	    tokenSecret: ""
	};
	let message = {
	    action: this.accessTokenURL,
	    method: "POST",
	    parameters: []
	};
	message.parameters.push(["oauth_consumer_key",this.consumer]);
	message.parameters.push(["oauth_nonce",""]);
	message.parameters.push(["oauth_signature",""]);
	message.parameters.push(["oauth_signature_method","HMAC-SHA1"]);
	message.parameters.push(["oauth_timestamp",""]);
	message.parameters.push(["oauth_version","1.0"]);
	message.parameters.push(["x_auth_mode","client_auth"]);
	message.parameters.push(["x_auth_password","fushiori22"]);
	message.parameters.push(["x_auth_username","amano_rox"]);

	OAuth.setTimestampAndNonce(message);
	OAuth.SignatureMethod.sign(message,accessor);

	let req = new XMLHttpRequest();
	if( !req ) return;

	req.onreadystatechange = function(){
	    if( req.readyState!=4 ) return;
	    if( req.status==200 ){
		let values = req.responseText.split('&');
		NicoLiveTweet.oauth = {};
		for(let i=0,item;item=values[i];i++){
		    let val = item.split('=');
		    NicoLiveTweet.oauth[val[0]] = val[1];
		}
	    }
	    debugprint('request token:'+req.responseText);
	};
	let url = this.accessTokenURL;
	req.open('POST', url );

///	req.setRequestHeader('Authorization',OAuth.getAuthorizationHeader('http://miku39.jp/',this.message.parameters));
	req.setRequestHeader('Content-type','application/x-www-form-urlencoded');

	let xauth = new Array();
	let str = new Array();
	xauth = message.parameters;
	for(let i=0,item;item=xauth[i];i++){
	    str.push(item[0] +"=" + item[1] + "");
	}
	req.send(str.join('&'));
    },

    updateStatus:function(text){
	let accessor = {
	    consumerSecret: this.consumerSecret,
	    tokenSecret: this.oauth["oauth_token_secret"]
	};
	let message = {
	    action: this.updateURL,
	    method: "POST",
	    parameters: []
	};
	message.parameters.push(["oauth_consumer_key",this.consumer]);
	message.parameters.push(["oauth_nonce",""]);
	message.parameters.push(["oauth_token",this.oauth["oauth_token"]]);
	message.parameters.push(["oauth_signature",""]);
	message.parameters.push(["oauth_signature_method","HMAC-SHA1"]);
	message.parameters.push(["oauth_timestamp",""]);
	message.parameters.push(["oauth_version","1.0"]);
	message.parameters.push(["status",text]);

	OAuth.setTimestampAndNonce(message);
	OAuth.SignatureMethod.sign(message,accessor);

	let req = new XMLHttpRequest();
	if( !req ) return;

	req.onreadystatechange = function(){
	    if( req.readyState!=4 ) return;
	    /*
	     403 {"request":"/1/statuses/update.json","error":"Status is a duplicate."}

	     200 {"in_reply_to_status_id":null,"created_at":"Fri Apr 09 08:33:12 +0000 2010","truncated":false,"geo":null,"contributors":null,"place":null,"source":"<a href=\"http://com.nicovideo.jp/community/co105163\" rel=\"nofollow\">NicoLiveHelper</a>","coordinates":null,"favorited":false,"user":{"profile_background_image_url":"http://s.twimg.com/a/1270775308/images/themes/theme1/bg.png","created_at":"Thu Mar 20 11:38:48 +0000 2008","profile_link_color":"0000ff","followers_count":73,"description":"\u4e3b\u306bNicoLive Helper\u306e\u4e2d\u306e\u4eba\u3002\u305f\u307e\u306b\u521d\u97f3\u30df\u30af\u306e\u30e9\u30a4\u30d6\u3068VOCALOID\u751f\u653e\u9001\u4e3b\u3002\r\n\u4f55\u304b\u8981\u671b\u3042\u308b\u3068\u304d\u306f\u63b2\u793a\u677f\u3068\u304b@Replies\u3084Mentions\u306a\u3069\u3067\u3082\u3002\r\n\u81ea\u5206\u3067\u3082\u6f5c\u5728\u7684\u306a\u9700\u8981\u3092\u691c\u7d22\u3057\u3066\u8abf\u3079\u308b\u3051\u3069\u76f4\u63a5\u63d0\u6848\u304c\u3053\u306a\u3044\u3082\u306e\u306f\u539f\u5247\u63a1\u7528\u306a\u3057\u3002","following":false,"profile_background_tile":false,"friends_count":98,"profile_sidebar_fill_color":"e0ff92","statuses_count":1408,"url":"http://miku39.jp/blog/wp/","profile_image_url":"http://s.twimg.com/a/1270775308/images/default_profile_4_normal.png","notifications":false,"favourites_count":0,"profile_sidebar_border_color":"87bc44","contributors_enabled":false,"location":"iPhone: 35.696991,139.787491","screen_name":"amano_rox","geo_enabled":true,"time_zone":"Tokyo","profile_background_color":"9ae4e8","protected":false,"verified":false,"name":"\u3042\u307e\u306e","profile_text_color":"000000","id":14183509,"lang":"en","utc_offset":32400},"in_reply_to_screen_name":null,"in_reply_to_user_id":null,"id":11870775172,"text":"\u304a\u3001\u3046\u307e\u304f\u3044\u3063\u305f\u304b\u306a\u3002"}
	     */
	    if( req.status==200 ){
	    }
	    debugprint('update result:'+req.responseText);
	};
	let url = this.updateURL;
	req.open('POST', url );
	req.setRequestHeader('Authorization',OAuth.getAuthorizationHeader('http://miku39.jp/',message.parameters));
	req.setRequestHeader('Content-type','application/x-www-form-urlencoded');
	req.send("status="+encodeURIComponent(text));
    }
};
