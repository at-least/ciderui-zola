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
// own field sends q again. And its suggestions, two more pages here (A Plum
// Cake before Plum in the index): two characters typed, the pages whose
// title holds them, those starting with them first, and the words they
// start, five of each at most, as ciderui's rows (its
// globalnav/suggestions.html), what was typed marked, a status line saying
// so; one, or the field cleared, the quick links again, where they were
// while they stay; none found, no sections; the index fetched once. Fails at
// the first step that does not end as it says. And a nav link's flyout,
// from the site's nav: shown by the pointer, opened over the menu. And a
// docs page's copy button: shown, copying, marked copied for a second.

import { existsSync, readFileSync, rmSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { chromium } from 'playwright-chromium';
import { example, zolaBuild } from './lib.mjs';

const config = readFileSync(new URL('./site/config.toml', import.meta.url), 'utf8');
if (!config.includes('search = "/search"\n')) throw new Error('test/site/config.toml: no search = "/search" to make a flyout of');
const MAC = '{ text = "Laptops", href = "/laptops" }';
if (!config.includes(MAC)) throw new Error(`test/site/config.toml: no ${MAC} to give a flyout`);
const { root, out } = zolaBuild('site', {
  'content/behavior/_index.md': '+++\ntitle = "Behavior"\ntemplate = "behavior.html"\n+++\n',
  'templates/behavior.html': `{% extends "base.html" %}\n{% block content %}${example('gallery/gallery')}${example('shelf/paddles')}{% endblock content %}\n`,
  'config.toml': config.replace('search = "/search"\n', 'search = "/search/"\nsearch_flyout = true\nsearch_links = [{ text = "About", href = "/about/" }]\n')
    .replace(MAC, '{ text = "Laptops", href = "/laptops", flyout = [{ heading = "Explore", large = [{ text = "About", href = "/about/" }], links = [{ text = "Quince", href = "/quince/" }, { text = "Elsewhere", href = "https://example.com/" }] }] }'),
  'content/apricot.md': '+++\ntitle = "Apricot"\n+++\nA word on quince.\n',
  'content/quince.md': '+++\ntitle = "Quince"\n+++\nIts copy.\n',
  'content/plum.md': '+++\ntitle = "Plum"\n+++\nIts copy.\n',
  'content/a-plum-cake.md': '+++\ntitle = "A Plum Cake"\n+++\nIts copy.\n',
});

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.png': 'image/png', '.json': 'application/json' };
const browser = await chromium.launch({ args: ['--font-render-hinting=none'] });
const page = await browser.newPage({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce', permissions: ['clipboard-read', 'clipboard-write'] });
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

// the suggestions
const order = JSON.parse(readFileSync(join(out, 'search_index.en.json'), 'utf8')).map((p) => new URL(p.url).pathname);
if (!(order.indexOf('/a-plum-cake/') < order.indexOf('/plum/'))) throw new Error(`the index has Plum before A Plum Cake: ${order}`);
const ciderui = example('globalnav/suggestions').split('\n').map((l) => l.trim());
const exampleRows = ['href="/laptops"', 'href="/search?q=laptop"'].map((href) => ciderui.find((l) => l.includes(`class="cui-globalnav-searchlink" ${href}`)));
let fetched = 0;
page.on('request', (req) => { if (req.url().includes('search_index')) fetched++; });
const suggestions = () => page.evaluate((exampleRows) => {
  const panel = document.querySelector('.cui-globalnav-searchpanel');
  // a row as its markup, its link and text left out
  const shape = (li) => li.outerHTML.replace(/href="[^"]*"/, 'href=""').replace(/<span>.*<\/span>/, '<span></span>');
  const parsed = exampleRows.map((html) => { const t = document.createElement('template'); t.innerHTML = html; return shape(t.content.firstElementChild); });
  const lists = [...panel.querySelectorAll(':scope > .cui-globalnav-searchlinks')];
  return {
    headings: [...panel.querySelectorAll(':scope > .cui-globalnav-searchheading')].map((h) => h.textContent),
    named: lists.every((l) => document.getElementById(l.getAttribute('aria-labelledby'))?.matches('.cui-globalnav-searchheading')),
    sections: lists.map((l) => [...l.children].map((li) => {
      const a = li.querySelector('a');
      return [new URL(a.href).pathname + new URL(a.href).search, a.querySelector('mark')?.textContent ?? null, a.textContent];
    })),
    shapes: lists.map((l) => shape(l.firstElementChild) === parsed[l.querySelector('svg circle') ? 1 : 0]),
    status: document.querySelector('.cz-status')?.textContent ?? null,
    color: lists[0]?.querySelector('mark') ? [getComputedStyle(lists[0].querySelector('a')).color, getComputedStyle(lists[0].querySelector('mark')).color] : null,
    value: document.querySelector('.cui-globalnav-searchinput').value,
  };
}, exampleRows);
const typed = async (keys, said) => {
  await page.keyboard.type(keys);
  // said: the status line to wait for (null: any)
  if (said !== undefined) await page.waitForFunction((said) => { const t = document.querySelector('.cz-status').textContent; return said === null ? t !== '' : t === said; }, said);
  await page.waitForTimeout(100);
  return suggestions();
};
await page.goto('https://check.test/about/', { waitUntil: 'load' });
await page.click('.cui-globalnav-icon[popovertarget="cui-globalnav-search"]');
await page.waitForTimeout(400);
// the panel's children taken out or put in as it is typed
await page.evaluate(() => { window.czMoved = 0; new MutationObserver((records) => { window.czMoved += records.length; }).observe(document.querySelector('.cui-globalnav-searchpanel'), { childList: true }); });
r = await typed('p');
const kept = await page.evaluate(() => window.czMoved === 0);
check('one character typed: the quick links, their rows where they were (put back, they would fade in again)', JSON.stringify(r.headings) === '["Shortcuts"]' && JSON.stringify(r.sections) === '[[["/about/",null,"About"]]]' && r.status === '' && fetched === 0 && kept, { ...r, fetched, kept });
r = await typed('l', '2 Pages and 1 Searches available');
check('two: the pages whose title holds them, those starting with them first, and the words they start, what was typed marked; a status line saying so',
  JSON.stringify(r.headings) === '["Pages","Searches"]'
  && JSON.stringify(r.sections) === JSON.stringify([[['/plum/', 'Pl', 'Plum'], ['/a-plum-cake/', 'Pl', 'A Plum Cake']], [['/search/?q=plum', 'pl', 'plum']]]), r);
check('its rows ciderui\'s (globalnav/suggestions.html: a link\'s arrow, a search\'s magnifier), each list named by its heading', r.shapes.length === 2 && r.shapes.every(Boolean) && r.named, r);
check('muted, what was typed in the rows\' color (ciderui\'s, while a row marks it)', JSON.stringify(r.color) === '["rgb(110, 110, 115)","rgb(51, 51, 54)"]', r);
await page.keyboard.press('Backspace');
await page.waitForTimeout(100);
r = await suggestions();
check('back to one: the quick links again, the status line saying so, as apple.com\'s', JSON.stringify(r.headings) === '["Shortcuts"]' && r.status === '1 Shortcuts available', r);
r = await typed('lx', 'No suggestions');
check('none found: no sections, the status line saying so', r.headings.length === 0, r);
await page.fill('.cui-globalnav-searchinput', '');
r = await typed('a plum c', '1 Pages and 3 Searches available');
check('more than one word: the titles holding them all, and the words the last starts after the others', JSON.stringify(r.sections[0]) === JSON.stringify([['/a-plum-cake/', 'A Plum C', 'A Plum Cake']]) && r.sections[1].some((s) => JSON.stringify(s) === JSON.stringify(['/search/?q=a+plum+cake', 'a plum c', 'a plum cake'])), r);
await page.fill('.cui-globalnav-searchinput', '');
r = await typed('se', null);
check('the search page is not a suggested link', r.sections.length > 0 && !r.sections.flat().some(([href]) => href === '/search/'), r);
await page.click('.cui-globalnav-searchreset');
await page.waitForTimeout(100);
r = await suggestions();
check('its clear button: the field empty, the quick links again', r.value === '' && JSON.stringify(r.headings) === '["Shortcuts"]' && r.status === '1 Shortcuts available', r);
await page.focus('.cui-globalnav-searchinput');
r = await typed('st', null);
check('five of each at most, as apple.com\'s (seven stories start with it)', r.sections[0].length === 5 && r.sections[0].every(([href]) => href.startsWith('/news/story-')) && r.sections.every((rows) => rows.length <= 5), r);
await page.fill('.cui-globalnav-searchinput', '');
check('the index fetched once', fetched === 1, fetched);
await page.focus('.cui-globalnav-searchinput');
await typed('plu', null);
await page.click('.cui-globalnav-searchlinks a[href$="/plum/"]');
await page.waitForURL('**/plum/');
check('a suggested link leads to its page', new URL(page.url()).pathname === '/plum/', page.url());
check('no error with the suggestions', errors.length === 0, errors);

// a nav link's flyout from the site's [extra] nav (base.html, its paths
// through get_url): from 834px the pointer resting on its link shows it;
// below, the menu's row opens it over the menu
await page.goto('https://check.test/about/', { waitUntil: 'load' });
await page.setViewportSize({ width: 1200, height: 900 });
const mac = await page.locator('.cui-globalnav-list > li:has(> .cui-globalnav-flyout) > .cui-globalnav-link').boundingBox();
await page.mouse.move(600, 800);
await page.mouse.move(mac.x + mac.width / 2, mac.y + mac.height / 2, { steps: 8 });
await page.waitForTimeout(300);
const flyout = () => page.evaluate(() => {
  const f = document.querySelector('.cui-globalnav-flyout');
  return {
    shown: getComputedStyle(f).visibility === 'visible', open: f.matches(':popover-open'), menu: document.querySelector('.cui-globalnav-list').matches(':popover-open'),
    id: f.id, button: f.previousElementSibling.getAttribute('popovertarget'), label: f.previousElementSibling.getAttribute('aria-label'),
    heading: f.querySelector('.cui-globalnav-flyoutheading').textContent,
    links: [...f.querySelectorAll('.cui-globalnav-flyoutlink')].map((a) => [a.getAttribute('href'), a.dataset.size ?? '', a.textContent]),
  };
});
r = await flyout();
check('a nav link\'s flyout from the site\'s nav, its paths the site\'s: the pointer resting on its link shows it', r.shown && !r.open && r.id === 'cui-globalnav-flyout-2' && r.button === r.id && r.label === 'Laptops menu' && r.heading === 'Explore'
  && JSON.stringify(r.links) === JSON.stringify([['https://check.test/about/', 'lg', 'About'], ['https://check.test/quince/', '', 'Quince'], ['https://example.com/', '', 'Elsewhere']]), r);
await page.setViewportSize({ width: 390, height: 900 });
await page.click('.cui-globalnav-menubutton');
await page.click('.cui-globalnav-flyoutbutton');
await page.waitForTimeout(100);
r = await flyout();
check('below 834px, the menu\'s row opens it over the menu', r.open && r.menu, r);

// a docs page's code block (the test site's Button): its copy button shown
// by the script, a click copying the listing's code, marked copied for a
// second
await page.goto('https://check.test/reference/button/', { waitUntil: 'load' });
const copy = () => page.evaluate(() => {
  const b = document.querySelector('.cui-docs-copy-button');
  return { hidden: b.hidden, beside: b.previousElementSibling?.matches('pre.giallo') ?? false, state: b.dataset.state ?? null, code: b.previousElementSibling.textContent };
});
r = await copy();
check('a docs page\'s code block has its copy button after it, shown by the script', !r.hidden && r.beside && r.state === null, r);
await page.evaluate(() => document.querySelector('.cui-docs-copy-button').click());
await page.waitForTimeout(200);
const copied = { ...(await copy()), clipboard: await page.evaluate(() => navigator.clipboard.readText()) };
check('its click copies the listing\'s code and marks it copied', copied.state === 'copied' && copied.clipboard === copied.code && copied.code.includes('@import'), copied);
await page.waitForTimeout(1100);
r = await copy();
check('a second on, it is not marked copied', r.state === null, r);
check('no error on the docs page', errors.length === 0, errors);
await browser.close();
rmSync(root, { recursive: true, force: true });
console.log(`behavior: ${failures} failures`);
process.exit(failures ? 1 : 0);
