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
    consumer: "s7oBmLr1QbvyMkwNojgMVw",
    consumerSecret: "jGgsV5nKfchguFWcfmVtil1Dz77vCykiTznhzdwcV0",

    requestTokenURL: "http://twitter.com/oauth/request_token",
    accessTokenURL: "https://api.twitter.com/oauth/access_token",
    updateURL: "http://api.twitter.com/1/statuses/update.json",
    authorizeURL: "http://api.twitter.com/oauth/authorize",

    oauth: {},

    getSavedToken:function(){
	let hostname = "chrome://nicolivehelper";
	let myLoginManager = Components.classes["@mozilla.org/login-manager;1"].getService(Components.interfaces.nsILoginManager);  
	let logins = myLoginManager.findLogins({}, hostname, null, 'twitter token');
	if( logins.length ){
	    debugprint('# of tokens:'+logins.length);
	    this.oauth = {};
	    this.oauth["oauth_token"] = logins[0].username;
	    this.oauth["oauth_token_secret"] = logins[0].password;
	}else{
	    debugprint('No twitter token in LoginManager.');
	}
    },

    getRequestToken:function(){
	let accessor = {
	    consumerSecret: this.consumerSecret,
	    tokenSecret: ""
	};
	let message = {
	    action: this.requestTokenURL,
	    method: "POST",
	    parameters: []
	};
	message.parameters.push(["oauth_consumer_key",this.consumer]);
	message.parameters.push(["oauth_signature_method","HMAC-SHA1"]);
	message.parameters.push(["oauth_timestamp",""]);
	message.parameters.push(["oauth_nonce",""]);
	message.parameters.push(["oauth_signature",""]);
	OAuth.setTimestampAndNonce(message);
	OAuth.SignatureMethod.sign(message,accessor);

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
	    //debugprint('request token:'+req.responseText);
	};
	let url = this.requestTokenURL;
	req.open('POST', url );
	req.setRequestHeader('Content-type','application/x-www-form-urlencoded');

	let str = new Array();
	for(let i=0,item;item=message.parameters[i];i++){
	    str.push(item[0] +"=" + item[1]);
	}
	req.send(str.join('&'));
    },

    getAccessTokenByXAuth:function(user_id,password,callback){
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
	message.parameters.push(["x_auth_password",password]);
	message.parameters.push(["x_auth_username",user_id]);

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
	    if('function'==typeof callback) callback(req.status, NicoLiveTweet.oauth);
	    //debugprint('request token:'+req.responseText);
	};
	let url = this.accessTokenURL;
	req.open('POST', url );
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
	if( !this.oauth["oauth_token_secret"] || !this.oauth["oauth_token"] ) return;
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
	     401 {"request":"/1/statuses/update.json","error":"Could not authenticate you."}
	     */
	    if( req.status!=200 ){
		let result = JSON.parse(req.responseText);
		ShowNotice('Twitter:'+result.error);
	    }
	    //debugprint('update result:'+req.responseText);
	};
	let url = this.updateURL;
	req.open('POST', url );
	req.setRequestHeader('Authorization',OAuth.getAuthorizationHeader('http://miku39.jp/',message.parameters));
	req.setRequestHeader('Content-type','application/x-www-form-urlencoded');
	req.send("status="+encodeURIComponent(text));
    },

    // つぶやく.
    tweet:function(text){
	if( NicoLivePreference.twitter.api=='self' ){
	    this.updateStatus(text);
	}else{
	    NicoLiveHelper.postTweet(text);
	}
    },

    inputTweet:function(){
	let hashtag = NicoLiveHelper.twitterinfo.hashtag;
	hashtag = hashtag ? hashtag:"";
	let url = NicoLiveHelper.request_id!='lv0' ? "http://nico.ms/"+NicoLiveHelper.request_id:"";
	let msg = (url&&hashtag)?(url + ' ' + hashtag):"";
	if(msg){
	    msg = "ニコ生視聴中:"+NicoLiveHelper.musicinfo.title + " " + msg;
	}
	let result = InputPrompt("NicoLive Helperからつぶやく","NicoLive Helper",msg);
	if( result ){
	    NicoLiveTweet.updateStatus(result);
	}
    },

    init:function(){
	this.getSavedToken();
    }
};

window.addEventListener("load", function(e){ NicoLiveTweet.init(); }, false);
