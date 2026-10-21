// node test/behavior.mjs: the theme's script (static/ciderui-zola.js), step
// by step, on a page of the checks' site (base.html, so the script comes as
// a site's pages load it) holding ciderui's gallery example (its paddles and
// dots) and its shelf with paddles, at 390px, where their rows overflow,
// motion reduced so each scroll lands at once: a paddle scrolls its row by
// its width and the one at an end is disabled; the dot of the item the row
// shows is current; a dot scrolls the row to its item. Then the search,
// the site's nav's a flyout here (search_flyout) and two pages of its own
// (Apricot, its text holding quince, before Quince in the index): the
// nav's search sends q to the search page (search.html), which lists the
// pages holding each of its words from Zola's index, those with them in
// their title first, says when there are none, and is not one itself; its
// own field sends q again. Fails at the first step that does not end as it
// says.

import { existsSync, readFileSync, rmSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { chromium } from 'playwright-chromium';
import { CIDERUI, zolaBuild } from './lib.mjs';

const example = (id) => readFileSync(join(CIDERUI, 'components', id.replace('/', '/examples/') + '.html'), 'utf8');
const config = readFileSync(new URL('./site/config.toml', import.meta.url), 'utf8');
if (!config.includes('search = "/search"\n')) throw new Error('test/site/config.toml: no search = "/search" to make a flyout of');
const { root, out } = zolaBuild('site', {
  'content/behavior/_index.md': '+++\ntitle = "Behavior"\ntemplate = "behavior.html"\n+++\n',
  'templates/behavior.html': `{% extends "base.html" %}\n{% block content %}${example('gallery/gallery')}${example('shelf/paddles')}{% endblock content %}\n`,
  'config.toml': config.replace('search = "/search"\n', 'search = "/search/"\nsearch_flyout = true\nsearch_links = [{ text = "About", href = "/about/" }]\n'),
  'content/apricot.md': '+++\ntitle = "Apricot"\n+++\nA word on quince.\n',
  'content/quince.md': '+++\ntitle = "Quince"\n+++\nIts copy.\n',
});

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.png': 'image/png', '.json': 'application/json' };
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

// the search
const index = JSON.parse(readFileSync(join(out, 'search_index.en.json'), 'utf8')).map((p) => new URL(p.url).pathname);
if (!(index.indexOf('/apricot/') < index.indexOf('/quince/'))) throw new Error(`the index has Quince before Apricot: ${index}`);
const results = () => page.evaluate(() => ({
  q: document.querySelector('.cz-search input[name="q"]').value,
  heading: document.querySelector('.cz-main > .cui-posts .cui-posts-heading')?.textContent ?? null,
  list: !!document.querySelector('.cz-main > .cui-posts .cui-posts-list'),
  rows: [...document.querySelectorAll('.cz-main > .cui-posts .cui-post')].map((a) => [new URL(a.href).pathname, a.querySelector('.cui-post-headline').textContent]),
  at: location.pathname + location.search,
}));
const search = async (q) => {
  await page.goto(`https://check.test/search/${q === null ? '' : `?q=${encodeURIComponent(q)}`}`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('.cz-search input').value !== '' || !location.search);
  await page.waitForTimeout(300);
  return results();
};
await page.goto('https://check.test/about/', { waitUntil: 'load' });
await page.click('.cui-globalnav-icon[popovertarget="cui-globalnav-search"]');
await page.waitForTimeout(400);
await page.fill('.cui-globalnav-searchinput', 'quince');
await page.press('.cui-globalnav-searchinput', 'Enter');
await page.waitForURL('**/search/?q=quince');
await page.waitForTimeout(300);
let r = await results();
check('the nav\'s search (its flyout) sends q to the search page, which holds it in its field', r.at === '/search/?q=quince' && r.q === 'quince', r);
check('the pages holding its word are its rows, the one with it in its title first', JSON.stringify(r.rows) === JSON.stringify([['/quince/', 'Quince'], ['/apricot/', 'Apricot']]) && r.heading === 'Results for “quince”', r);
r = await search('quince word');
check('a page must hold each of its words', JSON.stringify(r.rows) === JSON.stringify([['/apricot/', 'Apricot']]), r);
r = await search('every element');
check('a page\'s description is searched too (include_description)', JSON.stringify(r.rows) === JSON.stringify([['/about/', 'About']]), r);
r = await search('zzz');
check('none: its heading says so, with no list', r.heading === 'No results for “zzz”' && !r.list && r.rows.length === 0, r);
r = await search('search');
check('the search page itself is not a result', !r.rows.some(([href]) => href === '/search/'), r);
r = await search(null);
check('no query: no rows, its field empty', r.heading === null && r.q === '', r);
await page.fill('.cz-search input[name="q"]', 'apricot');
await page.press('.cz-search input[name="q"]', 'Enter');
await page.waitForURL('**/search/?q=apricot');
await page.waitForTimeout(300);
r = await results();
check('its own field sends q to it again', JSON.stringify(r.rows) === JSON.stringify([['/apricot/', 'Apricot']]), r);
check('no error on the search pages', errors.length === 0, errors);
await browser.close();
rmSync(root, { recursive: true, force: true });
console.log(`behavior: ${failures} failures`);
process.exit(failures ? 1 : 0);
