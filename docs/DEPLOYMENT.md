# デプロイ運用

## 現在の構成

| 項目 | 値 |
| --- | --- |
| Cloudflare Pagesプロジェクト | `fuwatto` |
| Cloudflare Account ID | `3b7d7afda6c8bf0aa72256c171dd5f04` |
| 本番URL | <https://fuwatto.pages.dev/> |
| 本番ブランチ | `main` |
| ビルドコマンド | `npm run build` |
| 出力ディレクトリ | `dist` |
| Pages方式 | Direct Upload（静的サイト） |

## GitHub Actions 自動デプロイ設定

`.github/workflows/deploy.yml` による `main` プッシュ時の自動デプロイを有効にするには、リポジトリの Secrets に以下を設定します。

- `CLOUDFLARE_ACCOUNT_ID`: `3b7d7afda6c8bf0aa72256c171dd5f04`（設定済み）
- `CLOUDFLARE_API_TOKEN`: `fuwatto` プロジェクトを持つアカウントで発行した **Cloudflare Pages: Edit** 権限付きの API トークン

CLI から登録する場合:

```bash
gh secret set CLOUDFLARE_API_TOKEN -R rion0918/pop-reminder-website
```

## 手動デプロイ

```bash
npm run verify
npm run deploy:cloudflare
```

## リリース確認

```bash
curl -fsSIL https://fuwatto.pages.dev/
curl -fsSIL https://fuwatto.pages.dev/privacy
curl -fsSIL https://fuwatto.pages.dev/terms
curl -fsSIL https://fuwatto.pages.dev/assets/pv-fuwatto.mp4
curl -fsSIL https://fuwatto.pages.dev/sitemap.xml
```
