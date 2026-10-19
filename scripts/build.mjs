// Build the theme's prebuilt assets from ciderui, the files a site serves
// without Node: static/ciderui-zola.css and static/fonts/ (Inter, which
// ciderui's fonts.css loads relative to the stylesheet); and
// templates/cui-icons.html, ciderui's icons (its crate's rust/src/icon.rs)
// as the Tera component the templates draw them with.
//
//   node scripts/build.mjs           write them
//   node scripts/build.mjs --check   fail if the committed ones differ
//
// The CSS is minified, as ciderui's own tests compile it (its
// test/compile.mjs), so the theme's stylesheet is the one ciderui's checks
// measured.

import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FONTS = join(ROOT, 'node_modules/ciderui/fonts');
const ICONS = join(ROOT, 'node_modules/ciderui/rust/src/icon.rs');

// cui_icon(name, class=""): the crate's Icon::write, as Tera: an <svg> with
// its class, aria-hidden, its box and what is drawn in it
function icons() {
  const found = [...readFileSync(ICONS, 'utf8').matchAll(/pub const ([A-Z_]+): Icon = Icon \{\s*width: "([^"]+)",\s*height: "([^"]+)",\s*view_box: "([^"]+)",\s*inner: r#"(.*?)"#,\s*\};/gs)];
  if (!found.length) throw new Error(`no icons in ${ICONS}`);
  const branches = found.map(([, name, width, height, viewBox, inner], i) =>
    `{%- ${i ? 'elif' : 'if'} name == "${name.toLowerCase()}" -%}\n<svg{% if class %} class="{{ class }}"{% endif %} aria-hidden="true" width="${width}" height="${height}" viewBox="${viewBox}">${inner}</svg>`);
  return `{#- cui_icon: one of ciderui's icons by its name in the crate, in small letters
    (more, search, search_compact, bag, bag_compact, menu, chevron,
    paddle_previous, paddle_next, check, disclosure, footer_chevron), with
    class on its <svg>. Written by scripts/build.mjs from ciderui's
    rust/src/icon.rs: not edited by hand. -#}
{% component cui_icon(name, class="") -%}
${branches.join('\n')}
{%- else -%}
{{ throw(message="ciderui-zola: no icon " ~ name) }}
{%- endif -%}
{%- endcomponent cui_icon %}
`;
}

function build(out) {
  mkdirSync(join(out, 'fonts'), { recursive: true });
  execFileSync(
    join(ROOT, 'node_modules/.bin/tailwindcss'),
    ['-i', join(ROOT, 'css/ciderui-zola.css'), '-o', join(out, 'ciderui-zola.css'), '--minify'],
    { stdio: 'pipe' },
  );
  for (const f of readdirSync(FONTS)) copyFileSync(join(FONTS, f), join(out, 'fonts', f));
}

const ICON_FILE = 'templates/cui-icons.html';

// every built file, relative to its directory
function files(dir) {
  return ['ciderui-zola.css', ...readdirSync(join(dir, 'fonts')).map((f) => `fonts/${f}`)].sort();
}

if (process.argv[2] === '--check') {
  const tmp = mkdtempSync(join(tmpdir(), 'ciderui-zola-'));
  try {
    build(tmp);
    const want = files(tmp);
    const have = files(join(ROOT, 'static'));
    const stale = [
      ...(readFileSync(join(ROOT, ICON_FILE), 'utf8') === icons() ? [] : [`differs: ${ICON_FILE}`]),
      ...want.filter((f) => !have.includes(f)).map((f) => `missing: static/${f}`),
      ...have.filter((f) => !want.includes(f)).map((f) => `extra: static/${f}`),
      ...want
        .filter((f) => have.includes(f))
        .filter((f) => !readFileSync(join(tmp, f)).equals(readFileSync(join(ROOT, 'static', f))))
        .map((f) => `differs: static/${f}`),
    ];
    for (const s of stale) console.log(s);
    console.log(stale.length ? 'stale: npm run build' : `static/ and ${ICON_FILE} are up to date (${want.length + 1} files)`);
    process.exit(stale.length ? 1 : 0);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
} else {
  rmSync(join(ROOT, 'static/fonts'), { recursive: true, force: true });
  // the icons first: the stylesheet's build scans the templates
  writeFileSync(join(ROOT, ICON_FILE), icons());
  build(join(ROOT, 'static'));
}
