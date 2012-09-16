function AcceptFunction(){
    var texts = document.getElementsByTagName('textbox');
    var i,txt,str="";
    let item = new Object();
    item.value = new Array();
    for(i=0;txt=texts[i];i++){
	if(txt.value){
	    var tmp = txt.value.replace(/"/g,"");
	    str += '"'+tmp+'" '
	}
	item.value.push( texts[i].value );
    }
    //Application.console.log(str);
    opener.NicoLiveHelper.postCasterComment("/vote start "+str,"");

    VoteDialog.recent.unshift( item );
    if( VoteDialog.recent.length>10 ){
	VoteDialog.recent.pop();
    }
    return true;
}

var NicoLiveDatabase = window.opener.NicoLiveDatabase;

var VoteDialog = {
    recent: [],

    //NicoLiveDatabase.saveGPStorage("nico_live_requestlist"+this.request_setno,this.requestqueue);
    //this.stock        = NicoLiveDatabase.loadGPStorage("nico_live_stock"+this.stock_setno,[]);

    restore:function(i){
	let item = this.recent[i];
	let texts = document.getElementsByTagName('textbox');
	let txt;
	for(i=0;txt=texts[i];i++){
	    txt.value = item.value[i] || "";
	}
    },

    init:function(){

	this.recent = NicoLiveDatabase.loadGPStorage("nico_live_recent_enquete",[]);

	for( let i=0,item; item=this.recent[i]; i++ ){
	    let menuitem = CreateMenuItem( item.value[0], i );
	    $('menu-recent').appendChild(menuitem);
	}

    },
    destroy:function(){
	NicoLiveDatabase.saveGPStorage("nico_live_recent_enquete", this.recent);
    }
};


window.addEventListener("load", function(e){ VoteDialog.init(); }, false);
window.addEventListener("unload", function(e){ VoteDialog.destroy(); }, false);
