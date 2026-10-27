import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// The original Sites manifest and its generated configuration remain separate.
// This command only builds locally; it never deploys or executes SQL.
const root = fileURLToPath(new URL('../', import.meta.url));
const target = JSON.parse(readFileSync(new URL('../cloudflare-target.json', import.meta.url), 'utf8'));
if (!/^[a-z0-9-]+$/.test(target.name) || !/^[a-z0-9-]+$/.test(target.database_name) ||
    !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(target.database_id) ||
    target.database_id === '00000000-0000-4000-8000-000000000000') {
  throw new Error('Cloudflare Worker name or dedicated D1 configuration is invalid.');
}
const build = spawnSync(process.execPath, [fileURLToPath(new URL('./run-framework.mjs', import.meta.url)), 'build'], {
  cwd: root, stdio: 'inherit',
});
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);
const config = JSON.parse(readFileSync(new URL('../dist/server/wrangler.json', import.meta.url), 'utf8'));
config.name = target.name;
config.workers_dev = true;
config.vars = { ...config.vars, WM_AUTH_MODE: 'player-key' };
config.d1_databases = [{ binding: 'DB', database_name: target.database_name, database_id: target.database_id }];
writeFileSync(new URL('../dist/server/wrangler.cloudflare.json', import.meta.url), JSON.stringify(config, null, 2) + '\n');
console.log('Cloudflare configuration prepared; no deployment or database mutation performed.');
