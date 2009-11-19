// do not define the same version twice
if(typeof(PrefsWrapper1) != "function") {
    function PrefsWrapper1(aRoot)
    {
	const CI = Components.interfaces;
	this.prefSvc = Components.classes["@mozilla.org/preferences-service;1"]
            .getService(CI.nsIPrefService);
	this.prefSvc.QueryInterface(CI.nsIPrefBranch);
	this.branch = this.prefSvc.getBranch(aRoot);
	
	this.prefSvc.QueryInterface(CI.nsIPrefBranchInternal);
	this.branch.QueryInterface(CI.nsIPrefBranchInternal);
	
	// "inherit" from nsIPrefBranch, re-assembling __proto__ chain as follows:
	//    this, nsIPrefBranch, PrefsWrapper1.prototype, Object.prototype
	this.branch.__proto__ = PrefsWrapper1.prototype;
	this.__proto__ = this.branch;
	
	// Create "get*PrefDef" methods, which return specified default value
	// when an exception occurs - similar to nsPreferences.
	if(!("getIntPrefDef" in PrefsWrapper1.prototype)) {
	    var types = ["Int", "Char", "Bool", "Unichar", "File"];
	    for(var i in types) {
		PrefsWrapper1.prototype["get" + types[i] + "PrefDef"] = new Function(
		    "aPrefName", "aDefValue",
		    "try { return this.get" + types[i] + "Pref(aPrefName);\n" + 
			"} catch(e) {} return aDefValue;");
	    }
	}
    }
    
    PrefsWrapper1.prototype = {
	getSubBranch: function(aSubpath) {
	    return new PrefsWrapper1(this.branch.root + aSubpath);
	},
	
	// unicode strings
	getUnicharPref: function(aPrefName) {
	    return this.branch.getComplexValue(aPrefName, 
					       Components.interfaces.nsISupportsString).data;
	},
	setUnicharPref: function(aPrefName, aValue) {
	    var str = Components.classes["@mozilla.org/supports-string;1"]
		.createInstance(Components.interfaces.nsISupportsString);
	    str.data = aValue;
	    this.branch.setComplexValue(aPrefName, 
					Components.interfaces.nsISupportsString, str);
	},
	
	// for strings with default value stored in locale's .properties file
	getLocalizedUnicharPref: function(aPrefName) {
	    return this.branch.getComplexValue(aPrefName,
					       Components.interfaces.nsIPrefLocalizedString).data;
	},
	
	// store nsILocalFile in prefs
	setFilePref: function(aPrefName, aValue) {
	    this.branch.setComplexValue(aPrefName, Components.interfaces.nsILocalFile, 
					aValue);
	},
	getFilePref: function(aPrefName) {
	    return this.branch.getComplexValue(aPrefName, 
					       Components.interfaces.nsILocalFile);
	},
	
	// aRelTo - relative to what directory (f.e. "ProfD")
	setRelFilePref: function(aPrefName, aValue, aRelTo) {
	    var relFile = Components.classes["@mozilla.org/pref-relativefile;1"]
		.createInstance(Components.interfaces.nsIRelativeFilePref);
	    relFile.relativeToKey = aRelTo;
	    relFile.file = aValue;
	    this.branch.setComplexValue(aPrefName, 
					Components.interfaces.nsIRelativeFilePref, relFile);
	},
	getRelFilePref: function(aPrefName) {
	    return this.branch.getComplexValue(aPrefName, 
					       Components.interfaces.nsIRelativeFilePref).file;
	},
	
	// don't throw an exception if the pref doesn't have a user value
	clearUserPrefSafe: function(aPrefName) {
	    try {
		this.branch.clearUserPref(aPrefName);
	    } catch(e) {}
	}
    }
}
