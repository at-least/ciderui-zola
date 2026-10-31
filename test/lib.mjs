// What the checks share: zolaBuild, a site built with the theme into a temp
// dir nothing else sees (the site copied there, the repository linked in as
// themes/ciderui-zola, extra files written into the copy first), and
// ciderui's places.

import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const CIDERUI = join(ROOT, 'node_modules/ciderui');

const { componentDir } = await import(join(CIDERUI, 'test/compile.mjs'));
// one of ciderui's examples, its id <name>/<example>
// (components/<set>/<name>/examples/<example>.html)
export const example = (id) => {
  const [name, file] = id.split('/');
  return readFileSync(join(CIDERUI, componentDir(name), 'examples', `${file}.html`), 'utf8');
};

// site: a directory under test/; files: { path in the site: content };
// returns { root, out }, the copy and its build, for the caller to remove
export function zolaBuild(site, files = {}) {
  const root = mkdtempSync(join(tmpdir(), 'ciderui-zola-check-'));
  cpSync(join(ROOT, 'test', site), root, { recursive: true });
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
    throw new Error(`zola build ${site}: ${e.stderr}`);
  }
  return { root, out };
}
