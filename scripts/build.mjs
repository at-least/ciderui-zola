// npm run build: the files a site serves, from ciderui and css/:
// static/ciderui.css and static/fonts/ copied from ciderui's dist/site.css and
// fonts/ unchanged (the stylesheet ciderui serves and tests, its url(fonts/…)
// relative to it), and static/ciderui-zola.css compiled by Tailwind.
// --check builds into a temp dir and fails on any file that differs.

import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CIDERUI = join(ROOT, 'node_modules/ciderui');

const build = (out) => {
  mkdirSync(join(out, 'fonts'), { recursive: true });
  copyFileSync(join(CIDERUI, 'dist/site.css'), join(out, 'ciderui.css'));
  for (const font of readdirSync(join(CIDERUI, 'fonts'))) copyFileSync(join(CIDERUI, 'fonts', font), join(out, 'fonts', font));
  execFileSync(join(ROOT, 'node_modules/.bin/tailwindcss'), ['-i', join(ROOT, 'css/ciderui-zola.css'), '-o', join(out, 'ciderui-zola.css'), '--minify'], { stdio: 'pipe' });
};

const files = (dir) => ['ciderui.css', 'ciderui-zola.css', ...readdirSync(join(dir, 'fonts')).map((f) => `fonts/${f}`)].sort();

if (process.argv[2] === '--check') {
  const tmp = mkdtempSync(join(tmpdir(), 'ciderui-zola-'));
  build(tmp);
  const want = files(tmp);
  const have = files(join(ROOT, 'static'));
  const problems = [
    ...want.filter((f) => !have.includes(f)).map((f) => `missing: static/${f}`),
    ...have.filter((f) => !want.includes(f)).map((f) => `extra: static/${f}`),
    ...want.filter((f) => have.includes(f) && !readFileSync(join(tmp, f)).equals(readFileSync(join(ROOT, 'static', f)))).map((f) => `differs: static/${f}`),
  ];
  rmSync(tmp, { recursive: true, force: true });
  for (const p of problems) console.log(p);
  if (problems.length) {
    console.log('stale: npm run build');
    process.exit(1);
  }
  console.log(`static/ is up to date (${want.length} files)`);
} else {
  rmSync(join(ROOT, 'static'), { recursive: true, force: true });
  build(join(ROOT, 'static'));
}
