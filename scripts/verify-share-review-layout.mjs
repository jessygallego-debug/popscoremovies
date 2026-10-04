import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { chromium } from '@playwright/test';
const read = p => fs.readFileSync(p, 'utf8');
const compile = source => ts.transpileModule(source.replace(/^import .*;\r?\n/gm, '').replace(/export /g, ''), {compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.None}}).outputText;
const renderer = compile(read('lib/popscore-presentation.ts')) + compile(read('lib/logo-reel.ts')) + compile(read('lib/rating-share-image.ts'));
const assets = Object.fromEntries(['extra-buttery-v2.png','buttery.png','fresh-popcorn.png','salty.png','burnt.png'].map(name => ['/rating-icons/'+name, 'data:image/png;base64,'+fs.readFileSync('public/rating-icons/'+name).toString('base64')]));
const browser = await chromium.launch({headless:true});
try {
 const page = await browser.newPage();
 await page.setContent('<html><body style="margin:0"></body></html>');
 await page.evaluate(({renderer,assets}) => {
   window.assets=assets;
   window.eval('const posterUrl = path => path;\n'+renderer+'\nwindow.renderShare=createRatingShareCanvas; window.toBlob=canvasToBlob;');
   const NativeImage=window.Image;
   window.Image=class extends NativeImage {set src(value){super.src=assets[value]??value;}};
 },{renderer,assets});
 for (const [index,score] of [0,7,40,60,75,89,90,100].entries()) {
  const result = await page.evaluate(async ({score,index}) => {
   const calls=[];
   const proto=CanvasRenderingContext2D.prototype;
   const originalText=proto.fillText, originalImage=proto.drawImage;
   proto.fillText=function(text,x,y,...rest){calls.push({type:'text',text,x,y,width:this.measureText(text).width,align:this.textAlign});return originalText.call(this,text,x,y,...rest);};
   proto.drawImage=function(image,x,y,w,h){calls.push({type:'image',x,y,w,h});return originalImage.call(this,image,x,y,w,h);};
   const poster='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="430" height="645"><rect width="430" height="645" fill="#28333b"/><circle cx="215" cy="270" r="140" fill="#994a38"/><text x="215" y="510" text-anchor="middle" fill="white" font-size="32">POSTER FIXTURE</text></svg>');
   const canvas=await window.renderShare({movieId:'fixture',movieTitle:index===0?'Up':index===7?'A Very Long Movie Title: An Extraordinary Adventure Across the World and Beyond the Stars with an Unexpected Return Home':'Chainsaw Man - The Movie: Reze Arc',popscore:score,posterPath:poster,releaseDate:'2025-01-01',genreNames:index===7?['Animation','Action','Romance','Fantasy','Adventure','Science Fiction','Family','Mystery']:['Animation','Action','Romance','Fantasy']});
   proto.fillText=originalText;proto.drawImage=originalImage;
   document.body.replaceChildren(canvas);canvas.style.width='360px';canvas.style.height='auto';
   const blob=await window.toBlob(canvas);
   return {calls,png:canvas.toDataURL(),blobType:blob.type,blobSize:blob.size};
  },{score,index});
  const label=result.calls.find(c=>c.text==='MY POPSCORE');
  const number=result.calls.find(c=>c.text===String(score));
  const suffix=result.calls.find(c=>c.text==='/100');
  const bucket=result.calls.filter(c=>c.type==='image').at(-1);
  assert.equal(label.x,780);
  assert.ok(Math.abs((number.x+suffix.x+suffix.width)/2-label.x)<0.01);
  assert.ok(Math.abs(bucket.x+bucket.w/2-label.x)<0.01);
  assert.ok(result.calls.filter(c=>c.type==='text').every(c=>c.y<1920));
  assert.equal(result.blobType,'image/png'); assert.ok(result.blobSize>1000);
  fs.mkdirSync('artifacts/share-review-refinement',{recursive:true});
  fs.writeFileSync(`artifacts/share-review-refinement/score-${score}.png`,Buffer.from(result.png.split(',')[1],'base64'));
  console.log(`PASS score ${score}: shared center, title/metadata fit, PNG export`);
 }
} finally {await browser.close();}
