// Integration coverage uses the production HTML scripts and SQLite server.
import('./tests-player-ranking.mjs').catch(err=>{console.error(err);process.exit(1)});
