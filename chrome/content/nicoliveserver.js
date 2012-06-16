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

var NicoLiveServer = {
    serverSocket: null,

    processLine:function(str){
	//debugprint( JSON.stringify(str) );
	if( str.length ){
	    NicoLiveHelper.postCommentMain(str,"","");
	    NicoLiveTalker.runProcess("",str);
	}
    },

    serverSocketListener: {
	onSocketAccepted : function(aServ,aTransport){
	    var input;
	    var output;
	    input = aTransport.openInputStream(0, 0, 0);
	    output = aTransport.openOutputStream(0, 0, 0);

	    NicoLiveServer.ciStream = Components.classes["@mozilla.org/intl/converter-input-stream;1"].createInstance(Components.interfaces.nsIConverterInputStream);
	    NicoLiveServer.ciStream.init(input,"UTF-8",0,Components.interfaces.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);

	    NicoLiveServer.coStream = Components.classes["@mozilla.org/intl/converter-output-stream;1"].createInstance(Components.interfaces.nsIConverterOutputStream);
	    NicoLiveServer.coStream.init(output,"UTF-8",0,Components.interfaces.nsIConverterOutputStream.DEFAULT_REPLACEMENT_CHARACTER);

	    var pump = Components.classes["@mozilla.org/network/input-stream-pump;1"].createInstance(Components.interfaces.nsIInputStreamPump);
	    let dataListener = {
		line: "",
		onStartRequest: function(request, context){
		    ShowNotice('クライアントが接続しました。');
		},
		onStopRequest: function(request, context, status){
		    try{
			PlayAlertSound();
			ShowNotice('クライアントが切断しました。',true);
			NicoLiveServer.iStream.close();
			NicoLiveServer.oStream.close();
		    } catch (x) {
		    }
		},
		onDataAvailable: function(request, context, inputStream, offset, count) {
		    let lineData = {};
		    let r;
		    while(1){
			// まとめて読むと、行単位の区切り付けるのメンドイんで.
			try{
			    r = NicoLiveServer.ciStream.readString(1,lineData);
			} catch (x) { debugprint(x); return; }
			if( !r ){ break; }
			//debugprint(this.line);

			if( lineData.value=="\0" ) continue;
			if( lineData.value=="\n" ) continue;

			if( lineData.value=="\r" ){
			    try{
				NicoLiveServer.processLine(this.line);
				//const response = this.line+ " ok.\r\n";
				//NicoLiveServer.coStream.writeString(response);
			    } catch (x) {
				//AlertPrompt(x);
			    }
			    this.line = "";
			    continue;
			}
			this.line += lineData.value;
		    }
		}
	    };
	    pump.init(input,-1,-1,0,0,false);
	    pump.asyncRead(dataListener, null);

	    NicoLiveServer.iStream = input;
	    NicoLiveServer.oStream = output;

	    const response = "connected.\r\n";
	    output.write(response, response.length);

	    //input.close();
	    //output.close();
	    return true;	
	},

	onStopListening:function(aServ,aTransport){
	    return true;	
	}
    },

    makeServer:function(){
	this.serverSocket=Components.classes["@mozilla.org/network/server-socket;1"]
	    .createInstance(Components.interfaces.nsIServerSocket);
	this.serverSocket.init(3939,false,5);//第一引数はポート番号
	this.serverSocket.asyncListen(this.serverSocketListener);
    },

    init: function(){
	this.makeServer();
    },

    destroy: function(){
	this.iStream.close();
	this.oStream.close();
	this.serverSocket.close();
    }

};

//window.addEventListener("load", function(e){ NicoLiveServer.init(); }, false);
window.addEventListener("unload", function(e){ NicoLiveServer.destroy(); }, false);
