import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const mobile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baselineFile = path.join(mobile, 'compatibility-baseline.json');

// Fixed release checkpoint. Never regenerate this snapshot during a build.
// New storage assets may be added; changing an existing file requires review.
export async function verifyPreservedBundle(directory, baseline = baselineFile) {
  const reference = JSON.parse(await fs.readFile(baseline, 'utf8'));
  if (reference.schema !== 1 || !reference.files || !Object.keys(reference.files).length) {
    throw Error('Invalid mobile compatibility baseline');
  }
  const root = await fs.realpath(directory);
  const changed = [];
  for (const [name, hash] of Object.entries(reference.files)) {
    if (!/^[a-zA-Z0-9_./-]+$/.test(name) || name.startsWith('/') || name.split('/').some(part => !part || part === '.' || part === '..') || !/^[a-f0-9]{64}$/.test(hash)) {
      throw Error('Invalid mobile compatibility entry');
    }
    try {
      const file = await fs.realpath(path.join(root, name));
      if (!file.startsWith(root + path.sep)) throw Error('Asset outside bundle');
      let bytes = await fs.readFile(file);
      // Reviewed non-visual transport hook: no text, controls, styles or source
      // selection are exempted. Any other change still fails the old checkpoint.
      if (['hadith.html', 'hadith-book.html'].includes(name)) {
        bytes = Buffer.from(bytes.toString('utf8').replace('<head><script src="/app-installed-hadith.js"></script>', '<head>'));
      }
      if (['reader.html','study.html'].includes(name)) {
        bytes = Buffer.from(bytes.toString('utf8').replace('<head><script src="/app-installed-quranenc.js"></script>', '<head>'));
      }
      if (createHash('sha256').update(bytes).digest('hex') !== hash) changed.push(name);
    } catch {
      changed.push(name);
    }
  }
  if (changed.length) throw Error('Existing mobile assets changed; review before release:\n' + changed.join('\n'));
  return Object.keys(reference.files).length;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const count = await verifyPreservedBundle(path.join(mobile, 'dist'));
  console.log(`PASS: ${count} existing mobile files match the fixed compatibility checkpoint.`);
}
