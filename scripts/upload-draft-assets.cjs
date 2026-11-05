// Upload only to the owner's existing draft. This script cannot publish a release.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const repo='MikeJack302/bay-chicken-desktop',releaseId='434759792',tag='v0.8.0-beta.2';
const gh=args=>execFileSync('gh',args,{encoding:'utf8'});
const api=p=>JSON.parse(gh(['api',`repos/${repo}/${p}`]));
const guard=source=>{const r=api('releases/'+releaseId);assert.equal(r.draft,true,'Refuse to touch a published release');assert.equal(r.tag_name,tag);assert.equal(r.target_commitish,source);return r;};
(async()=>{
  assert.match(process.env.BAY_SOURCE_RUN||'',/^\d+$/);const sourceRun=api('actions/runs/'+process.env.BAY_SOURCE_RUN);assert.equal(sourceRun.conclusion,'success');
  const folder=path.resolve(process.platform==='darwin'?'release/macos':'release/beta');
  const names=await fs.readdir(folder),sumFile=names.find(n=>n.startsWith('SHA256SUMS-'));assert.ok(sumFile);
  const files=[];
  for(const line of (await fs.readFile(path.join(folder,sumFile),'utf8')).trim().split('\n')){
    const m=line.trim().match(/^([a-f0-9]{64})  (BayChicken-Beta-0\.8\.0-beta\.2[^\\/]*\.(?:dmg|zip|exe))$/);assert.ok(m);
    const file=path.join(folder,m[2]),bytes=await fs.readFile(file);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),m[1]);files.push({name:m[2],file,hash:m[1],size:bytes.length});
  }
  const sumBytes=await fs.readFile(path.join(folder,sumFile));files.push({name:sumFile,file:path.join(folder,sumFile),hash:crypto.createHash('sha256').update(sumBytes).digest('hex'),size:sumBytes.length});
  for(const file of files){
    const release=guard(sourceRun.head_sha),existing=release.assets.find(a=>a.name===file.name);
    if(existing){assert.equal(existing.digest,'sha256:'+file.hash);assert.equal(existing.size,file.size);continue;}
    execFileSync('gh',['release','upload',tag,file.file,'--repo',repo],{stdio:'inherit'});
    const asset=guard(sourceRun.head_sha).assets.find(a=>a.name===file.name);assert.ok(asset);assert.equal(asset.size,file.size);assert.equal(asset.digest,'sha256:'+file.hash);
    console.log(JSON.stringify({uploaded:file.name,sha256:file.hash,draft:true}));
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
