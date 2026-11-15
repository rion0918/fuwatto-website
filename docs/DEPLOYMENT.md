# デプロイ運用

## 現在の構成

| 項目 | 値 |
| --- | --- |
| Cloudflare Pagesプロジェクト | `fuwatto` |
| 本番URL | <https://fuwatto.pages.dev/> |
| 本番ブランチ | `main` |
| ビルドコマンド | `npm run build` |
| 出力ディレクトリ | `dist` |
| Pages方式 | Direct Upload（静的サイト） |

## 通常のリリースフロー

1. `npm run verify` を実行する。
2. 変更を `main` へ反映する。
3. GitHub Actions が `dist/` を Cloudflare Pages（`fuwatto`）へデプロイする。

## リリース確認

```bash
curl -fsSIL https://fuwatto.pages.dev/
curl -fsSIL https://fuwatto.pages.dev/privacy
curl -fsSIL https://fuwatto.pages.dev/terms
curl -fsSIL https://fuwatto.pages.dev/assets/pv-fuwatto.mp4
curl -fsSIL https://fuwatto.pages.dev/sitemap.xml
```
