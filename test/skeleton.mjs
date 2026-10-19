// node test/skeleton.mjs: the page's skeleton, css/zola.css, the theme's
// own: the room under a page's last article (a page) or rows (a story's
// related stories, a section's pages) before the footer is the Newsroom's,
// ciderui's measurement of apple.com's footer tile's margin above it
// (reference/apple.com/results/newsroom-article.json, footertile), at each
// width it was measured at, in the theme's prebuilt stylesheet on the
// checks' site.

import { existsSync, readFileSync, rmSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { chromium } from 'playwright-chromium';
import { CIDERUI, zolaBuild } from './lib.mjs';

const measured = JSON.parse(readFileSync(join(CIDERUI, 'reference/apple.com/results/newsroom-article.json'), 'utf8')).widths;
const PAGES = [['/about/', 'cui-article'], ['/news/story-1/', 'cui-posts'], ['/guide/', 'cui-posts']];

const { root, out } = zolaBuild('site');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
const browser = await chromium.launch({ args: ['--font-render-hinting=none'] });
const page = await browser.newPage();
await page.route('https://check.test/**', (route) => {
  let f = join(out, decodeURIComponent(new URL(route.request().url()).pathname));
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) return route.fulfill({ status: 404, body: '' });
  route.fulfill({ body: readFileSync(f), contentType: TYPES[extname(f)] ?? 'application/octet-stream' });
});
let failures = 0, compared = 0;
for (const width of Object.keys(measured).map(Number)) {
  const want = measured[width].footertile.styles['margin-top'];
  await page.setViewportSize({ width, height: 900 });
  for (const [path, last] of PAGES) {
    await page.goto(`https://check.test${path}`, { waitUntil: 'load' });
    const got = await page.evaluate(() => {
      const e = document.querySelector('.cz-main').lastElementChild;
      return { cls: e.className, margin: getComputedStyle(e).marginBottom, gap: Math.round(document.querySelector('footer').getBoundingClientRect().top - e.getBoundingClientRect().bottom) };
    });
    compared++;
    const ok = got.cls.split(' ')[0] === last && got.margin === want && `${got.gap}px` === want;
    if (!ok) failures++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${path} at ${width}px: its last ${got.cls.split(' ')[0]}, ${got.margin} under it and ${got.gap}px to the footer, apple.com's ${want}`);
  }
}
await browser.close();
rmSync(root, { recursive: true, force: true });
console.log(`skeleton: ${compared} pages and widths, ${failures} failures`);
process.exit(failures ? 1 : 0);
