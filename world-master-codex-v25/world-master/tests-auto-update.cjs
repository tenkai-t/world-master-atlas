// Auto update: background preparation, next-launch application, guest skip,
// and automatic offline pack downloads, against a simulated service worker.
const fs = require('fs'), vm = require('vm'), assert = require('node:assert/strict'), { webcrypto } = require('node:crypto'), { JSDOM } = require('jsdom'), { MessageChannel } = require('node:worker_threads');
const root = __dirname + '/public/', html = fs.readFileSync(root + 'play.html', 'utf8');
const { fixture } = require('./tests-security.cjs');
const legacy = { version: 1, records: { 'JP:flag': { right: 5, wrong: 2, last: 1, streak: 1, dates: ['2026-10-15'] } }, history: [], settings: { sound: true } };
const target = { schema: 1, version: 'c'.repeat(20), materialVersion: 'd'.repeat(20), label: '自動テスト新版', notes: ['自動更新の検証'] };
const testManifest = { version: target.materialVersion, packs: { core: [{ bytes: 100 }], photos: [{ bytes: 200 }], handwriting: [{ bytes: 300 }] } };
const sk = 'world-master:security:v1', uk = 'world-master:updates:v1';

function makeWorker(state, calls) {
  return {
    postMessage(message, ports) {
      const port = ports?.[0]; if (!port) return;
      const cmd = message.command;
      calls.push(cmd === 'prepare' ? `prepare:${message.pack}:${message.expectedVersion || ''}` : cmd);
      let r = { done: true };
      if (cmd === 'ping') r.updateRevision = 1;
      if (cmd === 'clients') r.count = 1;
      if (cmd === 'manifest') r.manifest = testManifest;
      if (cmd === 'status') r = { done: true, state: JSON.parse(JSON.stringify(state)), available: state.available, pendingAvailable: state.pendingAvailable, files: [] };
      if (cmd === 'prepare') {
        if (testManifest.version === state.active?.manifest.version) state.available[message.pack] = true;
        else if (message.pack === 'core') { state.pending = { manifest: testManifest, ready: { core: true } }; state.pendingAvailable = { core: true }; }
        else if (state.pending) state.pendingAvailable[message.pack] = true;
        port.postMessage({ progress: true, total: 1, completed: 1, bytes: 100 });
      }
      if (cmd === 'activate') { state.active = state.pending; state.pending = null; state.available = { core: true, photos: true, handwriting: true }; calls.push('activated'); }
      port.postMessage(r); port.close();
    }
  };
}
const freshState = () => ({ active: { manifest: { version: 'oldmaterial000001' }, ready: { core: true } }, pending: null, available: { core: true, photos: false, handwriting: false }, pendingAvailable: {} });
function baseStore() {
  const v = fixture('1234');
  return new Map([['world-master:v1', JSON.stringify(legacy)], [sk, JSON.stringify({ schema: 1, players: { legacy: v }, admin: v, minutes: 5 })]]);
}
async function launch(store, state, calls) {
  const dom = new JSDOM(html, { url: 'https://test.local/play.html', runScripts: 'outside-only' }), w = dom.window, intervals = [];
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true };
  w.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new w.Event('close')) };
  w.Element.prototype.getBoundingClientRect = () => ({ left: 0, top: 0, width: 720, height: 420 });
  const lockQueues = new Map();
  const storage = { getItem: k => store.get(k) || null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
  const registration = { active: makeWorker(state, calls), waiting: null, update: async () => {} };
  const sandbox = {
    document: w.document, location: { reload: () => calls.push('reload') },
    navigator: { onLine: true, locks: { request: (k, o, f) => { const fn = f || o; const prev = lockQueues.get(k) || Promise.resolve(); const p = prev.then(() => fn({ name: k }), () => fn({ name: k })); lockQueues.set(k, p.catch(() => {})); return p; } }, serviceWorker: { register: async () => registration, ready: Promise.resolve(registration) } },
    localStorage: storage, sessionStorage: w.sessionStorage, crypto: webcrypto, TextEncoder, console, Date, setTimeout, clearTimeout,
    setInterval: (fn, ms) => { intervals.push({ fn, ms }); return intervals.length; }, clearInterval: () => {},
    URL, Blob, performance, AbortController, MessageChannel, addEventListener: w.addEventListener.bind(w),
    fetch: async path => path === '/release.json' ? { ok: true, redirected: false, json: async () => target } : { ok: true, json: async () => JSON.parse(fs.readFileSync(root + path, 'utf8')) }
  };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox), e = s => vm.runInContext(s, ctx);
  for (const el of w.document.scripts) vm.runInContext(fs.readFileSync(root + new URL(el.src).pathname.slice(1), 'utf8'), ctx, { filename: el.src });
  await e('playersReady'); await new Promise(r => setTimeout(r, 100));
  return { w, e, store, close: () => w.close() };
}
const waitFor = async (fn, ms = 6000) => { const end = Date.now() + ms; while (Date.now() < end) { if (fn()) return true; await new Promise(r => setTimeout(r, 50)); } return fn(); };
async function login(x) { await x.e("selectPlayer('legacy')"); x.w.document.querySelector('#loginPin').value = '1234'; await x.w.document.querySelector('#securityLogin').onsubmit({ preventDefault() {} }); }

(async () => {
  // 1. A version prepared in a previous session is applied once at launch.
  {
    const store = baseStore(), state = freshState(), calls = [];
    state.pending = { manifest: testManifest, ready: { core: true } }; state.pendingAvailable = { core: true, photos: true, handwriting: true };
    const x = await launch(store, state, calls);
    assert(await waitFor(() => calls.includes('reload')), 'boot activation reloads: ' + calls.join(','));
    assert.equal(calls.filter(c => c === 'activated').length, 1);
    assert.equal(JSON.parse(x.w.sessionStorage.getItem('world-master:update-pending:v1')).version, target.version);
    assert.equal(JSON.parse(store.get(uk)).autoApplyAttempted, target.materialVersion);
    // Second launch with the same store: the attempt marker prevents a loop.
    const calls2 = []; const y = await launch(store, state, calls2);
    await new Promise(r => setTimeout(r, 600));
    assert(!calls2.includes('activated') && !calls2.includes('reload'), 'no second application: ' + calls2.join(','));
    x.close(); y.close();
  }
  // 2. An automatic check prepares every pack for the new version, without reloading.
  {
    const store = baseStore(), state = freshState(), calls = [];
    const x = await launch(store, state, calls);
    await login(x); assert.equal(x.e('view'), 'home');
    await x.e('checkAppUpdate(true)');
    assert(await waitFor(() => JSON.parse(store.get(uk) || '{}').autoPrepared === target.version), 'autoPrepared remembered: ' + calls.join(','));
    for (const pack of ['core', 'photos', 'handwriting']) assert(calls.includes(`prepare:${pack}:${target.materialVersion}`), pack + ' prepared for target');
    assert(!calls.includes('reload') && !calls.includes('activated'));
    assert(x.w.document.querySelector('#updateNotice')?.textContent.includes('次回起動時に更新されます'));
    assert.equal(x.e("db.records['JP:flag'].right"), 5);
    x.close();
  }
  // 3. Guests are never auto-prepared (their records would be lost on restart).
  {
    const store = baseStore(), state = freshState(), calls = [];
    const x = await launch(store, state, calls);
    await x.e('startGuest()'); assert(x.e('isGuest()'));
    await x.e('checkAppUpdate(true)');
    await new Promise(r => setTimeout(r, 700));
    assert(!calls.some(c => c.endsWith(':' + target.materialVersion)), 'no update preparation for guests: ' + calls.join(','));
    assert(!JSON.parse(store.get(uk) || '{}').autoPrepared);
    x.close();
  }
  // 4. Missing packs for the current version download automatically when online.
  {
    const store = baseStore(), state = freshState(), calls = [];
    state.active = { manifest: testManifest, ready: { core: true } }; state.available = { core: false, photos: false, handwriting: false };
    const x = await launch(store, state, calls);
    await x.e('autoPrepareOfflinePacks()');
    for (const pack of ['core', 'photos', 'handwriting']) assert(calls.includes(`prepare:${pack}:`), pack + ' auto-downloaded');
    assert.deepEqual(state.available, { core: true, photos: true, handwriting: true });
    x.close();
  }
  console.log('PASS auto update: prepared version applied once at next launch with loop guard, automatic check prepares all packs without reload, guest skipped, current-version packs auto-download when online. Simulated worker/browser, not device proof.');
})().catch(err => { console.error(err); process.exit(1); });
