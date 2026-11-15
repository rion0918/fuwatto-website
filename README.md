# ふわっと。公式サイト

リマインダーアプリ「ふわっと。」の公式プロモーションサイトです。

- 公開サイト: <https://fuwatto.riomaru.jp/>
- Google Play: <https://play.google.com/store/apps/details?id=com.rion0918.popreminder&hl=ja>
- アプリ本体: <https://github.com/rion0918/pop-reminder>
- ホスティング: Cloudflare Pages

## ローカルで確認する

```bash
npm run dev
```

## コマンド

| コマンド | 内容 |
| --- | --- |
| `npm run check` | JavaScript、SEO、構造化データ、必須ファイルを検証 |
| `npm run build` | Cloudflare Pagesへ配信する`dist/`を生成 |
| `npm run verify` | checkとbuildを順番に実行 |
| `npm run deploy:cloudflare` | 検証後、Cloudflare Pagesへ手動デプロイ |

## ディレクトリ

```text
.
├── index.html             # トップページ、PV再生、泡デモ、Google Play導線
├── privacy.html           # プライバシーポリシー
├── terms.html             # 利用規約
├── styles.css             # サイト全体とレスポンシブ表現
├── legal.css              # 法務ページ共通スタイル
├── main.js                # PV再生制御・泡デモ・テーマ切替
├── wrangler.toml          # Pages出力設定
├── public/assets/         # PV動画・画像・QRコード・Webフォント
├── scripts/               # 検証・ビルドスクリプト
├── docs/                  # 公開・SEO運用ドキュメント
└── dist/                  # 生成物。Git管理しない
```
