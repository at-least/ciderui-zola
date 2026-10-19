// node test/style.mjs: the theme's pages look as ciderui's do. Each of the
// markup check's examples (test/markup.mjs) is drawn twice in Chromium
// (--font-render-hinting=none, as ciderui's checks): ciderui's example with
// ciderui's stylesheet compiled as its own checks compile it (its
// test/compile.mjs: every component, the type's utilities, the fonts), and
// the markup the theme's components wrote with the theme's prebuilt one
// (static/ciderui-zola.css), each served with Inter. At ciderui's widths
// and both sides of 735 and 1069, every element is paired in document
// order (the markup check holds the two to the same markup), and its box
// and its computed styles must be the same, lengths within 1/32px.

import { readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-chromium';
import { CIDERUI, ROOT, zolaBuild } from './lib.mjs';
import { CASES, parityFiles } from './markup.mjs';

const WIDTHS = [1600, 1069, 1068, 735, 734, 390];
const PROPS = [
  'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index', 'box-sizing', 'float',
  'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-style', 'border-bottom-style', 'border-top-color', 'border-bottom-color',
  'border-top-left-radius', 'border-bottom-right-radius',
  'flex-direction', 'flex-wrap', 'align-items', 'justify-content', 'row-gap', 'column-gap', 'grid-template-columns',
  'overflow-x', 'overflow-y', 'visibility', 'opacity', 'transform',
  'color', 'background-color', 'box-shadow', 'backdrop-filter', 'color-scheme',
  'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing',
  'text-align', 'text-decoration-line', 'text-transform', 'white-space', 'list-style-type',
  'cursor', 'transition-property', 'transition-duration', 'scroll-snap-type', 'object-fit', 'aspect-ratio',
];

// equal strings, or the same lengths within 1/32px (layout rounds to 1/64px)
const same = (a, b) => {
  if (a === b) return true;
  const na = a.match(/-?\d*\.?\d+(?:e-?\d+)?/g), nb = b.match(/-?\d*\.?\d+(?:e-?\d+)?/g);
  if (!na || !nb || na.length !== nb.length) return false;
  if (a.replace(/-?\d*\.?\d+(?:e-?\d+)?/g, '#') !== b.replace(/-?\d*\.?\d+(?:e-?\d+)?/g, '#')) return false;
  return na.every((x, i) => Math.abs(parseFloat(x) - parseFloat(nb[i])) <= 1 / 32);
};

// ciderui's stylesheet as its checks compile it
const { compile } = await import(join(CIDERUI, 'test/compile.mjs'));
const TYPES = [...readFileSync(join(CIDERUI, 'type.css'), 'utf8').matchAll(/@utility ([a-z-]+)/g)].map((m) => m[1]).join(' ');
const components = readdirSync(join(CIDERUI, 'components')).map((c) => `@import "components/${c}/${c}.css";`).join('\n');
const theirs = compile({ css: `@import "fonts.css";\n@import "index.css";\n${components}`, classes: TYPES });
const ours = readFileSync(join(ROOT, 'static/ciderui-zola.css'), 'utf8');

// the theme's markup for each example, from the markup check's page
const { root, out } = zolaBuild('site', parityFiles());
const built = readFileSync(join(out, 'parity/index.html'), 'utf8');
rmSync(root, { recursive: true, force: true });

const browser = await chromium.launch({ args: ['--font-render-hinting=none'] });
const page = await browser.newPage();
// two origins: the example with ciderui's stylesheet, the theme's markup
// with the theme's; Inter from ciderui's files for both
const served = {};
await page.route(/^https:\/\/(ciderui|theme)\.test\//, (route) => {
  const url = new URL(route.request().url());
  if (url.pathname.startsWith('/fonts/')) return route.fulfill({ body: readFileSync(join(CIDERUI, url.pathname)), contentType: 'font/woff2' });
  if (url.pathname === '/style.css') return route.fulfill({ body: url.host === 'ciderui.test' ? theirs : ours, contentType: 'text/css' });
  return route.fulfill({ body: served[url.host], contentType: 'text/html' });
});
const document = (html) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="stylesheet" href="/style.css"></head><body>${html}</body></html>`;

// every element under the body, in order: its tag, box and styles
const describe = () => [...document.body.querySelectorAll('*')].map((e) => {
  const r = e.getBoundingClientRect();
  const cs = getComputedStyle(e);
  return { tag: e.tagName, cls: e.getAttribute('class') ?? '', box: [r.left, r.top, r.width, r.height].map(String), styles: Object.fromEntries(PROPS_.map((p) => [p, cs.getPropertyValue(p)])) };
});

const themeMarkup = await (async () => {
  await page.setContent(built);
  return Object.fromEntries(await page.evaluate((ids) => ids.map((id) => [id, document.querySelector(`[data-example="${id}"]`).innerHTML]), CASES.map(([id]) => id)));
})();

let compared = 0;
const failures = [];
for (const [id] of CASES) {
  served['ciderui.test'] = document(readFileSync(join(CIDERUI, 'components', id.replace('/', '/examples/') + '.html'), 'utf8'));
  served['theme.test'] = document(themeMarkup[id]);
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    const read = async (host) => {
      await page.goto(`https://${host}/`, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      return page.evaluate(`(${describe.toString().replace('PROPS_', JSON.stringify(PROPS))})()`);
    };
    const want = await read('ciderui.test');
    const got = await read('theme.test');
    if (want.length !== got.length) {
      failures.push(`${id} at ${width}px: ${got.length} elements, ciderui's ${want.length}`);
      continue;
    }
    want.forEach((w, i) => {
      const g = got[i];
      const where = `${id} at ${width}px: ${w.tag.toLowerCase()}.${w.cls.split(' ')[0]} (#${i})`;
      if (g.tag !== w.tag || g.cls !== w.cls) return failures.push(`${where}: the theme's is ${g.tag.toLowerCase()}.${g.cls}`);
      ['left', 'top', 'width', 'height'].forEach((k, j) => {
        compared++;
        if (!same(g.box[j], w.box[j])) failures.push(`${where}: box ${k} ${g.box[j]}, ciderui's ${w.box[j]}`);
      });
      for (const p of PROPS) {
        compared++;
        if (!same(g.styles[p], w.styles[p])) failures.push(`${where}: ${p} ${g.styles[p]}, ciderui's ${w.styles[p]}`);
      }
    });
  }
  console.log(`${failures.length ? '…' : 'ok  '} ${id}`);
}
await browser.close();
for (const f of failures.slice(0, 40)) console.log(`FAIL ${f}`);
if (failures.length > 40) console.log(`… and ${failures.length - 40} more`);
console.log(`style: ${CASES.length} examples at ${WIDTHS.length} widths, ${compared} values compared, ${failures.length} failures`);
process.exit(failures.length ? 1 : 0);
