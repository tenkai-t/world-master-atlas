// Storage quota safeguards: legacy per-record date lists are converted to
// day counts (plus one per-player study-day list) on load, a quota failure
// frees the re-downloadable offline packs and retries the write once before
// failing closed, and the migrated legacy source copy can be deleted from
// the player picker to reclaim space.
const fs = require('fs'), vm = require('vm'), assert = require('node:assert/strict'), { webcrypto } = require('node:crypto'), { JSDOM } = require('jsdom'), { MessageChannel } = require('node:worker_threads');
const root = __dirname + '/public/', html = fs.readFileSync(root + 'play.html', 'utf8');
const { fixture } = require('./tests-security.cjs');
const legacy = { version: 1, records: { 'JP:flag': { right: 5, wrong: 2, last: 1, streak: 1, dates: ['2026-10-15'] } }, history: [], settings: { sound: true } };
const sk = 'world-master:security:v1';
const manifest = { version: 'd'.repeat(20), packs: { core: [{ bytes: 100 }], photos: [{ bytes: 200 }], handwriting: [{ bytes: 300 }] } };

function makeWorker(state, calls, flags) {
  return {
    postMessage(message, ports) {
      const port = ports?.[0]; if (!port) return;
      const cmd = message.command; calls.push(cmd);
      let r = { done: true };
      if (cmd === 'ping') r.updateRevision = 1;
      if (cmd === 'clients') r.count = 1;
      if (cmd === 'manifest') r.manifest = manifest;
      if (cmd === 'status') r = { done: true, state: JSON.parse(JSON.stringify(state)), available: state.available, pendingAvailable: state.pendingAvailable, files: [] };
      if (cmd === 'prepare') { state.available[message.pack] = true; port.postMessage({ progress: true, total: 1, completed: 1, bytes: 100 }); }
      if (cmd === 'delete' && flags.unblockOnDelete) flags.quotaBlocked = false;
      port.postMessage(r); port.close();
    }
  };
}
const freshState = () => ({ active: { manifest: { version: manifest.version }, ready: { core: true } }, pending: null, available: { core: true, photos: true, handwriting: true }, pendingAvailable: {} });
function baseStore() {
  const v = fixture('1234');
  return new Map([['world-master:v1', JSON.stringify(legacy)], [sk, JSON.stringify({ schema: 1, players: { legacy: v }, admin: v, minutes: 5 })]]);
}
async function launch(store, state, calls, flags) {
  const dom = new JSDOM(html, { url: 'https://test.local/play.html', runScripts: 'outside-only' }), w = dom.window, intervals = [];
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true };
  w.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new w.Event('close')) };
  w.Element.prototype.getBoundingClientRect = () => ({ left: 0, top: 0, width: 720, height: 420 });
  const lockQueues = new Map();
  const storage = {
    getItem: k => store.get(k) || null,
    setItem: (k, v) => { if (flags.quotaBlocked && k.startsWith('world-master:player:v1:')) { const err = new Error('The quota has been exceeded.'); err.name = 'QuotaExceededError'; throw err; } store.set(k, String(v)); },
    removeItem: k => store.delete(k)
  };
  const registration = { active: makeWorker(state, calls, flags), waiting: null, update: async () => {} };
  const sandbox = {
    document: w.document, location: { reload: () => calls.push('reload') },
    navigator: { onLine: true, locks: { request: (k, o, f) => { const fn = f || o; const prev = lockQueues.get(k) || Promise.resolve(); const p = prev.then(() => fn({ name: k }), () => fn({ name: k })); lockQueues.set(k, p.catch(() => {})); return p; } }, serviceWorker: { register: async () => registration, ready: Promise.resolve(registration) } },
    localStorage: storage, sessionStorage: w.sessionStorage, crypto: webcrypto, TextEncoder, console, Date, setTimeout, clearTimeout,
    setInterval: (fn, ms) => { intervals.push({ fn, ms }); return intervals.length; }, clearInterval: () => {},
    URL, Blob, performance, AbortController, MessageChannel, addEventListener: w.addEventListener.bind(w),
    fetch: async path => path === '/release.json' ? { ok: true, redirected: false, json: async () => ({ schema: 1, version: 'c'.repeat(20), materialVersion: manifest.version, label: 'x', notes: [] }) } : { ok: true, json: async () => JSON.parse(fs.readFileSync(root + path, 'utf8')) }
  };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox), e = s => vm.runInContext(s, ctx);
  for (const el of w.document.scripts) vm.runInContext(fs.readFileSync(root + new URL(el.src).pathname.slice(1), 'utf8'), ctx, { filename: el.src });
  await e('playersReady'); await new Promise(r => setTimeout(r, 100));
  return { w, e, store, close: () => w.close() };
}
async function login(x) { await x.e("selectPlayer('legacy')"); x.w.document.querySelector('#loginPin').value = '1234'; await x.w.document.querySelector('#securityLogin').onsubmit({ preventDefault() {} }); }
const days = n => Array.from({ length: n }, (_, i) => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10));

function oldFormatStore() {
  const v = fixture('1234'), d = JSON.parse(JSON.stringify(legacy)), ds = days(45);
  d.records['JP:flag'] = { right: 90, wrong: 3, last: 1, streak: 3, lastRight: true, hinted: 0, dates: ds, channels: { choice: { right: 90, wrong: 3, last: 1, streak: 3, lastRight: true, hinted: 0, dates: ds } } };
  return new Map([['world-master:players:v1', JSON.stringify({ version: 1, players: [{ id: 'legacy', name: 'レガシー', icon: '🌱' }], last: 'legacy' })],
    ['world-master:player:v1:legacy', JSON.stringify({ schema: 1, revision: 'r1', data: d })],
    [sk, JSON.stringify({ schema: 1, players: { legacy: v }, admin: v, minutes: 5 })]]);
}

(async () => {
  // C: old date lists convert to day counts on load; judgments unchanged and
  // the full day count survives (45 days stay 45, stored far smaller).
  {
    const flags = { quotaBlocked: false, unblockOnDelete: false };
    const x = await launch(oldFormatStore(), freshState(), [], flags);
    await login(x);
    assert.equal(x.e("db.records['JP:flag'].days"), 45);
    assert.equal(x.e("db.records['JP:flag'].dates"), undefined);
    assert.equal(x.e("db.records['JP:flag'].lastDay"), days(45)[44]);
    assert.equal(x.e("db.records['JP:flag'].channels.choice.days"), 45);
    assert.equal(x.e('(db.playDays||[]).length'), 45);
    assert.equal(x.e("statusOf(db.records['JP:flag'].channels.choice)"), 'マスター');
    assert.equal(await x.e('save()'), true);
    const raw = x.store.get('world-master:player:v1:legacy');
    assert(!raw.includes('"dates"'), 'no date lists remain in stored data');
    const saved = JSON.parse(raw).data.records['JP:flag'];
    assert.equal(saved.days, 45); assert.equal(saved.channels.choice.days, 45);
    assert(raw.length < 1500, 'converted player data is small: ' + raw.length);
    x.close();
  }
  // D: the picker offers deleting the migrated legacy source copy; current
  // player data is untouched and the offer disappears afterwards.
  {
    const flags = { quotaBlocked: false, unblockOnDelete: false };
    const x = await launch(baseStore(), freshState(), [], flags);
    assert(x.store.get('world-master:v1'), 'legacy source present before deletion');
    x.e('playerPicker()');
    assert(x.w.document.body.textContent.includes('移行元データを削除する'));
    x.e('confirmDeleteLegacySource()');
    x.w.document.querySelector('#deleteLegacySource').click();
    assert.equal(x.store.get('world-master:v1'), undefined);
    assert(x.store.get('world-master:player:v1:legacy'), 'migrated player data kept');
    assert(!x.w.document.body.textContent.includes('移行元データを削除する'));
    x.close();
  }
  // A: a quota failure deletes the offline packs and retries successfully.
  {
    const flags = { quotaBlocked: false, unblockOnDelete: true }, calls = [];
    const x = await launch(baseStore(), freshState(), calls, flags);
    await login(x);
    flags.quotaBlocked = true;
    assert.equal(await x.e('save()'), true);
    assert(calls.includes('delete'), 'packs deleted to free space: ' + calls.join(','));
    assert.equal(x.e('storageOK'), true);
    assert(!x.w.document.querySelector('#modal').open || !x.w.document.querySelector('#modalBody').textContent.includes('保存できませんでした'));
    assert(JSON.parse(x.store.get('world-master:player:v1:legacy')).data.records['JP:flag'].right >= 5);
    x.close();
  }
  // A': if the retry still fails, the existing fail-closed modal appears.
  {
    const flags = { quotaBlocked: false, unblockOnDelete: false }, calls = [];
    const x = await launch(baseStore(), freshState(), calls, flags);
    await login(x);
    flags.quotaBlocked = true;
    assert.equal(await x.e('save()'), false);
    assert(calls.includes('delete'));
    assert(x.w.document.querySelector('#modalBody').textContent.includes('記録を保存できませんでした'));
    assert.equal(x.e('storageOK'), false);
    x.close();
  }
  console.log('PASS storage quota: legacy date lists convert to day counts on load with mastery and full counts preserved, picker deletes the migrated legacy source copy only, quota failure frees offline packs and retries once, persistent quota still fails closed with export/retry modal. Simulated worker/browser, not device proof.');
})().catch(err => { console.error(err); process.exit(1); });
