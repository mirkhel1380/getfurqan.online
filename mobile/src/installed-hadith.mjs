import { sha256 } from '@noble/hashes/sha2.js';

const digest = bytes => [...sha256(bytes)].map(n => n.toString(16).padStart(2, '0')).join('');
const key = value => String(Number(value));

// Adapt only the existing, revision-pinned hadith URLs. Account and Quran
// requests retain their own transports. Displayed source records are unchanged.
export function installedHadithFetch({ fetch: original, origin, lock }) {
  if (lock.schema !== 1 || !/^[a-f0-9]{40}$/.test(lock.revision) || lock.files.length !== 64) throw Error('Invalid installed hadith catalogue');
  const files = new Map(lock.files.map(row => [row.edition, row]));
  if (files.size !== lock.files.length) throw Error('Duplicate installed edition');
  const cache = new Map();
  const prefixes = [
    `https://raw.githubusercontent.com/fawazahmed0/hadith-api/${lock.revision}/editions/`,
    `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@${lock.revision}/editions/`
  ];
  function route(url) {
    const prefix = prefixes.find(base => url.href.startsWith(base));
    if (!prefix || url.search || url.hash) return null;
    const match = url.href.slice(prefix.length).match(/^([a-z]{3}-[a-z]+\d?)(?:\/(sections\/\d+|\d+(?:\.\d+)?))?\.json$/);
    return match ? { edition: match[1], selection: match[2] || '' } : null;
  }
  function edition(name) {
    if (!cache.has(name)) {
      const task = (async () => {
        const entry = files.get(name);
        if (!entry || entry.file !== name + '.json') throw Error('Edition is not included');
        const response = await original(new URL('/installed-hadith/' + entry.file, origin).href, { credentials: 'omit', signal: AbortSignal.timeout(30000) });
        if (!response.ok) throw Error('Installed edition unavailable');
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.length !== entry.bytes || digest(bytes) !== entry.sha256) throw Error('Installed edition is damaged');
        const data = JSON.parse(new TextDecoder().decode(bytes));
        if (!Array.isArray(data.hadiths) || data.hadiths.length !== entry.records) throw Error('Incomplete installed edition');
        return data;
      })();
      cache.set(name, task);
      task.catch(() => { if (cache.get(name) === task) cache.delete(name); });
      while (cache.size > 2) cache.delete(cache.keys().next().value);
    }
    return cache.get(name);
  }
  return async (input, init = {}) => {
    const request = typeof Request !== 'undefined' && input instanceof Request ? input : null;
    const method = (init.method || request?.method || 'GET').toUpperCase();
    const url = new URL(request ? request.url : String(input), origin);
    const selected = method === 'GET' ? route(url) : null;
    if (!selected) return original(input, init);
    const signal = init.signal || request?.signal;
    signal?.throwIfAborted();
    try {
      const data = await edition(selected.edition);
      signal?.throwIfAborted();
      const hadiths = !selected.selection ? data.hadiths : selected.selection.startsWith('sections/')
        ? data.hadiths.filter(row => String(row.reference.book) === selected.selection.slice(9))
        : data.hadiths.filter(row => key(row.hadithnumber) === key(selected.selection));
      return new Response(JSON.stringify({ ...data, hadiths }), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    } catch (error) {
      signal?.throwIfAborted();
      // Never hide a damaged install by downloading a replacement at first use.
      return new Response(JSON.stringify({ error: 'Installed hadith data unavailable' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    }
  };
}
