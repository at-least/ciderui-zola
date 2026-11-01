# ciderui-zola

A [Zola](https://www.getzola.org) theme in apple.com's look, built on [ciderui](../ciderui): a site's pages as the Newsroom's articles, its documentation as Apple's developer documentation, its news as the Newsroom's index and archive, the global nav and the footer from its settings. ciderui's documentation (`ciderui/docs/`) is built with it. Why it is built as it is: [DESIGN.md](DESIGN.md).

## Use it

A site needs Zola 0.23.6 or later and nothing else: the stylesheet, Inter and the one script are prebuilt in `static/`. Put the theme at `themes/ciderui-zola` (a link to this checkout), and in `config.toml`:

```toml
theme = "ciderui-zola"

# the theme reads Zola's markdown with these, and refuses a site without them
[markdown]
bottom_footnotes = true
insert_anchor_links = "none"
github_alerts = true

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
| `nav` | the global nav's links, `[{ text, href, flyout? }]`; `[]` for no global nav. A link's `flyout`, ciderui's menu under the bar (the pointer resting on the link shows it, its button opens it, a phone's menu opens it over itself), is its groups, `[{ heading, large?, links? }]`, each `[{ text, href }]`, the large links first |
| `search`, `bag` | the global nav's search and bag pages; `""` for none |
| `search_flyout` | `true`: the nav's search a button opening the search over the page, which sends what is typed to `search` as `q`, and suggests, as two characters or more are typed, the pages whose title holds them and the words they start, from Zola's search index (`false`, the default: a link to it) |
| `search_links` | the search's quick links, `[{ text, href }]`; `[]` for none |
| `bag_flyout` | `true`: the nav's bag a button opening the bag over the page, an empty bag's, as ciderui's (`false`, the default: a link to `bag`) |
| `bag_message` | the bag's message, `"Nothing here yet."`; required with `bag_flyout` |
| `bag_line` | a line under it, `{ text, href, rest }`: a link, then the rest of its sentence (`{ text = "Sign in", href = "/signin/", rest = " to see if you have any saved items" }`); `{}` for none |
| `bag_heading`, `bag_links` | its links under their heading, `[{ icon, text, href }]`, the icon one of ciderui's: `orders`, `saves`, `account`, `sign_in`; `[]` for none |
| `footer` | `{ copyright, links?, directory?, notes?, shop?, locale? }`, ciderui's footer: `links` `[{ text, href }]`; `directory` columns of sections `[[{ id, title, links }]]`; `notes` and `shop` HTML; `locale` `{ text, href }`; `{}` for no footer |
| `head` | tags for every page's `<head>`, `[{ tag, attrs?, content? }]` |
| `not_found` | the 404 page's texts, `{ headline?, link? }` |
| `docs` | the docs layout's (`docs.html`, `docs-section.html`), `{ title, pages }`: `title`, the documentation's name, on its bar and its navigator, linking its first page; `pages`, the content paths of its navigator's rows from the top (`["get-started.md", "components/_index.md"]`), a section's with its pages under it |

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
| `docs.html` | a documentation page (`template = "docs.html"`), in Apple's developer documentation's layout: the bar, the navigator (`[extra] docs`) beside it from 1024px or in a sheet the bar's button opens, the page's hero (the sections above it as crumbs, its `[extra] category` or Article over its title and description), its markdown (an alert, `> [!NOTE]`, `[!IMPORTANT]`, `[!TIP]` or `[!WARNING]`, DocC's aside of that kind; a code block with DocC's copy button, which the script shows and copies with), the navigator's filter at its foot (the script's), and See Also, the other pages of its section in its category |
| `docs-section.html` | a documentation section (`template = "docs-section.html"`, `page_template = "docs.html"`), as `docs.html`, then Topics: its pages, grouped by their `[extra] category` in the order of its `[extra] categories = [...]`, each with its description |
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

## License

MIT (`LICENSE`). Inter, in `static/fonts/`, is the Inter Project Authors', under the SIL Open Font License 1.1 (`LICENSE-Inter`).

## Apple

The theme draws ciderui's look; what ciderui takes from apple.com is measured on its pages and recorded in ciderui's `reference/`. No Apple stylesheet, font, image or logo is in this repository. Apple, iPhone and Mac are trademarks of Apple Inc. ciderui-zola is not affiliated with Apple, and Apple does not endorse it.
