// Portable, source-only old Service Worker fixtures. Never reads production data.
const fs=require('node:fs'),path=require('node:path');
exports.readHistoricalFile=(commit,file)=>{
 if(!['b2b797d4b12fa0425755ab081fde50c213ae857a','2c6a47f3aecd1fd243d79010a61cef637ffa6c5f'].includes(commit)||!file.startsWith('public/')||file.includes('..'))throw Error('Unknown historical source fixture');
 return fs.readFileSync(path.join(__dirname,'../test-fixtures/historical',commit,file));
};
