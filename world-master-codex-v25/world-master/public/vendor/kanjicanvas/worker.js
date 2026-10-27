'use strict';
self.window=self;
self.document={addEventListener(){}};
importScripts('kanji-canvas.js','ref-patterns.js');
self.onmessage=e=>{const {id,strokes}=e.data;try{if(!Array.isArray(strokes)||!strokes.length||strokes.length>40)throw Error('1文字を40画以内で書いてください。');KanjiCanvas.recordedPattern_input=strokes.map(s=>s.map(([x,y])=>[x/320*256,y/260*256]));const n=KanjiCanvas.momentNormalize('input'),f=KanjiCanvas.extractFeatures(n,20),c=KanjiCanvas.coarseClassification(f),text=KanjiCanvas.fineClassification(f,c);postMessage({id,text})}catch(err){postMessage({id,error:err.message||'認識できませんでした。'})}};
postMessage({ready:true,characters:new Set(KanjiCanvas.refPatterns.map(x=>x[0])).size});
