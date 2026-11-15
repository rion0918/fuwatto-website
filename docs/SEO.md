# SEO運用

## URLの正本

現在の正規ドメインは `https://fuwatto.riomaru.jp` です。

| ページ | canonical |
| --- | --- |
| トップ | `https://fuwatto.riomaru.jp/` |
| プライバシーポリシー | `https://fuwatto.riomaru.jp/privacy` |
| 利用規約 | `https://fuwatto.riomaru.jp/terms` |

## SEO関連ファイル

- `index.html`: title、description、canonical、hreflang、OGP（`og:video` 含む）、Twitter Card、JSON-LD（`WebSite` / `WebPage` / `BreadcrumbList` / `MobileApplication` / `VideoObject`）
- `privacy.html` / `terms.html`: title、description、canonical、hreflang、OGP、JSON-LD（`WebPage` / `BreadcrumbList`）
- `robots.txt`: クロール許可と `sitemap.xml` URL
- `sitemap.xml`: インデックス対象URL + `image:image` / `video:video` 拡張タグ
- `site.webmanifest`: アプリ名、テーマ色、アイコン
- `_headers`: 長期キャッシュ（`/assets/*` は `immutable`）、`X-Robots-Tag`、各種セキュリティヘッダ
- `public/assets/og-image-fuwatto.png`: 1200×630の共有画像
- `public/assets/*.webp`: 配信最適化された次世代画像（`<picture>` + PNGフォールバック）

## 公開前チェック

```bash
npm run check
```

このチェックでは次を検証します。

- 必須ファイル・WebP画像・`pv-fuwatto.mp4`（Cloudflare Pages 25 MiB 上限未満）が存在する。
- トップページのtitle、description、canonical、hreflang、OGP、Twitter Cardが存在する。
- h1が各ページに1つだけ存在する。
- JSON-LD（`MobileApplication` と `VideoObject` 含む）が有効なJSONとして解析できる。
- `robots.txt`、`sitemap.xml`、`_headers` が必須ルールを満たしている。
- reduced motion対応が存在する。

## Search Console の所有権確認

- HTMLメタタグ方式：`<meta name="google-site-verification" content="..." />` を `index.html` の `<head>` に追加します。
- HTMLファイル方式：`googleXXXXXXXX.html` をリポジトリ直下に配置すると、`scripts/build.mjs` が自動的に `dist/` へ同梱します。

## 公開後の確認

- Google Search Console へ `https://fuwatto.riomaru.jp/`（URLプレフィックス）を追加し、`https://fuwatto.riomaru.jp/sitemap.xml` を送信する。
- URL検査でトップページのインデックス登録をリクエストする。
- Lighthouse（モバイル・デスクトップ）および PageSpeed Insights で Core Web Vitals を確認する。
