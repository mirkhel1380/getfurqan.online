import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const mobile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

export async function installHadith(source, out) {
  const lock = JSON.parse(await fs.readFile(path.join(mobile, 'installed-hadith-lock.json'), 'utf8'));
  const catalog = JSON.parse(await fs.readFile(path.join(source, 'content/hadith/catalog.json'), 'utf8'));
  const expected = catalog.collections.flatMap(col => col.editions.map(edition => edition.name)).sort();
  if (lock.revision !== catalog.revision || lock.files.length !== 64 || JSON.stringify(lock.files.map(row => row.edition).sort()) !== JSON.stringify(expected)) throw Error('Installed hadith editions differ from existing selections');
  const adapter = await fs.readFile(path.join(source, 'hadith-data.mjs'), 'utf8');
  if (!adapter.includes(`REVISION='${lock.revision}'`)) throw Error('Hadith adapter source revision changed');
  const cache = path.join(mobile, '.cache/installed-hadith');
  const target = path.join(out, 'installed-hadith');
  await fs.mkdir(cache, { recursive: true });
  await fs.mkdir(target, { recursive: true });
  let next = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (next < lock.files.length) {
      const entry = lock.files[next++];
      if (!/^[a-z]{3}-[a-z]+\d?$/.test(entry.edition) || entry.file !== entry.edition + '.json' || !/^[a-f0-9]{64}$/.test(entry.sha256) || !Number.isSafeInteger(entry.bytes) || entry.bytes < 1 || entry.bytes > 40 * 1024 * 1024) throw Error('Invalid installed hadith lock');
      const cached = path.join(cache, entry.file);
      let bytes = await fs.readFile(cached).catch(() => null);
      if (!bytes || bytes.length !== entry.bytes || hash(bytes) !== entry.sha256) {
        const url = `https://raw.githubusercontent.com/fawazahmed0/hadith-api/${lock.revision}/editions/${entry.file}`;
        const response = await fetch(url, { signal: AbortSignal.timeout(90000), credentials: 'omit', redirect: 'error' });
        if (!response.ok || Number(response.headers.get('content-length')) > entry.bytes) throw Error('Build source unavailable: ' + entry.edition);
        // The immutable source is small enough for a bounded per-edition buffer.
        const reader = response.body.getReader(); const chunks = []; let length = 0;
        try {
          for (;;) { const { value, done } = await reader.read(); if (done) break; length += value.length; if (length > entry.bytes) throw Error('Oversized source'); chunks.push(value); }
        } catch (error) { await reader.cancel(); throw error; }
        bytes = Buffer.concat(chunks);
        if (bytes.length !== entry.bytes || hash(bytes) !== entry.sha256) throw Error('Build source checksum mismatch: ' + entry.edition);
        await fs.writeFile(cached, bytes);
      }
      const body = JSON.parse(bytes.toString('utf8'));
      if (!Array.isArray(body.hadiths) || body.hadiths.length !== entry.records) throw Error('Incomplete hadith source: ' + entry.edition);
      const collection = catalog.collections.find(row => row.id === entry.collection);
      const field = entry.language === 'Arabic' ? 'arabic' : entry.language === 'English' ? 'english' : null;
      if (!collection || (field && collection.hashes[field] !== entry.sha256)) throw Error('Existing source inventory mismatch');
      await fs.writeFile(path.join(target, entry.file), bytes);
    }
  }));
  await fs.copyFile(path.join(mobile, 'installed-hadith-lock.json'), path.join(target, 'manifest.json'));
  console.log(`Included ${lock.files.length} unchanged hadith editions in the install (${lock.files.reduce((n, row) => n + row.bytes, 0)} bytes).`);
  return lock;
}
