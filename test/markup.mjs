// node test/markup.mjs: the theme's components write ciderui's markup. Each
// case is one of ciderui's examples (components/<set>/<name>/examples/<id>.html)
// and the Tera that writes it through the theme's components, given the
// example's own text; test/site is built with them on one page, each in a
// <div data-example>, and each one's HTML must equal the example's, both
// normalized as ciderui's crate tests normalize an example (each line
// trimmed, the lines joined) and then as a browser serializes it (so an
// apostrophe Tera escapes and hypertext does not reads the same).

import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-chromium';
import { example, zolaBuild } from './lib.mjs';

const trimmed = (html) => html.split('\n').map((l) => l.trim()).join('');
// a Tera string: backticks, which none of the examples' text holds
const str = (s) => {
  if (s.includes('`')) throw new Error(`a backtick in ${s.slice(0, 40)}`);
  return '`' + s + '`';
};
const PICTURE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgwIiBoZWlnaHQ9IjcyMCIvPg==';
const img = (cls) => `<img class="${cls}" src="${PICTURE}" alt="" width="1280" height="720">`;

// the article's copy, as its example gives it
const articleBody = (() => {
  const html = trimmed(example('article/article'));
  const open = '<div class="cui-article-body">';
  return html.slice(html.indexOf(open) + open.length, html.lastIndexOf('</div></article>'));
})();

const story = (size, href, category, datetime, date, headline) =>
  `<li>{{ <cui_story size="${size}" href="${href}" media=${str(img('cui-story-media'))} category="${category}" datetime="${datetime}" date="${date}" headline=${str(headline)} /> }}</li>`;
const post = (href, category, datetime, date, headline) =>
  `<li>{{ <cui_post href="${href}" media=${str(img('cui-post-media'))} category="${category}" datetime="${datetime}" date="${date}" headline=${str(headline)} /> }}</li>`;


// the docs examples' rows and topics (ciderui's docs-navigator, docs-topics
// and docs-page examples)
const row = (label, href, current = false, open = false, children = []) => ({ label, href, current, open, children });
const NAVIGATOR = [
  row('Getting started', '#getting-started'),
  row('Crash reports', '#crash-reports', false, true, [{ group: 'Reports' }, row('Reading a crash report', '#reading', true), row('Symbolicating a backtrace', '#symbolicating')]),
  row('Alerts', '#alerts', false, false, [row('Routing an alert', '#routing')]),
];
const PAGE_NAVIGATOR = [
  row('Getting started', '#getting-started'),
  row('Crash reports', '#crash-reports', false, true, [row('Reading a crash report', '#reading', true), row('Symbolicating a backtrace', '#symbolicating')]),
];
const TOPICS = [{ heading: 'Crash reports', topics: [
  { label: 'Symbolicating a backtrace', href: '#symbolicating', abstract: 'Replace the addresses in a backtrace with the names of the functions they fall in.', collection: false },
  { label: 'Identifying the cause of common crashes', href: '#common-crashes', abstract: 'Match a crash report to a pattern and find what to fix.', collection: false },
  { label: 'Alerts', href: '#alerts', abstract: 'Hear about a new crash where your team already is.', collection: true },
] }];

export const CASES = [
  ['link/more', `{{ <cui_more_link href="#learn" text="Learn more" /> }}`],
  ['section/section', `{% <cui_section> %}<p>Content</p>{% </cui_section> %}`],
  ['globalnav/globalnav', `{%- set f = config.extra -%}{{ <cui_globalnav logo={load_data(path=f.logo, format="plain") | trim} home="/" name="Cider" links={f.nav} search={f.search} bag={f.bag} /> }}`],
  ['globalnav/search', `{%- set f = config.extra -%}{{ <cui_globalnav logo={load_data(path=f.logo, format="plain") | trim} home="/" name="Cider" links={f.nav} search={f.search} bag={f.bag} search_flyout={true} search_links={[{"text": "Visit a Store", "href": "/retail"}, {"text": "Laptops", "href": "/laptops"}, {"text": "Tablets", "href": "/tablets"}, {"text": "Gift Cards", "href": "/gift-cards"}, {"text": "Support", "href": "/support"}]} /> }}`],
  // its links as JSON: a Tera literal holds arrays of two dimensions at most
  ['globalnav/flyout', `{%- set f = config.extra -%}{{ <cui_globalnav logo={load_data(path=f.logo, format="plain") | trim} home="/" name="Cider" links={load_data(literal=${str(JSON.stringify([
    { text: 'Store', href: '/store', flyout: [
      { heading: 'Shop', large: [{ text: 'New Arrivals', href: '/store' }, { text: 'Laptops', href: '/shop/laptops' }, { text: 'Tablets', href: '/shop/tablets' }, { text: 'Phones', href: '/shop/phones' }], links: [{ text: 'Accessories', href: '/shop/accessories' }] },
      { heading: 'Shortcuts', links: [{ text: 'Visit a Store', href: '/retail' }, { text: 'Track an Order', href: '/shop/orders' }, { text: 'Trade In', href: '/shop/trade-in' }] }] },
    { text: 'Laptops', href: '/laptops', flyout: [
      { heading: 'Laptops', large: [{ text: 'All Laptops', href: '/laptops' }, { text: 'Cider Book 13', href: '/cider-book-13' }, { text: 'Cider Book 15', href: '/cider-book-15' }, { text: 'Cider Desk', href: '/cider-desk' }], links: [{ text: 'Compare Models', href: '/laptops/compare' }] },
      { heading: 'Buy', links: [{ text: 'Buy a Laptop', href: '/shop/laptops' }, { text: 'Laptop Accessories', href: '/shop/laptops/accessories' }, { text: 'Financing', href: '/shop/financing' }] },
      { heading: 'More', links: [{ text: 'Laptop Support', href: '/support/laptops' }, { text: 'Cider OS', href: '/cider-os' }, { text: 'Sync Across Devices', href: '/sync' }] }] },
    { text: 'Tablets', href: '/tablets' }, { text: 'Support', href: '/support' }]))}, format="json")} search={f.search} bag={f.bag} /> }}`],
  ['globalnav/bag', `{%- set f = config.extra -%}{{ <cui_globalnav logo={load_data(path=f.logo, format="plain") | trim} home="/" name="Cider" links={f.nav} search={f.search} bag_flyout={true} bag_message="Nothing here yet." bag_line={load_data(literal=${str(JSON.stringify({ text: 'Sign in', href: '/signin', rest: ' for items you saved earlier' }))}, format="json")} bag_heading="Account" bag_links={load_data(literal=${str(JSON.stringify([
    { icon: 'orders', text: 'Orders', href: '/orders' }, { icon: 'saves', text: 'Saved Items', href: '/saves' },
    { icon: 'account', text: 'Settings', href: '/account' }, { icon: 'sign_in', text: 'Sign in', href: '/signin' }]))}, format="json")} /> }}`],
  ['field/field', `{{ <cui_field id="email" kind="email" name="email" label="Email" autocomplete="email" /> }}`],
  ['field/filled', `{{ <cui_field id="zip" kind="text" name="zip" label="ZIP Code" autocomplete="postal-code" value="10001" /> }}`],
  ['footer/footer', `{%- set f = config.extra.footer -%}{{ <cui_footer notes={f.notes} directory={f.directory} shop={f.shop} copyright={f.copyright} links={f.links} locale={f.locale} /> }}`],
  ['localnav/localnav', `{{ <cui_localnav title="Cider Book 13" href="/cider-book/" links={[{"text": "Overview", "href": "/cider-book/"}, {"text": "Tech Specs", "href": "/cider-book/specs/"}, {"text": "Compare", "href": "/cider-book/compare/"}, {"text": "Switch to Cider Book", "href": "/cider-book/switch/"}]} current="/cider-book/" button={ {"text": "Buy", "href": "/buy/cider-book/"} } /> }}`],
  ['article/article', `{% <cui_article category="Update" datetime="2026-10-19" date="October 19, 2026" headline="ciderui comes to Zola" subhead=${str("The kit's look, now for a static site's pages and its news.")}> %}${articleBody}{% </cui_article> %}`],
  ['stories/stories', `{% <cui_stories heading="Latest News"> %}${[
    story('lg', '/news/zola/', 'Update', '2026-10-19', 'October 19, 2026', 'ciderui comes to Zola'),
    story('md', '/news/article/', 'Update', '2026-10-18', 'October 18, 2026', "An article in the Newsroom's look"),
    story('md', '/news/stories/', 'Feature', '2026-10-17', 'October 17, 2026', 'A grid of stories'),
    story('', '/news/archive/', 'Update', '2026-10-16', 'October 16, 2026', "The archive's rows"),
    story('', '/news/fonts/', 'Update', '2026-10-15', 'October 15, 2026', 'Inter where SF is not'),
    story('', '/news/tokens/', 'Update', '2026-10-14', 'October 14, 2026', 'A fixed palette'),
  ].join('')}{% </cui_stories> %}`],
  ['posts/archive', `{% <cui_posts heading="October 2026"> %}${[
    post('/news/zola/', 'Update', '2026-10-19', 'October 19, 2026', 'ciderui comes to Zola'),
    post('/news/article/', 'Update', '2026-10-18', 'October 18, 2026', "An article in the Newsroom's look"),
    post('/news/stories/', 'Feature', '2026-10-17', 'October 17, 2026', 'A grid of stories'),
  ].join('')}{% </cui_posts> %}`],
  ['posts/related', `{% <cui_posts size="sm" heading="More from the Newsroom"> %}${[
    post('/news/archive/', 'Update', '2026-10-16', 'October 16, 2026', "The archive's rows"),
    post('/news/fonts/', 'Update', '2026-10-15', 'October 15, 2026', 'Inter where SF is not'),
  ].join('')}{% </cui_posts> %}`],
  // the docs set's: a list of rows or groups is JSON, its pages under a
  // page a third dimension
  // an alert as Zola writes it (github_alerts), on a docs page
  ['docs-aside/note', `{{ <cui_markdown html=${str('<blockquote class="markdown-alert-note">\n<p>A report from a beta build carries its beta identifier; one from the App Store does not.</p>\n</blockquote>')} docs={true} /> }}`],
  ['docs-copy/copy', `<div class="cui-docs-content">{% <cui_docs_copy> %}<pre><code>@import "ciderui/docs.css";</code></pre>{% </cui_docs_copy> %}</div>`],
  ['docs-bar/bar', `{{ <cui_docs_bar title="Documentation" href="#documentation" navigator="docs-navigator" /> }}`],
  ['docs-hero/hero', `{{ <cui_docs_hero title="Reading a crash report" crumbs={[{"label": "Crash reports", "href": "#crash-reports"}, {"label": "Diagnosing crashes", "href": "#diagnosing"}]} eyebrow="Article" abstract="Find the thread that crashed, the frame that failed and the images it had loaded." /> }}`],
  ['docs-navigator/navigator', `{{ <cui_docs_navigator title="Crashes" href="#crashes" items={load_data(literal=${str(JSON.stringify(NAVIGATOR))}, format="json")} /> }}`],
  ['docs-topics/topics', `{{ <cui_docs_topics title="See Also" groups={load_data(literal=${str(JSON.stringify(TOPICS))}, format="json")} /> }}`],
  ['docs-page/page', `{% <cui_docs_page title="Crashes" href="#crashes" navigator={load_data(literal=${str(JSON.stringify(PAGE_NAVIGATOR))}, format="json")}> %}<div class="cui-docs-page-column">{{ <cui_docs_hero title="Reading a crash report" crumbs={[{"label": "Crash reports", "href": "#crash-reports"}]} eyebrow="Article" abstract="Find the thread that crashed, the frame that failed and the images it had loaded." /> }}</div><div class="cui-docs-page-column"><div class="cui-docs-content"><h2>Overview</h2><p>A crash report records what an app was doing when it stopped.</p></div></div><div class="cui-docs-page-column">{{ <cui_docs_topics title="See Also" groups={load_data(literal=${str(JSON.stringify([{ heading: '', topics: [TOPICS[0].topics[0]] }]))}, format="json")} /> }}</div>{% </cui_docs_page> %}`],
];

const parity = CASES.map(([id, tera]) => `<div data-example="${id}">${tera}</div>`).join('\n');

// the files that put the examples on the checks' site, at /parity/
export const parityFiles = () => ({
  'content/parity/_index.md': '+++\ntitle = "Parity"\ntemplate = "parity.html"\n+++\n',
  'templates/parity.html': `<!doctype html>\n<html lang="en"><body>\n${parity}\n</body></html>\n`,
});

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const { root, out } = zolaBuild('site', parityFiles());
  const built = readFileSync(join(out, 'parity/index.html'), 'utf8');
  rmSync(root, { recursive: true, force: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(built);
  // the browser's serialization of each, the theme's and ciderui's
  const serialize = (html) => page.evaluate((h) => { const t = document.createElement('template'); t.innerHTML = h; return t.innerHTML; }, html);
  let failures = 0;
  for (const [id] of CASES) {
    const theirs = await page.evaluate((id) => document.querySelector(`[data-example="${id}"]`).innerHTML, id);
    const got = await serialize(trimmed(theirs));
    const want = await serialize(trimmed(example(id)));
    if (got === want) {
      console.log(`ok   ${id}`);
    } else {
      failures++;
      let i = 0;
      while (got[i] === want[i]) i++;
      console.log(`FAIL ${id}: differs at ${i}\n  got:  …${got.slice(Math.max(0, i - 60), i + 80)}\n  want: …${want.slice(Math.max(0, i - 60), i + 80)}`);
    }
  }
  await browser.close();
  console.log(`markup: ${CASES.length - failures} of ${CASES.length} examples written as ciderui's`);
  process.exit(failures ? 1 : 0);
}
