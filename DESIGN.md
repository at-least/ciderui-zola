# ciderui-zola: its design

A Zola theme on the latest ciderui (`../ciderui`, `node_modules/ciderui`). Measured means run here (Zola 0.23.6, Chromium through Playwright 1.62.1, 2026-11-12); stated is the owner's; guessed is neither.

## Decisions

1. **Rebuilt on ciderui as it is** (stated, 2026-11-12: 「直接重新用最新版的ciderui做出一個zola theme」). ciderui's decision 30 removed this theme and its decisions 29, 33 and 36 removed the parts it was built on (the docs set, article, stories, posts, local nav, section, shelf, gallery, the nav's search and bag); the theme before this one is in git history up to 12ce766. This one uses only what ciderui ships: the global nav, the footer (its directory too, ciderui's decision 47), the list, the link and the type. No tiles and no pager (ciderui has neither): `paginate_by` throws, since without a pager the pages after the first would be unreachable.
2. **ciderui's stylesheet unchanged.** `static/ciderui.css` is ciderui's `dist/site.css` byte for byte, the file ciderui serves and tests, with its fonts beside it (its `url(fonts/…)`). The theme's own `static/ciderui-zola.css` comes after it and holds only what ciderui leaves to the page: the column and the markdown's bare elements. Rejected: compiling one stylesheet from ciderui's sources, which would be a second build of ciderui that its tests never saw.
3. **The type by `@apply`** of ciderui's `type.css` utilities, so no size, line height or tracking is copied into the theme.
4. **The column is the footer's** (`cui-footer-content`: 980px, 16px and from 834px 22px gutters), so the page's left edge and the footer's line up; the markdown's measure is 692px (guessed: apple.com's article width at 735px). The vertical spacing in `css/` (52px, 40px, 25px) is guessed, not measured.
5. **No JavaScript, so no search** (ciderui has none; Zola's search needs a script). No local nav, no docs layout: ciderui has none to draw.
6. **Words are settings** (`[extra.words]`): ciderui's parts write no words of their own. Measured: Zola merges a site's `[extra.words]` over theme.toml's key by key, so a zh-Hant site setting `skip` alone kept the other English words.
7. **Components mirror ciderui's Go types** (`templates/cui.html`, Tera 2 components): the same fields, a throw where the Go type panics. A list takes its rows as a body (`cui_list_row`): Tera 2 has no filter to append to an array in a loop.

## Proof

`npm test` (package.json). `test/markup.mjs` holds each component to ciderui's examples; `test/site.mjs` runs `ciderui.CheckMarkup` (`test/checkmarkup`, a Go module replacing ciderui with `node_modules/ciderui`) over every built page; `test/layout.mjs` holds the column and the sideways scroll. Each check was seen to fail on a deliberate break (2026-11-12).
