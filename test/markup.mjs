// node test/markup.mjs: the theme's components write ciderui's markup. Each
// case is one of ciderui's site examples and the Tera that writes it, given
// the example's own text; the cases are built on one page, each in a
// <div data-example>, and each one's HTML must equal the example's, both
// normalized as ciderui's Go tests read an example (each line trimmed, the
// lines joined) and then as a browser serializes it.

import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-chromium';
import { example, zolaBuild } from './lib.mjs';

const trimmed = (html) => html.split('\n').map((l) => l.trim()).join('');
const IMAGES = [...example('tile/tiles').matchAll(/src="([^"]+)"/g)].map((m) => m[1]);
const NAV = '[{"text": "Store", "href": "/store"}, {"text": "Laptops", "href": "/laptops"}, {"text": "Tablets", "href": "/tablets"}, {"text": "Support", "href": "/support"}]';
const WORDS = 'aria_label="Global" skip_label="Skip to Content" menu_aria_label="Menu" close_aria_label="Close"';
const PREVIOUS = '{"label": "Previous page", "href": "?page=2"}';
const NEXT = '{"label": "Next page", "href": "?page=4"}';
const NONE = '{"label": "", "href": ""}';

export const CASES = [
  ['globalnav/globalnav', `{{ <cui_globalnav wordmark="Cider" home="/" links={${NAV}} ${WORDS} /> }}`],
  ['footer/footer', `{{ <cui_footer copyright="Example Inc." href="/company/" /> }}`],
  ['footer/directory', `{{ <cui_footer copyright="Example Inc." href="/company/" directory_aria_label="Directory" directory={[{"title": "Products", "links": [{"text": "Store", "href": "/store/"}, {"text": "Laptops", "href": "/laptops/"}, {"text": "Phones", "href": "/phones/"}]}, {"title": "Account", "links": [{"text": "Your Account", "href": "/account/"}, {"text": "Order History", "href": "/orders/"}]}]} /> }}`],
  ['list/list', `{% <cui_list> %}${[
    `{{ <cui_list_row title="Software keyboard fails to appear in a playground app" href="#keyboard" text="The on-screen keyboard does not appear when editing a text field in an app made and run in Swift Playgrounds. It happens in a new, empty app too, with no code of its own." aside="3 replies · 8m" /> }}`,
    `{{ <cui_list_row title="Enrollment still pending after ten days" href="#enrollment" text="Payment went through and the ID was sent the same day." aside="12 replies · 2h" /> }}`,
    `{{ <cui_list_row title="Widgets stop refreshing after an update" href="#widgets" /> }}`,
  ].join('\n')}{% </cui_list> %}`],
  ['tile/tiles', `{% <cui_tiles> %}${[
    `{{ <cui_tile href="#airpods-pro" image="${IMAGES[0]}" title="AirPods Pro 3" detail="$249.00" /> }}`,
    `{{ <cui_tile href="#airpods" image="${IMAGES[1]}" title="AirPods 5 with Wireless Charging Case" detail="$179.00" /> }}`,
    `{{ <cui_tile href="#case" image="${IMAGES[2]}" title="Silicone Case" /> }}`,
    `{{ <cui_tile href="#band" title="Sport Band" detail="$49.00" /> }}`,
  ].join('\n')}{% </cui_tiles> %}`],
  ['pager/pager', `{{ <cui_pager aria_label="Pagination" page="Page 3" first={ {"label": "First", "href": "?page=1"} } previous={ ${PREVIOUS} } next={ ${NEXT} } last={ {"label": "Last", "href": "?page=10"} } /> }}`],
  ['pager/first', `{{ <cui_pager aria_label="Pagination" page="Page 1" first={ ${NONE} } previous={ ${NONE} } next={ ${NEXT} } last={ {"label": "Last", "href": "?page=10"} } /> }}`],
];

const parity = CASES.map(([id, tera]) => `<div data-example="${id}">${tera}</div>`).join('\n');

const { root, out } = zolaBuild({
  'content/parity/_index.md': '+++\ntitle = "Parity"\ntemplate = "parity.html"\n+++\n',
  'templates/parity.html': `<!doctype html>\n<html lang="en"><body>\n${parity}\n</body></html>\n`,
});
const built = readFileSync(join(out, 'parity/index.html'), 'utf8');
rmSync(root, { recursive: true, force: true });
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(built);
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
