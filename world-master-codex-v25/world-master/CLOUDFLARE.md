# Cloudflare Workers向けの公開準備

2026-10-28（日本時間）。この変更はローカルで準備・検証したものです。GitHubへの書き込み、Cloudflareの公開、リモートDBへのSQL実行は実施していません。

## 保持するもの

既存Sitesのproject_id・公開URL・DB・アカウントには触れません。通常の `npm run build` と `.openai/hosting.json` はSites用として残します。Cloudflare用の設定は `cloudflare-target.json` と別の生成物 `dist/server/wrangler.cloudflare.json` です。対象DB IDはユーザーが新規に作成したDBのものです。認証秘密ではありません。

既存の保存キー、ローカル/オンラインプレイヤーID、操作鍵の生成・保存、PINと先生用保護、バックアップ形式、問題ID、教材、採点、同点順位、再送、プロフィールの改訂、旧記録の分離を維持します。国旗XNC.svgの2ファイルのみ取得前のCRLFバイトに復元し、元のSHA-256との一致を確認しました。`.gitattributes`で再変換を防ぎます。

## ログイン不要の本人確認

Cloudflare用のビルドは `WM_AUTH_MODE=player-key` を明示します。外部アカウントに代わり、既存の256ビット操作鍵を持つプレイヤーがオンライン操作を行います。サーバー側で操作鍵から所有者識別子を導き、既存のDB上のsecret_hash・所有者・安定オンラインIDと照合します。任意のアカウントヘッダー、IDだけ、得点の自己申告では操作できません。学習バックアップへ鍵を追加しません。

ゲストは読み取り専用です。端末内プレイヤーは従来どおり本人PINで入り、本人確認後に専用の操作鍵を使います。PIN自体をサーバーへ送る実装にはしていません。鍵を盗まれた場合はそのプレイヤーの操作権限も盗まれるため、ブラウザ保存領域の保護が前提です。サーバーは端末内PIN入力そのものを検証する仕組みではありません。

元のアカウント単位の開始上限30回/時はCloudflare版では操作鍵単位です。匿名利用では新しい登録を作れるので、人単位の登録数や濫用をこの制限だけで防ぐことはできません。必要な公開規模に応じたCloudflare側のレート制限やBot対策は別途の設定です。採点・順序・1時間の挑戦期限・再送・6部門は元のサーバー処理を使います。

未設定はSitesモードです。元のSitesホスト/ローカル開発以外では失敗して閉じ、Workers上で偽装された `oai-authenticated-user-id` を認証に使いません。独自のSitesドメインを追加する場合は別途信頼境界を確認して設定する必要があります。

## 既存データと限界

新しいWorkersオリジンは元のSitesと保存領域が別です。元の学習記録・PIN・操作鍵は自動移行しません。元のSites DBの行を新DBへ取得/コピーしていません。新DBのランキングは別のランキングです。旧アカウントの所有者を新しい鍵へ推測で結び付けません。元サイトでの閲覧・利用は維持します。

既存学習バックアップは従来どおり新規プレイヤーとして追加します。オンラインID・操作鍵・PINはバックアップ対象外であり、復元で元のオンライン記録を継続できる保証はありません。サイトデータ削除・ブラウザ変更で鍵を失った場合、現在の仕様にオンライン本人復旧機能はありません。ここで新しい復旧コード形式は導入しません。

## Cloudflareのビルド設定

アプリルート：`world-master-codex-v25/world-master`

Build command:

```sh
npx --yes pnpm@11.25.0 install --frozen-lockfile && npm run build:cloudflare
```

Deploy command（まず公開せず検証）:

```sh
npx --yes pnpm@11.25.0 exec wrangler deploy --config dist/server/wrangler.cloudflare.json --dry-run
```

以前の長い `node -e` を含むBuild commandは上のコマンドへ置き換えます。生成設定を後から編集する処理を二重に残しません。元の `dist/server/wrangler.json` を公開設定に指定しないでください。

ユーザーの新規D1で既存の2移行SQLに対応する5テーブルがあることは画面で確認済みです。列・インデックスまでの一致やリモートAPI動作は未確認です。適用済みSQLは変更せず、API実行中にDDLは行いません。DBのDROPや初期化はしません。

## 検証と公開

```sh
npm run test:cloudflare
npm test
npm run build:cloudflare
```

`npm test` の既存画像テストは現在のpackage.json外の `@napi-rs/canvas` に依存するため、今回の実行環境では共通ライブラリを使っています。新しい `test:cloudflare` はpackage.jsonに定義済みの依存だけで動きます。一般環境での全テストのクリーンインストール再現性は別の改善項目です。

ビルド/ドライラン成功は実公開やリモートDB動作の証明ではありません。公開前に変更内容と対象を確認し、公開時だけ `--dry-run` を外します。公開後の新URLでプレイヤー作成・PIN・通常学習・6部門・順位・再送・ゲスト閲覧と投稿不可・スマホ・PWAを検証します。元サイトを削除・転送・非公開にする必要はありません。

ソース来歴のFILES_SHA256.json/SOURCE_PROVENANCE.jsonは取得時点の比較基準として保持します。変更後のハッシュで上書きしません。新しいrelease.json/offline-manifest.jsonはビルドで生成します。


## 間違えるまでチャレンジの追加

専用モード・専用ランキング・再開/保存方針・検証については[SURVIVAL.md](SURVIVAL.md)を参照してください。既存6部門と別条件で保存し、追加のDBマイグレーションはありません。
