import { rankingRequest } from './player-ranking.mjs';

const response = (body, status = 200) => Response.json(body, {
  status, headers: { 'Cache-Control': 'no-store' },
});
const failure = (error, status) => response({ error }, status);
const SITES_HOST = 'world-master-atlas.prime-otter-8314.chatgpt.site';

// Sites supplies a trusted account at its edge. Standalone Workers must never
// interpret an incoming oai-authenticated-user-id header as authentication.
export async function rankingGateway(request, action, env, bank) {
  const url = new URL(request.url);
  const mode = env.WM_AUTH_MODE ?? 'sites';
  if (mode !== 'sites' && mode !== 'player-key') {
    return failure('オンラインの公開設定を確認してください。', 503);
  }
  if (mode === 'sites' && ![SITES_HOST, 'localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    return failure('オンラインの認証設定が未完了です。', 503);
  }
  if (action === 'config' && request.method === 'GET') {
    return response({ authMode: mode });
  }
  if (mode === 'sites') {
    return rankingRequest(request, action, env.DB, bank, request.headers.get('oai-authenticated-user-id'));
  }
  // A cross-origin page must not be able to create or mutate a player profile.
  if (request.method === 'POST' && request.headers.get('Origin') !== url.origin) {
    return failure('同じサイトから操作してください。', 403);
  }
  const id = request.headers.get('X-WM-Player');
  const key = request.headers.get('X-WM-Key');
  const readOnly = request.method === 'GET' && ['leaderboard', 'legacy', 'survival-catalog', 'survival-leaderboard'].includes(action);
  if (!id && !key && readOnly) {
    return rankingRequest(request, action, env.DB, bank, 'standalone-public-reader');
  }
  if (!/^[a-f0-9-]{36}$/.test(id ?? '') || !/^[a-f0-9]{64}$/.test(key ?? '')) {
    return failure('プレイヤーの本人確認が必要です。', 403);
  }
  // The existing 256-bit capability remains in its existing storage, separate
  // from learning backups. The derived owner is never supplied by the client.
  // It cannot claim an existing Sites account, or a different player's key.
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('world-master:standalone:v1:' + key));
  const owner = 'standalone:' + Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
  return rankingRequest(request, action, env.DB, bank, owner);
}
