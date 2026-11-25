import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installedHadithFetch } from '../src/installed-hadith.mjs';

const mobile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(mobile, 'dist');
const lock = JSON.parse(await fs.readFile(path.join(mobile, 'installed-hadith-lock.json')));
const origin = 'capacitor://localhost';
let external = 0, local = 0;
const localOnly = async input => {
  const url = new URL(input);
  if (url.origin !== new URL(origin).origin || url.protocol !== 'capacitor:' || url.hostname !== 'localhost' || !/^\/installed-hadith\/[a-z]{3}-[a-z]+\d?\.json$/.test(url.pathname)) {
    external++; throw Error('Network disabled for this test');
  }
  local++;
  return new Response(await fs.readFile(path.join(out, url.pathname)));
};
const transport = installedHadithFetch({ fetch: localOnly, origin, lock });
const base = `https://raw.githubusercontent.com/fawazahmed0/hadith-api/${lock.revision}/editions/`;
let decimal = false, blank = false;
assert.equal(new Set(lock.files.map(row => row.collection)).size, 10);
assert.equal(new Set(lock.files.map(row => row.edition)).size, 64);
assert.deepEqual(JSON.parse(await fs.readFile(path.join(out, 'installed-hadith/manifest.json'))), lock);
for (const entry of lock.files) {
  const original = JSON.parse(await fs.readFile(path.join(out, 'installed-hadith', entry.file)));
  // Every edition is read from the installation while all external requests fail.
  for (const row of [original.hadiths[0], original.hadiths.at(-1)]) {
    const response = await transport(base + entry.edition + '/' + row.hadithnumber + '.json');
    assert.equal(response.status, 200, entry.edition);
    const actual = await response.json();
    assert.deepEqual(actual.hadiths, [row], entry.edition);
    assert.deepEqual(actual.metadata, original.metadata);
  }
  if (!decimal) {
    const row = original.hadiths.find(row => !Number.isInteger(Number(row.hadithnumber)));
    if (row) {
      assert.deepEqual((await (await transport(base + entry.edition + '/' + row.hadithnumber + '.json')).json()).hadiths, [row]);
      decimal = true;
    }
  }
  if (!blank) {
    const row = original.hadiths.find(row => !row.text.trim());
    if (row) {
      assert.deepEqual((await (await transport(base + entry.edition + '/' + row.hadithnumber + '.json')).json()).hadiths, [row]);
      blank = true;
    }
  }
  const book = original.hadiths[0].reference.book;
  const section = await (await transport(base + entry.edition + '/sections/' + book + '.json')).json();
  assert.deepEqual(section.hadiths, original.hadiths.filter(row => String(row.reference.book) === String(book)));
}
assert.ok(decimal && blank, 'Fractional numbering and source blanks must be retained');
// The unmodified application adapter must work on first use, including book lookup.
globalThis.fetch = transport;
const adapter = await import('../dist/hadith-data.mjs');
for (const edition of ['ara-bukhari', 'eng-bukhari', 'urd-muslim']) {
  const original = JSON.parse(await fs.readFile(path.join(out, 'installed-hadith', edition + '.json')));
  const row = original.hadiths.find(row => row.text.trim());
  const expected = [String(row.hadithnumber), null, String(row.reference.book), String(row.reference.hadith)];
  assert.deepEqual(await adapter.report(edition, expected), row);
  assert.deepEqual((await adapter.bookRecords(edition, expected[2], [expected])).get(expected[0]), row);
}
assert.equal(external, 0, 'Installed reading must never use the network');
const first = lock.files[0];
const firstURL = base + first.edition + '.json';
for (const kind of ['missing', 'corrupt']) {
  let attempts = 0;
  const broken = installedHadithFetch({ origin, lock, fetch: async url => {
    attempts++; assert.ok(String(url).startsWith(origin + '/installed-hadith/'));
    return kind === 'missing' ? new Response('', {status:404}) : new Response('damaged');
  }});
  assert.equal((await broken(firstURL)).status, 503);
  assert.equal(attempts, 1, 'Damaged installations must not silently download replacements');
}
const controller = new AbortController(); controller.abort();
await assert.rejects(transport(firstURL, {signal:controller.signal}), {name:'AbortError'});
const delegated = [];
const passthrough = installedHadithFetch({origin, lock, fetch:async (...args) => { delegated.push(args); return new Response('unchanged'); }});
for (const [url, init] of [
  ['https://api.quran.com/api/v4/chapters', {}],
  [firstURL.replace(lock.revision, '0'.repeat(40)), {}],
  [firstURL + '?version=other', {}],
  [firstURL, {method:'POST'}],
]) {
  assert.equal(await (await passthrough(url, init)).text(), 'unchanged');
  assert.deepEqual(delegated.at(-1), [url, init]);
}
const alternate = `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@${lock.revision}/editions/${first.edition}.json`;
assert.equal((await transport(new Request(alternate))).status, 200);
console.log(`PASS: all 64 installed editions, original reader/book adapter, fractional numbers, source blanks, integrity failures and request isolation (${local} local reads; zero external requests).`);
