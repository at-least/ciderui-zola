# ciderui-zola: its design

ciderui-zola is a [Zola](https://www.getzola.org) theme in apple.com's look, built on [ciderui](../ciderui): a site's pages, its news (apple.com's Newsroom), and the documentation of ciderui itself, which is its first site. A site needs only `zola` (0.23.6 or later): the theme ships its stylesheet, its fonts and its one script prebuilt. It is vpkit-zola's architecture (`../vpkit-zola`) with ciderui where vpkit-zola has vpkit, and without its docs layout. This documents what is decided, and was written before the templates; it is kept to them.

What is called measured here was run (Zola 0.23.6, Tera 2.4.0, Chromium 151 through Playwright, 2026-10-19); stated is the owner's; guessed is neither.

## Who it is for

- **ciderui's documentation first** (stated, 2026-10-19: of the owner's sites, only it, for now): a page per component, each an article with its live examples; built from `ciderui/docs/`, as vpkit's from `vpkit/docs/`, with this theme.
- **News, in the Newsroom's look** (stated, 2026-10-19: 「現在一起做」): a section of articles, its index a grid of stories, its archive the months' rows (ciderui's `cui-article`, `cui-stories`, `cui-posts`, measured from apple.com's Newsroom on 2026-10-19).
- In English, as ciderui is (stated). The owner's product sites (conch's, OwnMusic's, OwnPlayer's) may move to it later (guessed; none is planned).
- The repository is local, with no remote (stated): a site takes it as `themes/ciderui-zola`, a path or a link.

## The standard

ciderui is the standard, and ciderui's is apple.com, measured. The theme proves it did not break the link below it: that its templates write ciderui's markup and that its stylesheet is ciderui's. It does not measure apple.com again; a part with no apple.com instance (a page's skeleton, a docs page) is ciderui's own, golden, with its reason.

## What the theme is

1. **Prebuilt, no Node for a site.** `npm run build` compiles `css/ciderui-zola.css` with the Tailwind CLI into `static/ciderui-zola.css` (Tailwind's preflight and theme, ciderui's tokens, base, type and the components the templates write, and every one of ciderui's type utilities, since a site's markdown is not scanned) and copies ciderui's Inter into `static/fonts/` (measured: the type utilities exist only where the CLI scans their class, 46,366 bytes with all 22, minified). `npm test` begins with `build --check`: a stale stylesheet fails it. ciderui is a sibling checkout, `"ciderui": "file:../ciderui"`; each rebuild names ciderui's commit in its message, as vpkit-zola's do vpkit's.
2. **The templates write ciderui's markup, and nothing else.** Each part a page has is a Tera component named after the crate's (`cui_article`, `cui_stories`, `cui_story`, `cui_posts`, `cui_post`, `cui_section`, `cui_tile`, …), its parameters the crate's fields; a test renders each through Zola and holds it to ciderui's `examples/*.html`, normalized as the crate's tests normalize them, so the theme, the crate and the CSS cannot part.
3. **Markdown as ciderui styles it.** `cui-article` styles the plain elements markdown writes, so a page's content goes in as Zola renders it, but for what Zola writes that ciderui reads otherwise (`templates/cui-markdown.html`, string replacements on Zola's output, as vpkit-zola's): a footnote's mark loses its brackets (`[1]` to `1`), its notes' section is `cui-article-footnotes`; a code block loses Giallo's `style` on `<pre>` (measured: `color-scheme: light dark`, which would follow the reader's OS, and its own ground), keeping the tokens' `light-dark()` colors, which follow the block's scheme as ciderui's do. The templates refuse a site whose `[markdown]` settings they cannot read (vpkit-zola's way): `bottom_footnotes = true`, `insert_anchor_links = "none"` (apple.com's headings have no anchor), `github_alerts = false` (ciderui has no alert), `[markdown.highlighting] style = "inline"`.
4. **One script.** `static/ciderui-zola.js` does what ciderui leaves to the page (stated, 2026-10-19: 「附一支小 script」): a gallery's and a shelf's paddles scroll their row by a page and are disabled at its ends, a gallery's dot is `aria-current` for the item in view. Without it the rows still scroll and snap, and each dot is a link to its item. And the search page's results (added 2026-10-21, the owner's work left to my judgment: 「你決定，一項一項全部做完」): a static site has no server to search it, so the script reads Zola's own index (`fuse_json`, the pages' titles, descriptions and text as JSON) and lists the pages holding each word of the query, those with the most of them in their title first, with no library; without it the page shows its field alone and says so. Nothing else needs a script: the global nav's menu and its search are popovers (the search's form sends `q` to the search page with no script), the local nav's and the footer's sections checkboxes, an accordion `<details>`.
5. **No appearance switch.** A page, or a block, is dark as ciderui's are (`cui-dark`), set by its front matter; apple.com has no dark mode of its own, and ciderui's palette is fixed.

## The pages

| template | what | from |
| --- | --- | --- |
| `base.html` | the head (the stylesheet, Inter's latin face preloaded, the script deferred, a site's own tags), `cui-globalnav` from `[extra] nav`, the page's content, `cui-footer` from `[extra] footer`; refuses `[markdown]` settings it cannot read | the crate's `GlobalNav`, `Footer` |
| `index.html` | the home: its markdown, a page composed of ciderui's markup | `cui-section`, `cui-tile`, … |
| `page.html` | a page: `cui-article`, its headline the title, its subhead the description, its copy the markdown; under its section's local nav, if the section has one (`[extra.localnav]`) | the crate's `Article`, `LocalNav` |
| `section.html` | a section: an article of its own markdown, then its pages as rows (`cui-posts`, each with its `[extra] category`, its date and its picture, any of them left out when the page has none); under its local nav | `Article`, `Posts`, `Post` |
| `news.html` | a news section's index: `cui-stories`, the newest first (one across, two two across, the rest three across, as the Newsroom's); its archive reached by its local nav, as the Newsroom's is | `Stories`, `Story` |
| `news-page.html` | a story: an article with its eyebrow (its category, its date), then its section's newest three others (`cui-posts`, `data-size="sm"`) | `Article`, `Posts` |
| `archive.html` | the news section's archive: a `cui-posts` for each month, the newest first | `Posts`, `Post` |
| `search.html` | the site's search page (a page with `template = "search.html"`, where the global nav's search sends `q`): an article of its title, its field (`cui-field`, holding the query) and its markdown, then the pages found as rows (`cui-posts`, cloned by the script from a `<template>` the page holds, so the rows are the component's markup); refuses a site with no index or another index format | `Article`, `Field`, `Posts`, `Post`; ciderui's (apple.com's results page, its own search's, is not measured) |
| `404.html` | Zola's 404: a headline and a more link home, in a `cui-section` | ciderui's (apple.com's 404 is its old www page, `#333333` text and a search field: not measured as a standard) |

A site adds its own templates beside these (ciderui's documentation: its home, its examples' frames).

A page's picture (its story's, its row's) comes from its front matter (`[extra] image`), resized by Zola (`resize_image`) to the sizes the components draw it at.

## How it is proven

`npm test`, each refusing to run on a stale build:

- `build --check`: `static/` is what `npm run build` writes from the ciderui checkout.
- `test/markup.mjs`: a site (`test/site/`) with a page writing, through the theme's components, each of ciderui's examples the templates write (twelve: the more link, a section, the global nav, the global nav with its search flyout, a field empty and filled, the footer, the local nav, the article, the stories, the archive's and the related posts); each one's markup in the built page equals ciderui's example, normalized as the crate's tests are.
- `test/style.mjs`: the same pages in Chromium (`--font-render-hinting=none`) at ciderui's widths and both sides of 735 and 1069, every element of each component compared, computed style by computed style and box by box, with ciderui's example rendered with ciderui's own compiled CSS beside it, within 1/32px. The theme means no difference, so there is no golden entry; one it came to mean would be a golden check with its reason, as ciderui's rule 13 has it.
- `test/skeleton.mjs`: the theme's own CSS, `css/zola.css`, the page's skeleton: the room under a page's last article or rows before the footer, on a page, a story and a section, is apple.com's Newsroom's, ciderui's measurement of its footer tile's margin (`newsroom-article:footertile`), at each of the eight widths it was measured at.
- `test/behavior.mjs`: the script, step by step: a paddle scrolls its row, the one at an end is disabled, the dot of the item in view is current; the nav's search flyout sends `q` to the search page, whose rows are the pages holding each of its words, the ones with them in their title first, a description searched too, none said so, the page itself never one, its own field sending `q` again.
- `test/site.mjs`: the theme's own site and `ciderui/docs/` build, every page with its head complete, no Tera or markdown showing as text.

## Assumptions

- Measured: Zola 0.23.6 is the newest release (2026-09-12) and has no shortcodes, its components Tera 2's, run before markdown, so a component writing a block writes its body between blank lines; `config.extra` merges the site's over the theme's key by key; Giallo's inline style on `<pre>`; the date filter, `page.year` and `page.month`, `group_by`; `bottom_footnotes`' markup (probes, 2026-10-19); the search index's `fuse_json`, an array of each page's `url`, `title` and `body` (with `include_description`, its `description`), `config.search.index_format` readable in a template, `include_description` not (probes, 2026-10-21); the script and the pages it serves outside Chromium, on ciderui's documentation: Safari 27.0.1 on macOS, Safari 26.5 on the iOS simulator, Chrome 155 (ciderui's `reference/docs/`, which found the script's animation frame starved in an iframe out of sight on iOS, fixed in 4bad1c7).
- Stated by the owner: ciderui's documentation first, news in the Newsroom's look, one script for the paddles and dots, a local repository, English; the search, with the rest of the remaining work, left to my judgment (2026-10-21).
- Guessed: that the owner's other sites will want the same pages; that Zola's markup for markdown holds across its 0.23 releases (the replacements match what it writes, and a test fails where they stop matching).
