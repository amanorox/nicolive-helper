
function Init(){
    var l = window.opener.NicoLiveAlertModule.alert_target;
    for( k in l ){
	$('manage-community').appendItem(k,k);
    }
}

function Delete(){
    var item = $('manage-community').selectedItem;
    if( item ){
	window.opener.NicoLiveAlertModule.unregisterTarget(item.value);
	RemoveElement(item);
	window.opener.NicoLiveHelper.setAutoNextLiveIcon();
    }
}

function OnKeyDown(event){
    switch( event.keyCode ){
    case 27: // ESC
	window.close();
	break;
    case 46: // DEL
	Delete();
	break;
    default:
	return false;
    }
    return true;
}


window.addEventListener("load", function(e){ Init(); }, false);
