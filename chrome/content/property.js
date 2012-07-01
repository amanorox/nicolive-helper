
var Property = {
    vinfo: {},

    accept: function(){
	let newstr = $('additional_info').value;
	if( newstr != this.old_additional_info ){
	    window.opener.NicoLiveDatabase.setAdditional(this.vinfo.video_id,newstr);
	}
	return true;
    },

    checkSelection:function(){
	let str = window.getSelection().toString();
	if( str ){
	    $('menu-copy').disabled = false;
	}else{
	    $('menu-copy').disabled = true;
	}
    },

    copyToClipboard:function(){
	let str = window.getSelection().toString();
	CopyToClipboard(str);
    },

    init: function(){
	this.vinfo = window.arguments[0].vinfo;
	document.title = this.vinfo.video_id + "'s Property";

	$('video_thumbnail').src = this.vinfo.thumbnail_url;
	$('video_id').value = this.vinfo.video_id;
	$('video_type').value = this.vinfo.movie_type;
	$('video_title').innerHTML = htmlspecialchars(this.vinfo.title);
	$('video_date').value = GetDateString(this.vinfo.first_retrieve*1000);
	$('video_views').value = FormatCommas(this.vinfo.view_counter);
	$('video_comments').value = FormatCommas(this.vinfo.comment_num);
	$('video_mylist_counter').value = FormatCommas(this.vinfo.mylist_counter);
	$('video_length').value = this.vinfo.length;
	$('video_highbitrate').innerHTML = this.vinfo.highbitrate + " kbps";
	$('video_description').innerHTML = htmlspecialchars(this.vinfo.description);

	this.old_additional_info = window.opener.NicoLiveDatabase.getAdditional( this.vinfo.video_id );
	$('additional_info').value = this.old_additional_info;

	let text = "";
	text = "[jp]:"+ htmlspecialchars(this.vinfo.tags.join(', ')) +"<html:br/>";
	for(domain in this.vinfo.overseastags2){
	    text += "["+domain+"]:"+ htmlspecialchars(this.vinfo.overseastags2[domain].join(', '));
	    text += "<html:br/>";
	}
	$('video_tags').innerHTML = text;
    },
    destroy:function(){
    }
};



window.addEventListener("load", function(e){ Property.init(); }, false);
window.addEventListener("unload", function(e){ Property.destroy(); }, false);
