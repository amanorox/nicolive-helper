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

var NicoLiveTabs = {

    startDragging:function(event){
	let dt = event.dataTransfer;
	dt.mozSetDataAt('application/x-moz-node', event.target , 0 );
    },
    dropTab:function(event){
	let dt = event.dataTransfer;
	let effect = dt.dropEffect; // copy, move
	let target = event.target;
	//debugprint("tab dropped");
	//debugprint(target.id);

	let node = dt.mozGetDataAt("application/x-moz-node", 0);
	target.parentNode.insertBefore(node,target);

	let tabs = evaluateXPath2(document,"//xul:tabs/xul:tab");
	//Application.console.log(tabs.length);

	let i = tabs.length-1;
	let tmp = new Array();
	for( ; i>=0; i--){
	    if( tabs[i].id ){
		tmp.push( tabs[i].id );
	    }
	}
	NicoLiveDatabase.saveGPStorage("nico_live_tab_position", tmp );
    },
    checkDrag:function(event){
	let b = event.dataTransfer.types.contains("application/x-moz-node");
	if( b ){
	    event.preventDefault();
	}
	return true;
    }
};
