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
/**
 * Simple Bayesian Classifier
 */

var NicoLiveClassifier = {
    // javascript Objectに含まれる要素の数.
    // 登録語数を数えるのに使用.
    numberOfObjects:function(obj){
	let c=0;
	for( a in obj ) c++;
	return c;
    },

    // 指定バケツに出現した語の総数.
    getNumberOfTerms:function(label){
	let bucket;
	try{
	    bucket = this.data.bucket[label];
	} catch (x) {
	    return 0;
	}
	let c = 0;
	for each( a in bucket.tf ){
	    c += a;
	}
	return c;
    },

    // 学習.
    // terms : 学習させる語の配列
    // label : クラス
    train:function(terms,label){
	if( !this.data.df ) this.data.df = new Object();
	if( !this.data.df[label] ) this.data.df[label] = 0;
	this.data.df[label]++;

	if( !this.data.bucket[label] ){
	    this.data.bucket[label] = new Object();
	    this.data.bucket[label].tf = new Object();
	}
	let bucket = this.data.bucket[label];

	// term frequency of label.
	let term,i;
	for(i=0;term=terms[i];i++){
	    if( !bucket.tf[term] ) bucket.tf[term]=0;
	    bucket.tf[term]++;
	    this.data.allterms[term] = 1;
	}

	this.calcLikelihoodOfTerm();
    },

    // 語の尤度.
    calcLikelihoodOfTerm:function(){
	let n = this.numberOfObjects( this.data.allterms );

	for (word in this.data.allterms) {
	    for( label in this.data.bucket ){
		let bucket = this.data.bucket[label];
		let tmp = 1;
		if ( bucket.tf[word] ) tmp += bucket.tf[word];
		let tmp_total = n;
		tmp_total += this.getNumberOfTerms(label);
		if( !bucket.likelihood ) bucket.likelihood = new Object();
		bucket.likelihood[word] = (tmp / tmp_total);
	    }
	}
    },

    calcLikelihoodOfClass:function(terms){
	for(label in this.data.bucket){
	    let tmp_likelihood = 1;
	    for(let i=0,term;term=terms[i]; i++){
		if (this.data.allterms[term]) {
		    tmp_likelihood *= this.data.bucket[label].likelihood[term];
		}
	    }
	    this.data.likelihood[label] = tmp_likelihood;
	}
    },

    // posterior probability.
    getPosterior:function(terms){
	this.calcLikelihoodOfClass(terms);
	let evi=0;
	let l;
	for( l in this.data.bucket ){
	    evi += this.getPrior(l) * this.data.likelihood[l];
	}
	// Calculate posterior
	let result = new Array();
	for( l in this.data.bucket ){
	    let post = this.getPrior(l) * this.data.likelihood[l] / evi;
	    result.push( {"bucket":l, "post":post} );
	}
	return result;
    },

    // prior probability.
    getPrior:function(label){
	let n = 0;
	for( cls in this.data.df ){
	    n += this.data.df[cls];
	}
	return (n!=0 && this.data.df[label])? this.data.df[label] / n : 0;
    },

    classify:function(terms){
	let result = this.getPosterior(terms);
	let cls;

	if( result.length <= 1 ){
	    cls = 'undefined';
	}else{
	    result.sort( function(a,b){
			     return b.post - a.post;
			 });
	    if( (result[0].post - result[1].post)<0.2 ){
		cls = 'undefined';
	    }else{
		cls = result[0].bucket;
	    }
	}
	for(let i=0;i<result.length;i++){
	    result[result[i].bucket] = result[i].post;
	}
	this.latestresult = {"class":cls, "posterior": result };
	return this.latestresult;
    },

    // 学習内容をクリアする.
    create:function(){
	debugprint("create new learning dictionary.");
	this.data = new Object();
	this.data.likelihood = new Object();
	this.data.allterms = new Object();
	this.data.bucket = new Object();
    },

    init:function(){
	this.data = NicoLiveDatabase.loadGPStorage("nico_live_classifier",null);
	if( this.data==null ){
	    this.create();
	}
    },
    destroy:function(){	
	NicoLiveDatabase.saveGPStorage("nico_live_classifier",this.data);
    },

    forget:function(){
	if(ConfirmPrompt(LoadString('STR_CLASS_WARN_INITIALIZE'),LoadString('STR_CLASS_WARN_INIT_TITLE'))){
	    debugprint('forget larning data.');
	    this.create();
	}else{
	}
    }
};

window.addEventListener("load", function(e){ NicoLiveClassifier.init(); }, false);
window.addEventListener("unload", function(e){ NicoLiveClassifier.destroy(); }, false);
