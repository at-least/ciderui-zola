// node test/behavior.mjs: the theme's script (static/ciderui-zola.js), step
// by step, on a page of the checks' site (base.html, so the script comes as
// a site's pages load it) holding ciderui's gallery example (its paddles and
// dots) and its shelf with paddles, at 390px, where their rows overflow,
// motion reduced so each scroll lands at once: a paddle scrolls its row by
// its width and the one at an end is disabled; the dot of the item the row
// shows is current; a dot scrolls the row to its item. Fails at the first
// step that does not end as it says.

import { existsSync, readFileSync, rmSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { chromium } from 'playwright-chromium';
import { CIDERUI, zolaBuild } from './lib.mjs';

const example = (id) => readFileSync(join(CIDERUI, 'components', id.replace('/', '/examples/') + '.html'), 'utf8');
const { root, out } = zolaBuild('site', {
  'content/behavior/_index.md': '+++\ntitle = "Behavior"\ntemplate = "behavior.html"\n+++\n',
  'templates/behavior.html': `{% extends "base.html" %}\n{% block content %}${example('gallery/gallery')}${example('shelf/paddles')}{% endblock content %}\n`,
});

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.png': 'image/png' };
const browser = await chromium.launch({ args: ['--font-render-hinting=none'] });
const page = await browser.newPage({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });
await page.route('https://check.test/**', (route) => {
  let f = join(out, decodeURIComponent(new URL(route.request().url()).pathname));
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) return route.fulfill({ status: 404, body: '' });
  route.fulfill({ body: readFileSync(f), contentType: TYPES[extname(f)] ?? 'application/octet-stream' });
});
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('https://check.test/behavior/', { waitUntil: 'load' });

const state = (row) => page.evaluate((row) => {
  const r = document.getElementById(row);
  const paddles = [...document.querySelectorAll(`[aria-controls="${row}"]`)];
  return {
    scroll: Math.round(r.scrollLeft), max: r.scrollWidth - r.clientWidth, width: r.clientWidth,
    previous: paddles[0].disabled, next: paddles[1].disabled,
    current: [...document.querySelectorAll('.cui-gallery-dot')].filter((d) => r.contains(document.getElementById(d.hash.slice(1)))).findIndex((d) => d.getAttribute('aria-current') === 'true'),
  };
}, row);
const settle = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 100)))));
let failures = 0;
const check = (claim, ok, got) => {
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${claim}${ok ? '' : `: ${JSON.stringify(got)}`}`);
};

// the gallery
let s = await state('gallery');
check('the gallery overflows its row at 390px', s.max > 0, s);
check('at its start, its previous paddle is disabled, its next one not, its first dot current', s.scroll === 0 && s.previous && !s.next && s.current === 0, s);
await page.click('[aria-controls="gallery"][aria-label="Next"]');
await settle();
const first = s;
s = await state('gallery');
check('Next scrolls the row on, about its width (its snap settling it)', s.scroll > first.width / 2 && s.scroll <= first.width + 20, s);
check('then neither paddle is disabled, and a later dot is current', !s.previous && !s.next && s.current > 0, s);
for (let i = 0; i < 10 && !(await state('gallery')).next; i++) {
  await page.click('[aria-controls="gallery"][aria-label="Next"]');
  await settle();
}
s = await state('gallery');
check('at its end, its next paddle is disabled, its last dot current', s.next && !s.previous && s.scroll >= s.max - 1 && s.current === 3, s);
await page.click('.cui-gallery-dot[href="#gallery-1"]');
await settle();
s = await state('gallery');
check('the first dot scrolls the row back to its first item, current, the previous paddle disabled', s.scroll === 0 && s.current === 0 && s.previous && !s.next, s);
check('a dot leaves the page where it was (no jump to its item)', (await page.evaluate(() => location.hash)) === '', await page.evaluate(() => location.hash));

// the shelf: paddles alone, shown on a screen that can hover
s = await state('shelf');
check('the shelf overflows, at its start its previous paddle disabled', s.max > 0 && s.scroll === 0 && s.previous && !s.next, s);
await page.evaluate(() => document.querySelector('[aria-controls="shelf"][aria-label="Next"]').click());
await settle();
s = await state('shelf');
check('the shelf\'s Next scrolls it on, the previous paddle enabled', s.scroll > 0 && !s.previous, s);

check('no error on the page', errors.length === 0, errors);
await browser.close();
rmSync(root, { recursive: true, force: true });
console.log(`behavior: ${failures} failures`);
process.exit(failures ? 1 : 0);
