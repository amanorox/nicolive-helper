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

var NicoLiveWorldsNews = {
    playtime:function(){
	return $('nicolive-worlds-playtime').value;
    },

    prepareAnq:function(){
	clearInterval(this._playtimer);
	NicoLiveHelper.postCasterComment("/perm 5 秒後に『延長アンケート』を開始します","hidden","世界の新着(風)");
	this._anqtimer = setInterval( function(){ NicoLiveWorldsNews.beginAnq(); }, 5000 );
    },

    beginAnq:function(){
	clearInterval(this._anqtimer);
	this._voteyes = 0;
	this._voteno = 0;
	NicoLiveHelper.postCasterComment("/vote start \"『延長アンケート』<br>引き続きこの動画を視聴しますか？(過半の支持で延長)\" \"はい\" \"いいえ\"","世界の新着(風)");
	// 20秒表示 + 5秒カウントダウン + 5秒結果表示
	this._begincountdown = setInterval(function(){ NicoLiveWorldsNews.beginCountDown(); }, 20*1000 );
    },

    beginCountDown:function(){
	clearInterval(this._begincountdown);
	NicoLiveHelper.postCasterComment("/perm 『延長アンケート』( 5 秒後に締め切り)<br>引き続きこの動画を視聴しますか？(過半の支持で延長)","hidden");
	this._countdown = setInterval( function(){ NicoLiveWorldsNews.endVote(); }, 5000 );
    },

    endVote:function(){
	clearInterval(this._countdown);
	NicoLiveHelper.postCasterComment("/vote showresult text_per","");
	this._checkvote = setInterval( function(){ NicoLiveWorldsNews.checkVote(); }, 5000 );
    },

    checkVote:function(){
	clearInterval(this._checkvote);
	debugprint("yes:"+this._voteyes+"/no:"+this._voteno);
	NicoLiveHelper.postCasterComment("/vote stop","");
	if( this._voteyes >= this._voteno ){
	    debugprint("延長あり");
	    // 延長あり.
	    let play = this.playtime();
	    this._playtimer = setInterval( function(){
					       NicoLiveWorldsNews.prepareAnq();
					   }, (play-5)*1000 );
	}else{
	    // 延長なし.
	    debugprint("延長なし");
	    NicoLiveHelper.postCasterComment("/stop","");
	    let timerid = setInterval(function(){
					  NicoLiveHelper.postCasterComment("/perm 再生を終了しました","hidden","世界の新着(風)");
					  clearInterval(timerid);
				      }, 3000 );
	    this._playnext = setInterval( function(){ NicoLiveWorldsNews.playNext(); }, 10*1000 );
	}
    },

    playNext:function(){
	clearInterval(this._playnext);
	if( this._do ){
	    let play = this.playtime();
	    if(play<10) play=10;
	    NicoLiveHelper.playNext();
	    this._playtimer = setInterval( function(){
					       NicoLiveWorldsNews.prepareAnq();
					   }, (play-5)*1000 );
	}
    },

    begin:function(){
	this._do = true;
	let play = this.playtime();
	if(play<10) play=10;
	NicoLiveHelper.playNext();
	this._playtimer = setInterval( function(){
					   NicoLiveWorldsNews.prepareAnq();
				       }, (play-5)*1000 );
	debugprint("世界の新着の進行開始");
	NicoLiveHelper.setPlayStyle(0);
    },
    stop:function(){
	this._do = false;
	debugprint("世界の新着の進行停止");
    },

    newProcessComment:function(xmlchat){
	NicoLiveWorldsNews.oldprocesscomment(xmlchat);

	let chat = NicoLiveHelper.extractComment(xmlchat);
	let dat = chat.text.match(/^\/vote\s+showresult\s+(.*)/);
	if(dat){
	    let str = dat[1];
	    let result = str.match(/\d+/g);
	    if(result.length>=2){
		this._voteyes = result[0];
		this._voteno = result[1];
	    }
	}
    },

    observer:function(){
	if( this._do ){
	    if( NicoLiveHelper.musicinfo.video_id ){
		let now = GetCurrentTime();
		if( NicoLiveHelper.musicendtime>0 && now>NicoLiveHelper.musicendtime ){
		    // 完走.
		    debugprint("世界の新着完走");
		    clearInterval(this._anqtimer);
		    clearInterval(this._begincountdown);
		    clearInterval(this._countdown);
		    clearInterval(this._checkvote);
		    clearInterval(this._playtimer);
		    clearInterval(this._playnext);
		    NicoLiveHelper.musicendtime = 0;
		    
		    NicoLiveHelper.postCasterComment("/vote stop","");
		    NicoLiveHelper.postCasterComment("/perm 再生を終了しました","hidden","世界の新着(風)");
		    this._playnext = setInterval( function(){ NicoLiveWorldsNews.playNext(); }, 10*1000 );
		}
	    }
	}
    },

    init:function(){
	debugprint('世界の新着 init.');
	this.oldprocesscomment = NicoLiveHelper.processComment;
	NicoLiveHelper.processComment = function(xmlchat){
	    NicoLiveWorldsNews.newProcessComment(xmlchat);
	};
	this._observer = setInterval(function(){ NicoLiveWorldsNews.observer();}, 1000 );
    },
    destroy:function(){
	clearInterval(this._observer);
    }
};

window.addEventListener("load", function(e){ NicoLiveWorldsNews.init(); }, false);
window.addEventListener("unload", function(e){ NicoLiveWorldsNews.destroy(); }, false);
