# ciderui-zola

A [Zola](https://www.getzola.org) theme in apple.com's look, built on [ciderui](../ciderui): a site's pages as the Newsroom's articles, its news as the Newsroom's index and archive, the global nav and the footer from its settings. ciderui's documentation (`ciderui/docs/`) is built with it. Why it is built as it is: [DESIGN.md](DESIGN.md).

## Use it

A site needs Zola 0.23.6 or later and nothing else: the stylesheet, Inter and the one script are prebuilt in `static/`. Put the theme at `themes/ciderui-zola` (a link to this checkout), and in `config.toml`:

```toml
theme = "ciderui-zola"

# the theme reads Zola's markdown with these, and refuses a site without them
[markdown]
bottom_footnotes = true
insert_anchor_links = "none"
github_alerts = false

[markdown.highlighting]
style = "inline"
light_theme = "github-light"
dark_theme = "github-dark"

[extra]
logo = "static/logo.svg"   # the global nav's logo, drawn inline in currentColor
nav = [{ text = "News", href = "/news/" }]
footer = { copyright = "Copyright © 2026 Example Inc." }
```

The settings under `[extra]` (`theme.toml` lists them with their defaults):

| setting | what |
| --- | --- |
| `logo` | an SVG file in the site, the global nav's logo; required with a nav |
| `nav` | the global nav's links, `[{ text, href }]`; `[]` for no global nav |
| `search`, `bag` | the global nav's search and bag pages; `""` for none |
| `search_flyout` | `true`: the nav's search a button opening the search over the page, which sends what is typed to `search` as `q`, and suggests, as two characters or more are typed, the pages whose title holds them and the words they start, from Zola's search index (`false`, the default: a link to it) |
| `search_links` | the search's quick links, `[{ text, href }]`; `[]` for none |
| `footer` | `{ copyright, links?, directory?, notes?, shop?, locale? }`, ciderui's footer: `links` `[{ text, href }]`; `directory` columns of sections `[[{ id, title, links }]]`; `notes` and `shop` HTML; `locale` `{ text, href }`; `{}` for no footer |
| `head` | tags for every page's `<head>`, `[{ tag, attrs?, content? }]` |
| `not_found` | the 404 page's texts, `{ headline?, link? }` |

A path in the site (`/news/`) goes through `get_url`, so it holds wherever the site is served.

## Its pages

| template | for |
| --- | --- |
| `index.html` | the home: its markdown, which can be ciderui's markup |
| `page.html` | a page: an article, its headline the title, its subhead the description |
| `section.html` | a section: an article of its own markdown, then its pages as rows |
| `news.html` | a news section's index (`template = "news.html"`, `page_template = "news-page.html"`, `sort_by = "date"`): its stories, the newest one across, two two across, the rest three across; `[extra] heading` ("Latest News"), `stories` (12) |
| `news-page.html` | a story: an article with its category and date, then the section's newest three others; `[extra] related` ("More from" and the section's title) |
| `archive.html` | a news section's archive, a subsection with `template = "archive.html"`: a month of rows each |
| `search.html` | the site's search page, a page with `template = "search.html"` (`content/search.md`, and `search = "/search/"`): its field, and the pages holding each word of `?q=` as rows, found by the theme's script in Zola's search index |
| `404.html` | a headline and a link home |

A page's front matter: `description`, its subhead; `date`; `[extra] category`, its eyebrow; `[extra] image`, its picture in a story or a row (a path Zola resizes, in `static/` or `content/`); `[extra] dark = true`, the whole page dark (`cui-dark`). A section's `[extra.localnav]`, `{ links = [{ text, href }], button = { text, href } }`, gives it and its pages ciderui's local nav, titled with the section's title.

The search page, and the nav's search's suggestions, need Zola's index of the site, in the form the script reads:

```toml
build_search_index = true

[search]
index_format = "fuse_json"
include_description = true   # a page's description is searched too
```

It matches each word of the query in a page's title, its description and its text, the pages with the most of them in their title first; without the script it shows its field alone.

A page's markdown can call the theme's Tera components, named after the crate's (`templates/cui-components.html`): `{{ <cui_more_link href="/news/" text="Read more" /> }}`, `{% <cui_section variant="alt"> %}…{% </cui_section> %}`.

## Develop it

ciderui is a sibling checkout, `"ciderui": "file:../ciderui"`:

```sh
npm install
npm run build   # static/ and templates/cui-icons.html, from ciderui
npm test        # the build is current; the markup, the styles, the skeleton, the script, the sites
```

Rebuild after ciderui changes, and name ciderui's commit in the rebuild's commit message.
