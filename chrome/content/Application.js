// FUELのないXULRunner用に

var Application = {
    console:{
	log: function(str){
	    Components.classes['@mozilla.org/consoleservice;1']
		.getService(Components.interfaces.nsIConsoleService)
		.logStringMessage(str);
	}
    },
    storage:{
	data:{},
	get: function(k,defvalue){
	    if( this.data[k] ){
		return this.data[k];
	    }
	    return defvalue;
	},
	set: function(k,v){
	    this.data[k] = v;
	}
    }
};
