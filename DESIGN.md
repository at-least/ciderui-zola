# ciderui-zola: its design

ciderui-zola is a [Zola](https://www.getzola.org) theme in apple.com's look, built on [ciderui](../ciderui): a site's pages, its news (apple.com's Newsroom), and the documentation of ciderui itself, which is its first site. A site needs only `zola` (0.23.6 or later): the theme ships its stylesheet, its fonts and its one script prebuilt. It is vpkit-zola's architecture (`../vpkit-zola`) with ciderui where vpkit-zola has vpkit, and without its docs layout. This documents what is decided, before the templates exist.

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
4. **One script.** `static/ciderui-zola.js` does what ciderui leaves to the page (stated, 2026-10-19: 「附一支小 script」): a gallery's and a shelf's paddles scroll their row by a page and are disabled at its ends, a gallery's dot is `aria-current` for the item in view. Without it the rows still scroll and snap, and each dot is a link to its item. Nothing else needs a script: the global nav's menu is a popover, the local nav's and the footer's sections checkboxes, an accordion `<details>`.
5. **No appearance switch.** A page, or a block, is dark as ciderui's are (`cui-dark`), set by its front matter; apple.com has no dark mode of its own, and ciderui's palette is fixed.

## The pages

| template | what | from |
| --- | --- | --- |
| `base.html` | the head (the stylesheet, Inter's latin face preloaded, the script deferred, a site's own tags), `cui-globalnav` from `[extra] nav`, the page's content, `cui-footer` from `[extra] footer` | the crate's `GlobalNav`, `Footer` |
| `index.html` | the home: its markdown, a page composed of components (`{{ <cui_section …> }}`) | `cui-section`, `cui-tile`, … |
| `page.html` | an article: `cui-article`, its header from the front matter (title, description, date, `[extra] category`), its copy the markdown; in a section with news, the related stories under it (`cui-posts`, `data-size="sm"`) | the crate's `Article`, `Posts` |
| `news.html` | a section's index: `cui-stories`, the newest first (one across, two two across, the rest three across, as the Newsroom's), a more link to the archive | `Stories`, `Story` |
| `archive.html` | the section's archive: a `cui-posts` for each month, the newest first | `Posts`, `Post` |
| `docs.html` | a docs section's index, and its pages' local nav (`cui-localnav`, the section's title and its pages) | `LocalNav` |
| `404.html` | Zola's 404: a headline and a more link home, in a `cui-section` | ciderui's (apple.com's 404 is its old www page, `#333333` text and a search field: not measured as a standard) |

A page's picture (a story's, a row's, a figure's) comes from its front matter (`[extra] image`), resized by Zola (`resize_image`) to the sizes the components draw it at.

## How it is proven

`npm test`, each refusing to run on a stale build:

- `build --check`: `static/` is what `npm run build` writes from the ciderui checkout.
- `test/markup.mjs`: a site (`test/site/`) whose pages render every component through the theme; each component's markup in the built page equals ciderui's example, normalized as the crate's tests are.
- `test/style.mjs`: the same pages in Chromium (`--font-render-hinting=none`) at ciderui's widths and both sides of 735 and 1069, every element of each component compared, computed style by computed style and box by box, with ciderui's example rendered with ciderui's own compiled CSS beside it, within 1/32px. A difference the theme means (a page's own skeleton around a component) is a golden check with its reason, as ciderui's rule 13 has it; an entry no check reads fails the run.
- `test/behavior.mjs`: the script, step by step: a paddle scrolls its row, the one at an end is disabled, the dot of the item in view is current.
- `test/site.mjs`: the theme's own site and `ciderui/docs/` build, every page with its head complete, no Tera or markdown showing as text.

## Assumptions

- Measured: Zola 0.23.6 is the newest release (2026-09-12) and has no shortcodes, its components Tera 2's, run before markdown, so a component writing a block writes its body between blank lines; `config.extra` merges the site's over the theme's key by key; Giallo's inline style on `<pre>`; the date filter, `page.year` and `page.month`, `group_by`; `bottom_footnotes`' markup (probes, 2026-10-19).
- Stated by the owner: ciderui's documentation first, news in the Newsroom's look, one script for the paddles and dots, a local repository, English.
- Guessed: that the owner's other sites will want the same pages; that Zola's markup for markdown holds across its 0.23 releases (the replacements match what it writes, and a test fails where they stop matching).
