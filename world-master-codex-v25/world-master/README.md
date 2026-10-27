# 世界マスター — WORLD MASTER（Codex引き継ぎ用）

現在公開中の第25版を、GitHub/Codexで開発できる形にしたソース一式です。新しいゲームではありません。

- 対象URL：https://world-master-atlas.prime-otter-8314.chatgpt.site
- 確認日：2026-10-26（日本時間）
- 公開ソース：`51d415913a83c5780c4bd23d36c9d6fe6fb63e3b`
- 公開アプリ識別子：`9657e5134b5eae98a1df`
- 教材識別子：`3963e28059f55f7ef740`
- 問題・ランキング条件：`world-2026-10-v7`

**最初に [MIGRATION.md](MIGRATION.md) を読んでください。コードをGitHubへ置くことと、本番サイト・保存データを移すことは別です。このZIPに本番DB・実プレイヤーデータ・認証情報は含みません。公開サイトは変更していません。**

## 概要と構成

国・国旗・首都・地形・世界遺産を学ぶWebゲーム。練習、テスト、復習、総合チャレンジ、図鑑、ランキング、勲章、手書き、PWAに対応します。詳細は [GAME_SPEC.md](GAME_SPEC.md)。

| 場所 | 内容 |
|---|---|
| `public/` | HTML/CSS/JS、地図、国旗SVG、写真、教材JSON、フォント、SW、PWAマニフェスト、ライセンス |
| `app/` | Vinext/React入口、ランキングAPI、Sites認証ヘルパー |
| `server/` | プレイヤー別オンライン認証・採点、旧ランキング閲覧処理 |
| `db/`, `drizzle/` | D1スキーマ、2世代のスキーマ移行SQL・履歴（実データなし） |
| `content/`, `scripts/` | ヒント原稿、教材・リリース生成、既存開発スクリプト |
| `build/`, `lib/` | Sites/Workerランタイム連携。通常の静的HTMLだけのプロジェクトではありません |
| `tests-*.cjs`, `tests-*.mjs` | 自動テスト。データは人工のテスト用です |
| `test-fixtures/historical/` | 古いSW互換検証用のソース断片。元のGit履歴なしで検証可能 |
| `SOURCE_PROVENANCE.json` | 元ソース全ファイルのSHA-256と移行コピーの差分 |
| `TEST_REPORT.md` | 今回の検証結果と未確認事項 |
| `.openai/hosting.json` | 既存Sites識別情報・論理DBバインディング。認証情報ではありません |

元のREADMEは `docs/README_SOURCE.md` に保管。過去の監査資料も履歴資料として同梱していますが、現在仕様はソースと今回の資料を優先してください。

## 開発環境

Node.js 24.x推奨（今回の検証は24.22.1）。`package.json`の下限は22.13.0。pnpmは **11.25.0** に固定。Node.js、npm、Git/GitHub Desktopを用意してください。

依存関係は `package.json`・`pnpm-lock.yaml`・`pnpm-workspace.yaml`・`.npmrc` を同梱しています。`node_modules`は同梱せず、固定ロックファイルから復元します。Pythonの教材作成スクリプトは通常起動には不要です。

## Windows / Codexでの基本操作

プロジェクト直下（package.jsonのある場所）で次を実行します。

```sh
npx --yes pnpm@11.25.0 install --frozen-lockfile
npm run dev
```

標準のローカルURLは `http://localhost:5173/play.html`。実際の起動ログに別ポートが示された場合はそちらを使ってください。HTMLをダブルクリックして `file://` で開かないでください。Web Locks、WebCrypto、SWは安全なオリジンが必要です。

クリーンなコピーは `portable` プロファイルになり、ローカル開発用の模擬アカウントで動作します。本番認証を取得するものではありません。通常学習はDBがなくても利用できます。ローカルランキングには空のローカルDBへのスキーマ作成が必要です。

**既存の `npm run install:ci` はLinux/Bash向けです。Windowsでは上記のpnpmコマンドを使ってください。ロックファイルを削除したり、別のパッケージマネージャーで勝手に更新しないでください。**

## テストとビルド

```sh
npm test
npm run build
npm run start
```

`npm test` は人工データ・一時SQLite・模擬ブラウザで検証します。本番へテスト投稿しません。`npm run build` はリリース識別情報とオフライン教材マニフェストを再生成し、Worker/クライアントを `dist/` へ出力します。ビルドだけではデプロイされません。`npm run start` はビルド済み出力をローカルで起動するコマンドです。

## ローカルDBだけを初期化する場合

これは将来の開発用の説明です。本番DBに接続しません。`npm run build` 後に、生成された `dist/server/wrangler.json` のDB名が `site-creator-d1`、DB IDがローカル用プレースホルダーであることを確認してください。ローカルのテストデータだけを使います。

```sh
npx --yes pnpm@11.25.0 exec wrangler d1 execute site-creator-d1 --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_regular_zarda.sql
npx --yes pnpm@11.25.0 exec wrangler d1 execute site-creator-d1 --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_nappy_dagger.sql
```

上記は**空のローカルDBに各SQLを1回だけ適用する手順**です。再実行すると既存テーブルのエラーになります。テーブル削除で解決せず、適用履歴を管理してください。今回この手順を本番や既存のローカルDBに実行していません。通常のアプリ開発では新しい移行ファイルを追加し、既存の適用済みSQLは書き換えません。

## 公開について

GitHub登録・Codexでのコード修正・ローカルビルドは公開ではありません。GitHub PagesではWorker API・D1・Sitesの認証は動かないため、そのままフル機能を公開できません。公開先・ドメイン・認証・DBの引き継ぎは別途設計してから行います。元サイトへのpush/deploy、DB取得、設定変更は移行準備の範囲に含めません。
