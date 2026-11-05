const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { version } = require('../package.json');

const repo = process.env.GITHUB_REPOSITORY;
const sourceRunId = process.env.BAY_SOURCE_RUN;
const releaseId = process.env.BAY_DRAFT_RELEASE_ID;
const tag = `v${version}`;
const isMac = process.platform === 'darwin';
const folder = path.resolve(isMac ? 'release/macos' : 'release/beta');
const baseName = `BayChicken-Beta-${version}`;
const expectedFiles = isMac
  ? ['dmg', 'zip'].map(ext => `${baseName}-mac-${process.arch}.${ext}`)
  : [`${baseName}-x64.exe`];

function getResource(endpoint) {
  return JSON.parse(execFileSync('gh', ['api', `repos/${repo}/${endpoint}`], { encoding: 'utf8' }));
}

function getDraft(sourceCommit) {
  const draft = getResource(`releases/${releaseId}`);
  assert.equal(draft.draft, true, 'Uploads require an unpublished release');
  assert.equal(draft.tag_name, tag);
  assert.equal(draft.target_commitish, sourceCommit);
  return draft;
}

async function main() {
  assert.match(repo || '', /^[\w.-]+\/[\w.-]+$/);
  assert.match(sourceRunId || '', /^\d+$/);
  assert.match(releaseId || '', /^\d+$/);
  const sourceRun = getResource(`actions/runs/${sourceRunId}`);
  assert.equal(sourceRun.conclusion, 'success');
  getDraft(sourceRun.head_sha);

  const checksumFile = path.join(folder, `SHA256SUMS-${process.platform}-${process.arch}.txt`);
  const checksums = new Map();
  for (const line of (await fs.readFile(checksumFile, 'utf8')).trim().split(/\r?\n/)) {
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    assert.ok(match && expectedFiles.includes(match[2]) && !checksums.has(match[2]), 'Unexpected checksum entry');
    checksums.set(match[2], match[1]);
  }
  assert.equal(checksums.size, expectedFiles.length);

  for (const [name, hash] of checksums) {
    const file = path.join(folder, name);
    const bytes = await fs.readFile(file);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), hash);
    let asset = getDraft(sourceRun.head_sha).assets.find(item => item.name === name);
    if (!asset) {
      execFileSync('gh', ['release', 'upload', tag, file, '--repo', repo], { stdio: 'inherit' });
      asset = getDraft(sourceRun.head_sha).assets.find(item => item.name === name);
    }
    assert.ok(asset, `Missing release asset ${name}`);
    assert.equal(asset.size, bytes.length);
    assert.equal(asset.digest, `sha256:${hash}`);
    console.log(`Verified draft asset ${name} ${hash}`);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
