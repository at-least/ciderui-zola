// node test/markup.mjs: the theme's components write ciderui's markup. Each
// case is one of ciderui's examples (components/<name>/examples/<id>.html)
// and the Tera that writes it through the theme's components, given the
// example's own text; test/site is built with them on one page, each in a
// <div data-example>, and each one's HTML must equal the example's, both
// normalized as ciderui's crate tests normalize an example (each line
// trimmed, the lines joined) and then as a browser serializes it (so an
// apostrophe Tera escapes and hypertext does not reads the same).

import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-chromium';
import { CIDERUI, zolaBuild } from './lib.mjs';

const example = (id) => readFileSync(join(CIDERUI, 'components', id.replace('/', '/examples/') + '.html'), 'utf8');
const trimmed = (html) => html.split('\n').map((l) => l.trim()).join('');
// a Tera string: backticks, which none of the examples' text holds
const str = (s) => {
  if (s.includes('`')) throw new Error(`a backtick in ${s.slice(0, 40)}`);
  return '`' + s + '`';
};
const GIF = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
const img = (cls) => `<img class="${cls}" src="${GIF}" alt="" width="1280" height="720">`;

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


export const CASES = [
  ['link/more', `{{ <cui_more_link href="#learn" text="Learn more" /> }}`],
  ['section/section', `{% <cui_section> %}<p>Content</p>{% </cui_section> %}`],
  ['globalnav/globalnav', `{%- set f = config.extra -%}{{ <cui_globalnav logo={load_data(path=f.logo, format="plain") | trim} home="/" name="Cider" links={f.nav} search={f.search} bag={f.bag} /> }}`],
  ['footer/footer', `{%- set f = config.extra.footer -%}{{ <cui_footer notes={f.notes} directory={f.directory} shop={f.shop} copyright={f.copyright} links={f.links} locale={f.locale} /> }}`],
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
];

const parity = CASES.map(([id, tera]) => `<div data-example="${id}">${tera}</div>`).join('\n');

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const { root, out } = zolaBuild('site', { 'templates/parity.html': `<!doctype html>\n<html lang="en"><body>\n${parity}\n</body></html>\n` });
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
