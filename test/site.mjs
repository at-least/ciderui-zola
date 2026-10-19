// node test/site.mjs: the sites built with the theme hold together: the
// checks' site (test/site) and ciderui's documentation (ciderui/docs, when
// it is there) build, and every page has its title, its description, the
// theme's stylesheet and script, and no template or markdown showing as
// text (a Tera tag, a footnote's [^…], a link's ](…), **bold**).

import { existsSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, symlinkSync, cpSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { CIDERUI, ROOT, zolaBuild } from './lib.mjs';

const pages = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? pages(p) : f.endsWith('.html') ? [p] : [];
});

// ciderui's documentation, built as its own site with the theme linked in
const docs = () => {
  const src = join(CIDERUI, 'docs');
  const root = mkdtempSync(join(tmpdir(), 'ciderui-zola-docs-'));
  cpSync(src, root, { recursive: true, filter: (s) => !s.includes('/themes/') && !s.includes('/public') });
  mkdirSync(join(root, 'themes'), { recursive: true });
  symlinkSync(ROOT, join(root, 'themes/ciderui-zola'));
  const out = join(root, 'public');
  try {
    execFileSync('zola', ['--root', root, 'build', '--output-dir', out], { stdio: 'pipe' });
  } catch (e) {
    throw new Error(`zola build ciderui/docs: ${e.stderr}`);
  }
  return { root, out };
};

const sites = [['test/site', () => zolaBuild('site')]];
if (existsSync(join(CIDERUI, 'docs/config.toml'))) sites.push(['ciderui/docs', docs]);

let failures = 0;
for (const [name, build] of sites) {
  const { root, out } = build();
  const found = pages(out);
  let bad = 0;
  for (const file of found) {
    const html = readFileSync(file, 'utf8');
    if (/^<!doctype html>\s*<html lang="en">\s*<meta http-equiv="refresh"/i.test(html)) continue; // Zola's redirects
    const where = `${name} ${relative(out, file)}`;
    const body = html.slice(html.indexOf('<body'));
    // the text a reader sees: tags and code blocks out
    const text = body.replace(/<pre[\s\S]*?<\/pre>/g, '').replace(/<code[\s\S]*?<\/code>/g, '').replace(/<[^>]+>/g, ' ');
    const problems = [
      [/<title>[^<]+<\/title>/.test(html), 'a title'],
      [/<meta name="description" content="[^"]+">/.test(html), 'a description'],
      [/<link rel="stylesheet" href="[^"]*ciderui-zola\.css\?h=[0-9a-f]+">/.test(html), 'the theme\'s stylesheet'],
      [/<script src="[^"]*ciderui-zola\.js\?h=[0-9a-f]+" defer><\/script>/.test(html), 'the theme\'s script'],
      [!/\{\{|\{%|\{#|%\}|#\}/.test(text), 'no Tera showing'],
      [!/\[\^[^\]]*\]|\]\([^)]*\)|\*\*[^*]+\*\*/.test(text), 'no markdown showing'],
    ].filter(([ok]) => !ok).map(([, what]) => what);
    if (problems.length) {
      bad++;
      console.log(`FAIL ${where}: wants ${problems.join(', ')}`);
    }
  }
  console.log(`${bad ? 'FAIL' : 'ok  '} ${name}: ${found.length} pages built, ${bad} with a problem`);
  failures += bad;
  rmSync(root, { recursive: true, force: true });
}
console.log(`site: ${failures} failures`);
process.exit(failures ? 1 : 0);
