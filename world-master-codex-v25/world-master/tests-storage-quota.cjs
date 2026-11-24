// Storage quota safeguards: record date lists are trimmed to the most recent
// 40 days on save/import, and a quota failure frees the re-downloadable
// offline packs and retries the write once before failing closed.
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

(async () => {
  // B: dates are trimmed to the most recent 40 on save; mastery is unchanged.
  {
    const flags = { quotaBlocked: false, unblockOnDelete: false };
    const x = await launch(baseStore(), freshState(), [], flags);
    await login(x);
    x.e(`(()=>{const d=${JSON.stringify(days(45))};db.records['JP:flag']={right:90,wrong:3,dates:d,last:1,streak:3,lastRight:true,hinted:0,channels:{choice:{right:90,wrong:3,dates:d,last:1,streak:3,lastRight:true,hinted:0}}};return true})()`);
    assert.equal(await x.e('save()'), true);
    const saved = JSON.parse(x.store.get('world-master:player:v1:legacy')).data.records['JP:flag'];
    assert.equal(saved.dates.length, 40); assert.equal(saved.channels.choice.dates.length, 40);
    assert.equal(saved.dates[39], days(45)[44]); assert.equal(saved.dates[0], days(45)[5]);
    assert.equal(x.e("statusOf(db.records['JP:flag'].channels.choice)"), 'マスター');
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
  console.log('PASS storage quota: dates trimmed to latest 40 on save with mastery unchanged, quota failure frees offline packs and retries once, persistent quota still fails closed with export/retry modal. Simulated worker/browser, not device proof.');
})().catch(err => { console.error(err); process.exit(1); });
