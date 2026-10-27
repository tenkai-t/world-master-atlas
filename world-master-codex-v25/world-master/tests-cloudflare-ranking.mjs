import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { rankingGateway } from './server/ranking-gateway.mjs';
import { DEPARTMENTS } from './server/ranking.mjs';

const sql = new DatabaseSync(':memory:');
for (const f of fs.readdirSync('drizzle').filter(f => f.endsWith('.sql')).sort()) sql.exec(fs.readFileSync('drizzle/' + f, 'utf8'));
const DB = { prepare(query) { return { bind(...args) { return {
  async first() { return sql.prepare(query).get(...args) ?? null; },
  async all() { return { results: sql.prepare(query).all(...args) }; },
  async run() { return sql.prepare(query).run(...args); },
}; } }; } };
const bank = Object.fromEntries([['country','data'],['capital','capitals'],['terrain','terrain'],['heritage','heritage'],['icons','player-icons']].map(([key, file]) => [key, JSON.parse(fs.readFileSync('public/assets/' + file + '.json'))]));
const env = { DB, WM_AUTH_MODE: 'player-key' };
const origin = 'https://world-master-atlas.example.workers.dev';
const a = { id: crypto.randomUUID(), secret: 'a'.repeat(64) };
const b = { id: crypto.randomUUID(), secret: 'b'.repeat(64) };
const mutation = () => crypto.randomUUID();
const profile = () => ({ name: 'テスト旅人', icon: '🌱', revision: 0, mutation: mutation() });
async function api(action, body, player = a, headers = {}, runtime = env, host = origin) {
  const req = new Request(host + '/api/rank/' + action, {
    method: body ? 'POST' : 'GET',
    headers: {
      ...(body ? { 'Content-Type': 'application/json', Origin: host } : {}),
      ...(player ? { 'X-WM-Player': player.id, 'X-WM-Key': player.secret } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const response = await rankingGateway(req, action.split('?')[0], runtime, bank);
  return { status: response.status, j: await response.json() };
}

assert.equal((await api('config', null, null)).j.authMode, 'player-key');
assert.equal((await api('profile', profile(), null, { 'oai-authenticated-user-id': 'forged' })).status, 403);
assert.equal((await api('profile', profile(), a, { Origin: 'https://foreign.example' })).status, 403);
assert.equal((await api('profile', profile(), a, { Origin: '' })).status, 403);
assert.equal((await api('profile', profile(), a, {}, { DB })).status, 503, 'A bare Worker must fail closed without standalone configuration');
assert.equal((await api('profile', profile(), a, {}, { DB, WM_AUTH_MODE: 'typo' })).status, 503);
assert.equal((await api('profile', profile(), a, {}, { WM_AUTH_MODE: 'player-key' })).status, 503);
assert.equal((await api('profile', profile(), a)).status, 200);
assert.equal((await api('profile', profile(), b)).status, 200);
assert.equal((await api('profile', profile(), { id: a.id, secret: b.secret })).status, 403);
assert.equal((await api('profile', profile(), { id: a.id, secret: 'bad' })).status, 403);

for (const [department, spec] of Object.entries(DEPARTMENTS)) {
  const start = await api('start', { department, score: 99999 });
  assert.equal(start.status, 200);
  assert(!('answer' in start.j.question));
  const questions = JSON.parse(sql.prepare('SELECT questions FROM player_ranking_runs WHERE id=?').get(start.j.run).questions);
  let last;
  for (let i = 0; i < questions.length; i++) {
    const body = { run: start.j.run, position: i, question: questions[i].id, choice: questions[i].answer, score: 99999 };
    assert.equal((await api('answer', body, b)).status, 404);
    last = await api('answer', body);
    assert.equal(last.status, 200);
    const retry = await api('answer', body);
    assert.equal(retry.j.right, last.j.right);
    assert.equal(retry.j.outcome, last.j.outcome);
    assert.equal((await api('answer', { ...body, choice: 'skip' })).status, 409);
  }
  assert(last.j.done);
  assert.equal(last.j.right, spec.count);
  assert.equal(last.j.outcome, 'first');
}
const before = sql.prepare('SELECT * FROM player_ranking_scores WHERE player_id=? ORDER BY department').all(a.id);
const current = sql.prepare('SELECT revision FROM ranking_players WHERE id=?').get(a.id);
assert.equal((await api('profile', { ...profile(), name: '変更後', revision: current.revision })).status, 200);
assert.deepEqual(sql.prepare('SELECT * FROM player_ranking_scores WHERE player_id=? ORDER BY department').all(a.id), before);
const board = await api('leaderboard?department=flags', null, null);
assert.equal(board.status, 200);
assert.equal(board.j.own, null);
assert.equal(board.j.rows[0].nickname, '変更後');
assert.equal((await api('leaderboard?department=flags')).j.own.rank, 1);
for (const secret of [a.id, a.secret, 'secret_hash', 'owner_id']) assert(!JSON.stringify(board.j).includes(secret));
assert.equal((await api('legacy?department=flags', null, null)).status, 200);

// A copied legacy account row is not silently reassigned to an anonymous owner.
const legacy = { id: crypto.randomUUID(), secret: 'c'.repeat(64) };
const sites = { DB, WM_AUTH_MODE: 'sites' };
const sitesOrigin = 'https://world-master-atlas.prime-otter-8314.chatgpt.site';
assert.equal((await api('profile', profile(), legacy, { 'oai-authenticated-user-id': 'sites-owner' }, sites, sitesOrigin)).status, 200);
assert.equal((await api('profile', profile(), legacy)).status, 403);
assert.equal((await api('leaderboard', null, null, {}, sites, sitesOrigin)).status, 401);
assert.equal((await api('leaderboard', null, null, { 'oai-authenticated-user-id': 'forged' }, sites)).status, 503);

// Limits remain server-side, scoped per credential when no account exists.
const limiter = { id: crypto.randomUUID(), secret: 'd'.repeat(64) };
assert.equal((await api('profile', profile(), limiter)).status, 200);
for (let i = 0; i < 30; i++) assert.equal((await api('start', { department: 'flags' }, limiter)).status, 200);
assert.equal((await api('start', { department: 'flags' }, limiter)).status, 429);

// Use real PIN forms, profile outbox and ranking UI against the gateway.
const require = createRequire(import.meta.url);
const { fixture, launch, login } = require('./tests-security.cjs');
const localId = 'standalone-test-player';
const store = new Map([
  ['world-master:players:v1', JSON.stringify({ version: 1, players: [{ id: localId, name: '旅人', icon: '🌱' }], last: localId })],
  ['world-master:security:v1', JSON.stringify({ schema: 1, players: { [localId]: fixture('1234') }, admin: fixture('654321'), minutes: 5 })],
  ['world-master:player:v1:' + localId, JSON.stringify({ schema: 1, revision: crypto.randomUUID(), data: { version: 1, records: {}, history: [] } })],
]);
const x = await launch(store, { fetch: async (path, options) => {
  if (path.startsWith('/api/')) {
    const request = new Request(origin + path, options);
    if (request.method === 'POST') request.headers.set('Origin', origin);
    return rankingGateway(request, path.split('/').pop().split('?')[0], env, bank);
  }
  return { ok: true, json: async () => JSON.parse(fs.readFileSync('public/' + path)) };
} });
try {
  await login(x, localId);
  x.e('navigator.onLine=true');
  await x.e('rankPrepare()');
  const credential = JSON.parse(store.get('world-master:online-players:v1'))[localId];
  x.e("rankingTab='online';rankings()");
  await new Promise(resolve => setTimeout(resolve, 50));
  assert(x.$('#rankingIdentityHelp').textContent.includes('ログインは不要'));
  assert(!x.$('#rankingIdentityHelp a'));
  await x.$('#officialStart').onclick();
  assert.equal(x.e('view'), 'official');
  await x.e("officialAnswer('skip')");
  assert.equal(x.e('officialRun.position'), 1);
  await x.e('finishPlayerSwitch()');
  await login(x, localId);
  await x.e('rankPrepare()');
  assert.equal(JSON.parse(store.get('world-master:online-players:v1'))[localId].id, credential.id);
  x.e("rankingTab='online';rankings()");
  assert(x.$('#resumeOfficial'));
  await x.e('finishPlayerSwitch()');
  await x.e('startGuest()');
  x.e("rankingTab='online';rankings()");
  assert(x.$('#officialStart').disabled);
  assert.throws(() => x.e('rankHeaders()'));
} finally { x.close(); sql.close(); }
console.log('PASS Cloudflare gateway: no-account six-department grading, capability ownership, spoofed account headers rejected, CSRF, retry, private data, legacy isolation, limits, real PIN/profile/UI/resume and guest denial; artificial DOM/SQLite only.');
