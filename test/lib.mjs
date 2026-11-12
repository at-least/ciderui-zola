// What the checks share: zolaBuild, a site built with the theme into a temp
// dir nothing else sees (the site copied there, the repository linked in as
// themes/ciderui-zola, extra files written into the copy first); example,
// one of ciderui's site examples by its id <part>/<example>.

import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const CIDERUI = join(ROOT, 'node_modules/ciderui');

export const example = (id) => {
  const [part, file] = id.split('/');
  return readFileSync(join(CIDERUI, 'components/site', part, 'examples', `${file}.html`), 'utf8');
};

// files: { path in the site: content }; returns { root, out }, the copy and
// its build, for the caller to remove
export function zolaBuild(files = {}) {
  const root = mkdtempSync(join(tmpdir(), 'ciderui-zola-check-'));
  cpSync(join(ROOT, 'test/site'), root, { recursive: true });
  mkdirSync(join(root, 'themes'), { recursive: true });
  symlinkSync(ROOT, join(root, 'themes/ciderui-zola'));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  const out = join(root, 'public');
  try {
    execFileSync('zola', ['--root', root, 'build', '--output-dir', out], { stdio: 'pipe' });
  } catch (e) {
    throw new Error(`zola build: ${e.stderr}`);
  }
  return { root, out };
}

// every .html file under dir, Zola's redirects left out
export const pages = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  if (statSync(p).isDirectory()) return pages(p);
  if (!f.endsWith('.html')) return [];
  return /<meta http-equiv="refresh"/i.test(readFileSync(p, 'utf8')) ? [] : [p];
});
