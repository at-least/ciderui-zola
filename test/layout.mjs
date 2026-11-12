// node test/layout.mjs: every page of test/site, in Chromium at a phone's,
// a tablet's and two desktops' widths, scrolls no wider than the window (a
// code block or a table scrolls inside its own box), and its content's left
// edge is the footer's text's, the column the theme gives <main>.

import { readFileSync, rmSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { chromium } from 'playwright-chromium';
import { pages, zolaBuild } from './lib.mjs';

const WIDTHS = [320, 390, 834, 1600];
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png' };
const { root, out } = zolaBuild();
const urls = pages(out).map((f) => '/' + relative(out, f).replace(/index\.html$/, ''));
const browser = await chromium.launch();
const context = await browser.newContext();
await context.route('https://check.test/**', (route) => {
  const path = decodeURIComponent(new URL(route.request().url()).pathname);
  const file = join(out, path.endsWith('/') ? path + 'index.html' : path);
  route.fulfill({ body: readFileSync(file), contentType: TYPES[extname(file)] });
});
const page = await context.newPage();
let failures = 0;
let checked = 0;
for (const width of WIDTHS) {
  await page.setViewportSize({ width, height: 800 });
  for (const url of urls) {
    await page.goto('https://check.test' + url);
    const got = await page.evaluate(() => {
      const left = (el) => el && Math.round(el.getBoundingClientRect().left);
      return {
        scroll: document.documentElement.scrollWidth,
        first: left(document.querySelector('main > *')),
        footer: left(document.querySelector('.cui-footer-copyright')),
      };
    });
    checked++;
    const problems = [
      ...(got.scroll > width ? [`scrolls ${got.scroll}px wide`] : []),
      ...(got.first !== got.footer ? [`its content starts at ${got.first}px, the footer's text at ${got.footer}px`] : []),
    ];
    if (problems.length) {
      failures++;
      console.log(`FAIL ${url} at ${width}px: ${problems.join('; ')}`);
    }
  }
}
await browser.close();
rmSync(root, { recursive: true, force: true });
console.log(`layout: ${checked} pages and widths, ${failures} failures`);
process.exit(failures ? 1 : 0);
