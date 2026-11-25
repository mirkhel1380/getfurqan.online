import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { verifyPreservedBundle } from './verify-preserved-bundle.mjs';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'furqan-preservation-'));
try {
  const bundle = path.join(root, 'bundle');
  await fs.mkdir(bundle);
  const original = Buffer.from('Existing reader and source selection');
  await fs.writeFile(path.join(bundle, 'reader.js'), original);
  const baseline = path.join(root, 'baseline.json');
  await fs.writeFile(baseline, JSON.stringify({ schema: 1, files: { 'reader.js': createHash('sha256').update(original).digest('hex') } }));
  assert.equal(await verifyPreservedBundle(bundle, baseline), 1);
  await fs.writeFile(path.join(bundle, 'new-storage-asset.json'), '{}');
  assert.equal(await verifyPreservedBundle(bundle, baseline), 1, 'New storage files do not rewrite the checkpoint');
  await fs.writeFile(path.join(bundle, 'reader.js'), 'Changed source selection');
  await assert.rejects(verifyPreservedBundle(bundle, baseline), /reader\.js/);
  await fs.rm(path.join(bundle, 'reader.js'));
  await assert.rejects(verifyPreservedBundle(bundle, baseline), /reader\.js/);
  await fs.symlink(baseline, path.join(bundle, 'reader.js'));
  await assert.rejects(verifyPreservedBundle(bundle, baseline), /reader\.js/);
  await fs.rm(path.join(bundle, 'reader.js'));
  await fs.writeFile(path.join(bundle, 'reader.js'), original);
  const html = '<html><head></head><body><button>Read</button><button>Next</button></body></html>';
  const hook = '<script src="/app-installed-hadith.js"></script>';
  await fs.writeFile(baseline, JSON.stringify({schema:1, files:{
    'reader.js':createHash('sha256').update(original).digest('hex'),
    'hadith.html':createHash('sha256').update(html).digest('hex')
  }}));
  const page = path.join(bundle, 'hadith.html');
  await fs.writeFile(page, html.replace('<head>', '<head>' + hook));
  assert.equal(await verifyPreservedBundle(bundle, baseline), 2, 'Only the reviewed transport hook is normalized');
  for (const changed of [
    html.replace('Read', 'Changed'),
    html.replace('<head>', '<head>' + hook + '<script src="https://example.com/other.js"></script>'),
    html.replace('<head>', '<head>' + hook + hook),
    html.replace('<button>Read</button><button>Next</button>', '<button>Next</button><button>Read</button>')
  ]) {
    await fs.writeFile(page, changed);
    await assert.rejects(verifyPreservedBundle(bundle, baseline), /hadith\.html/);
  }
  const androidHook='<script src="/app-installed-quranenc.js"></script>';
  const pages=['reader.html','study.html','other.html'];
  await fs.writeFile(baseline,JSON.stringify({schema:1,files:Object.fromEntries(pages.map(name=>[name,createHash('sha256').update(html).digest('hex')]))}));
  for(const name of pages)await fs.writeFile(path.join(bundle,name),html.replace('<head>','<head>'+(name==='other.html'?'':androidHook)));
  assert.equal(await verifyPreservedBundle(bundle,baseline),3);
  await fs.writeFile(path.join(bundle,'other.html'),html.replace('<head>','<head>'+androidHook));
  await assert.rejects(verifyPreservedBundle(bundle,baseline),/other\.html/);
  await fs.writeFile(path.join(bundle,'other.html'),html);
  for(const name of ['reader.html','study.html']){
    await fs.writeFile(path.join(bundle,name),html.replace('<head>','<head>'+androidHook).replace('Read','Changed'));
    await assert.rejects(verifyPreservedBundle(bundle,baseline),new RegExp(name.replace('.','\\.')));
    await fs.writeFile(path.join(bundle,name),html.replace('<head>','<head>'+androidHook));
  }
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
console.log('PASS: changed/missing/escaped assets are rejected; extra storage assets are allowed.');
