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

var NicoLiveRights = {
    searchFromRequest:function(node){
	let code = node.textContent;
	this.searchJWID(code);
    },

    searchJWID:function(code){
	// xxx-xxxx-x (JASRAC)
	// xxxxx (elicense)
	// xxxxxxxJRC (JRC)
	try{
	    code = code.match(/(...[-+=/]....[-+=/].)/)[1];
	    code = code.replace(/[-+=/]/g,"-");
	} catch (x) {
	    return;
	}
	let tab = window.opener.getBrowser().addTab('http://www2.jasrac.or.jp/eJwid/main.jsp?trxID=F00100');
	window.opener.getBrowser().selectedTab = tab;
	let opentab = window.opener.getBrowser().getBrowserForTab(tab);
	opentab.addEventListener('load',
				 function(e){
				     try{
					 let frame = e.target.getElementsByTagName('frame')[0].wrappedJSObject;
					 let inputcode = evaluateXPath(frame.contentDocument,"//input[@name='IN_WORKS_CD']")[0];
					 inputcode.value = code;
					 let submit = evaluateXPath(frame.contentDocument,"//input[@name='CMD_SEARCH']")[0];
					 submit.click();
				     } catch (x) {
				     }
				 },true);
	tab = null; opentab = null;
    },
    search_elicense:function(code){
	// xxx-xxxx-x (JASRAC)
	// xxxxx (elicense)
	// xxxxxxxJRC (JRC)
	try{
	    code = code.match(/(\d{5})/)[1];
	} catch (x) {
	    return;
	}
	let tab = window.opener.getBrowser().addTab('https://ssl.elicense.co.jp/piece_search/search');
	window.opener.getBrowser().selectedTab = tab;
	let opentab = window.opener.getBrowser().getBrowserForTab(tab);
	opentab.addEventListener('load',
				 function(e){
				     let input = evaluateXPath(e.target,"//*[@id='piece_cd_s']")[0];
				     input.value = code;
				     let submit = evaluateXPath(e.target,"//*[@name='search_start']")[0];
				     submit.click();
				 },true);
	tab = null; opentab = null;
    }
};
