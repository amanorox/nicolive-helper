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
	get: function(k,defvalue){
	    return defvalue;
	},
	set: function(k,v){
	}
    }
};
