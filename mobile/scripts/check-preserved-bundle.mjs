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
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
console.log('PASS: changed/missing/escaped assets are rejected; extra storage assets are allowed.');
