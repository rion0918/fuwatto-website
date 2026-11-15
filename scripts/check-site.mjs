import { access, readFile, stat } from 'node:fs/promises';

const html = await readFile('index.html', 'utf8');
const css = await readFile('styles.css', 'utf8');
const js = await readFile('main.js', 'utf8');
const wrangler = await readFile('wrangler.toml', 'utf8');
const robotsTxt = await readFile('robots.txt', 'utf8');
const sitemapXml = await readFile('sitemap.xml', 'utf8');
const headersFile = await readFile('_headers', 'utf8');
const legalPages = await Promise.all(
  ['privacy.html', 'terms.html'].map(async (file) => [file, await readFile(file, 'utf8')]),
);

const requiredFiles = [
  'privacy.html',
  'terms.html',
  'styles.css',
  'legal.css',
  'main.js',
  'robots.txt',
  'sitemap.xml',
  'site.webmanifest',
  '_headers',
  'wrangler.toml',
  'public/assets/app-icon.png',
  'public/assets/app-icon-160.webp',
  'public/assets/icon-192.png',
  'public/assets/icon-96.webp',
  'public/assets/google-play-badge-ja.png',
  'public/assets/google-play-badge-ja.webp',
  'public/assets/pv-fuwatto.mp4',
  'public/assets/pv-poster.jpg',
  'public/assets/pv-poster.webp',
  'public/assets/screen-home.png',
  'public/assets/screen-home.webp',
  'public/assets/screen-voice-card.png',
  'public/assets/screen-voice-card.webp',
  'public/assets/screen-widget.png',
  'public/assets/screen-widget.webp',
  'public/assets/og-image-fuwatto.png',
  'public/assets/qr-google-play.svg',
  'public/assets/zen-maru-gothic-bold.woff2',
  'public/assets/klee-one-semibold.woff2',
];

const requiredPatterns = [
  ['Japanese language declaration', /<html lang="ja">/],
  ['page title', /<title>[^<]+<\/title>/],
  ['meta description', /<meta\s+name="description"/],
  ['fuwatto canonical URL', /rel="canonical" href="https:\/\/fuwatto\.riomaru\.jp\/"/],
  ['hreflang ja', /rel="alternate" hreflang="ja" href="https:\/\/fuwatto\.riomaru\.jp\/"/],
  ['latest Open Graph image', /property="og:image"[\s\S]*?og-image-fuwatto\.png/],
  ['Twitter card', /name="twitter:card"\s+content="summary_large_image"/],
  ['structured data', /application\/ld\+json/],
  ['single primary heading', /<h1\b/],
  [
    'Google Play store link',
    /https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.rion0918\.popreminder&hl=ja/,
  ],
  ['Google Play badge', /assets\/google-play-badge-ja\.png/],
  ['Google Play QR code', /assets\/qr-google-play\.svg/],
  ['promo video', /assets\/pv-fuwatto\.mp4/],
  ['promo poster WebP', /assets\/pv-poster\.webp/],
  ['app-style reminder bubbles', /data-reminder-bubble/],
  ['interactive bubble playground', /data-bubble-playground/],
  ['latest home screenshot', /screen-home\.png/],
  ['voice screenshot', /screen-voice-card\.png/],
  ['widget screenshot', /screen-widget\.png/],
  ['developer X account', /https:\/\/x\.com\/rioi7_0918/],
];

const forbiddenWaitlistPatterns = [
  ['waitlist attribute or class', /waitlist/i],
  ['Japanese waitlist copy', /待機リスト|ウェイトリスト/],
  ['iOS waitlist copy', /リリース待ち|参加を取り消す/],
];

const failures = [];

for (const file of requiredFiles) {
  try {
    await access(file);
  } catch {
    failures.push(`Missing file: ${file}`);
  }
}

// Cloudflare Pages 25 MiB per-file limit check
const pvStats = await stat('public/assets/pv-fuwatto.mp4');
if (pvStats.size >= 25 * 1024 * 1024) {
  failures.push(`pv-fuwatto.mp4 exceeds Cloudflare Pages 25 MiB limit (${pvStats.size} bytes)`);
}

for (const [label, pattern] of requiredPatterns) {
  if (!pattern.test(html)) {
    failures.push(`Missing ${label}`);
  }
}

if (!/prefers-reduced-motion/.test(css)) {
  failures.push('Missing reduced motion styles');
}

for (const [name, content] of [
  ['index.html', html],
  ['styles.css', css],
  ['main.js', js],
  ...legalPages,
]) {
  for (const [label, pattern] of forbiddenWaitlistPatterns) {
    if (pattern.test(content)) {
      failures.push(`Found ${label} in ${name}`);
    }
  }
}

const h1Count = (html.match(/<h1\b/g) ?? []).length;
if (h1Count !== 1) failures.push(`Expected one h1, found ${h1Count}`);

if (!/^name = "fuwatto"$/m.test(wrangler)) failures.push('Pages project must be fuwatto');
if (!/pages_build_output_dir = "dist"/.test(wrangler)) failures.push('Missing Pages output directory');

if (!/User-agent:\s*\*/.test(robotsTxt) || !/Sitemap:\s*https:\/\/fuwatto\.riomaru\.jp\/sitemap\.xml/.test(robotsTxt)) {
  failures.push('robots.txt must allow crawlers and declare sitemap URL');
}
if (!/<video:video>/.test(sitemapXml) || !/<image:image>/.test(sitemapXml)) {
  failures.push('sitemap.xml must include image and video sitemap tags');
}
if (!/Cache-Control:\s*public,\s*max-age=31536000,\s*immutable/.test(headersFile) || !/X-Content-Type-Options:\s*nosniff/.test(headersFile)) {
  failures.push('_headers must configure immutable asset caching and security headers');
}

const privacy = legalPages.find(([file]) => file === 'privacy.html')?.[1] ?? '';
if (!/Moonshine\s+Tiny JA/.test(privacy)) {
  failures.push('Missing hybrid speech model disclosure in privacy.html');
}
if (!/購入前でもアプリ起動時からRevenueCatへ接続/.test(privacy)) {
  failures.push('Missing RevenueCat startup disclosure');
}
if (!/分析の共有をOFFにしても、この購入管理の通信は停止しません/.test(privacy)) {
  failures.push('Missing independent purchase management disclosure');
}

const terms = legalPages.find(([file]) => file === 'terms.html')?.[1] ?? '';
if (!/法令により認められる利用者の権利を制限するものではありません/.test(terms)) {
  failures.push('Missing consumer rights clause');
}
for (const [file, source] of legalPages) {
  if (!/href="mailto:rion\.developer\.apps@gmail\.com"/.test(source)) {
    failures.push(`Missing support email in ${file}`);
  }
}

const structuredData = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
try {
  const parsed = JSON.parse(structuredData ?? '');
  const graph = parsed['@graph'] ?? [];
  const appNode = graph.find(
    (item) => item['@type'] === 'MobileApplication' || item['@type'] === 'SoftwareApplication',
  );
  if (
    appNode?.installUrl !==
    'https://play.google.com/store/apps/details?id=com.rion0918.popreminder&hl=ja'
  ) {
    failures.push('Structured data MobileApplication must include Google Play installUrl');
  }
  const videoNode = graph.find((item) => item['@type'] === 'VideoObject');
  if (!videoNode?.contentUrl || videoNode?.duration !== 'PT24S') {
    failures.push('Structured data must include VideoObject for 24s promo video');
  }
} catch {
  failures.push('Structured data is not valid JSON');
}

for (const [file, source] of legalPages) {
  if (!/<title>[^<]+<\/title>/.test(source)) failures.push(`Missing title in ${file}`);
  if (!/name="description"/.test(source)) failures.push(`Missing description in ${file}`);
  if (!/rel="canonical"/.test(source)) failures.push(`Missing canonical URL in ${file}`);
  if (!/application\/ld\+json/.test(source)) failures.push(`Missing JSON-LD in ${file}`);
  if ((source.match(/<h1\b/g) ?? []).length !== 1) failures.push(`Expected one h1 in ${file}`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Site structure and SEO checks passed.');
}
