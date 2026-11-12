// node test/site.mjs: test/site builds with the theme, and every page has its
// title, its description, both stylesheets, no template or markdown showing
// as text (a Tera tag, a footnote's [^…], a link's ](…), **bold**), and
// nothing ciderui.CheckMarkup refuses (test/checkmarkup).

import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ROOT, pages, zolaBuild } from './lib.mjs';

const { root, out } = zolaBuild();
const found = pages(out);
let failures = 0;
for (const file of found) {
  const html = readFileSync(file, 'utf8');
  const body = html.slice(html.indexOf('<body'));
  const text = body.replace(/<pre[\s\S]*?<\/pre>/g, '').replace(/<code[\s\S]*?<\/code>/g, '').replace(/<[^>]+>/g, ' ');
  const problems = [
    [/<title>[^<]+<\/title>/.test(html), 'a title'],
    [/<meta name="description" content="[^"]+">/.test(html), 'a description'],
    [/<link rel="stylesheet" href="[^"]*\/ciderui\.css\?h=[0-9a-f]+">\n<link rel="stylesheet" href="[^"]*\/ciderui-zola\.css\?h=[0-9a-f]+">/.test(html), "ciderui's stylesheet, then the theme's"],
    [!/\{\{|\{%|\{#|%\}|#\}/.test(text), 'no Tera showing'],
    [!/\[\^[^\]]*\]|\]\([^)]*\)|\*\*[^*]+\*\*/.test(text), 'no markdown showing'],
  ].filter(([ok]) => !ok).map(([, what]) => what);
  if (problems.length) {
    failures++;
    console.log(`FAIL ${relative(out, file)}: wants ${problems.join(', ')}`);
  }
}
try {
  execFileSync('go', ['run', '.', ...found], { cwd: join(ROOT, 'test/checkmarkup'), stdio: 'pipe' });
} catch (e) {
  failures++;
  console.log(`FAIL CheckMarkup:\n${e.stdout}${e.stderr}`);
}
rmSync(root, { recursive: true, force: true });
console.log(`site: ${found.length} pages built, ${failures} failures`);
process.exit(failures ? 1 : 0);
