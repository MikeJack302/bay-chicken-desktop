// Isolated test bootstrap: seed the exact temp profile that --smoke will use.
const{app}=require('electron'),fs=require('node:fs'),path=require('node:path');
const arg=name=>process.argv.find(a=>a.startsWith(name+'='))?.slice(name.length+1);
const target=path.join(app.getPath('temp'),'bay-chicken-smoke-'+process.pid);
fs.mkdirSync(target,{recursive:true});fs.copyFileSync(arg('--seed'),path.join(target,'companion.json'));
require(arg('--entry'));
