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

var InAppBrowser = {
    backward: function(){
	document.getElementById('page').goBack();
	setTimeout(function(){
		       document.getElementById('url').value = document.getElementById('page').currentURI.spec;
		   },100);
    },
    forward: function(){
	document.getElementById('page').goForward();
	setTimeout(function(){
		       document.getElementById('url').value = document.getElementById('page').currentURI.spec;
		   },100);
    },
    reload: function(){
	document.getElementById('page').reload();
    },
    go: function(){
	document.getElementById('page').setAttribute('src', document.getElementById('url').value );
    },

    onLoad: function(){
	document.getElementById('url').value = document.getElementById('page').currentURI.spec;
    },

    init: function(){
	document.getElementById('page').setAttribute('src', window.arguments[0]);
	document.getElementById('page').addEventListener('DOMContentLoaded', this.onLoad, false );
	document.getElementById('url').value = window.arguments[0];
    },
    destroy: function(){
    }
};

window.addEventListener("load", function(e){ InAppBrowser.init(); }, false);
window.addEventListener("unload", function(e){ InAppBrowser.destroy(); }, false);
