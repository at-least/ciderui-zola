// Build the theme's prebuilt assets from ciderui, the files a site serves
// without Node: static/ciderui-zola.css and static/fonts/ (Inter, which
// ciderui's fonts.css loads relative to the stylesheet).
//
//   node scripts/build.mjs           write them
//   node scripts/build.mjs --check   fail if the committed ones differ
//
// The CSS is minified, as ciderui's own tests compile it (its
// test/compile.mjs), so the theme's stylesheet is the one ciderui's checks
// measured.

import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FONTS = join(ROOT, 'node_modules/ciderui/fonts');

function build(out) {
  mkdirSync(join(out, 'fonts'), { recursive: true });
  execFileSync(
    join(ROOT, 'node_modules/.bin/tailwindcss'),
    ['-i', join(ROOT, 'css/ciderui-zola.css'), '-o', join(out, 'ciderui-zola.css'), '--minify'],
    { stdio: 'pipe' },
  );
  for (const f of readdirSync(FONTS)) copyFileSync(join(FONTS, f), join(out, 'fonts', f));
}

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
      ...want.filter((f) => !have.includes(f)).map((f) => `missing: static/${f}`),
      ...have.filter((f) => !want.includes(f)).map((f) => `extra: static/${f}`),
      ...want
        .filter((f) => have.includes(f))
        .filter((f) => !readFileSync(join(tmp, f)).equals(readFileSync(join(ROOT, 'static', f))))
        .map((f) => `differs: static/${f}`),
    ];
    for (const s of stale) console.log(s);
    console.log(stale.length ? 'static/ is stale: npm run build' : `static/ is up to date (${want.length} files)`);
    process.exit(stale.length ? 1 : 0);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
} else {
  rmSync(join(ROOT, 'static/fonts'), { recursive: true, force: true });
  build(join(ROOT, 'static'));
}
