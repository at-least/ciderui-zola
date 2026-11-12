# ciderui-zola

This project is agent-native: written and maintained entirely by AI agents, and fully optimized for agent vibe coding, debugging, and recursive self-improvement (RSI). This README is the only file written for people; every other file is written for the agents that read and change it. What is decided, and why, is in [DESIGN.md](DESIGN.md).

A [Zola](https://www.getzola.org) theme in apple.com's look, built on the latest [ciderui](../ciderui): its global nav, its footer, its list, its tiles and its pager, with the markdown set in its type. No JavaScript.

## Use it

A site needs Zola 0.23.6 or later and nothing else: the stylesheets and Inter are prebuilt in `static/`. Put the theme at `themes/ciderui-zola` (a link to this checkout), and in `config.toml`:

```toml
theme = "ciderui-zola"

[extra]
nav = [{ text = "News", href = "/news/" }, { text = "Products", href = "/products/" }]
copyright = { text = "Copyright © 2026 Example Inc.", href = "/about/" }
```

| setting | what |
| --- | --- |
| `nav` | the global nav's links, beside the site's `title`; `[]` for no global nav |
| `copyright` | the footer's line, a link when `href` is set; `text = ""` for no footer |
| `directory` | the footer's link columns, `[{ title, links = [{ text, href }] }]`, folded under their titles on a phone; `[]` for none |
| `words` | what the theme writes (Skip to Content, Menu, Page 2, the date's format, …), in English; a site in another language sets the ones it changes. `theme.toml` lists them all |

## Its pages

| template | for |
| --- | --- |
| `index.html` | the home, as a section; leave its `title` empty for no headline |
| `section.html` | its title, description and markdown, then its pages as rows (title, description, date); with `[extra] tiles = true`, as tiles (a page's `[extra] image`, title, description); with `[extra] heading`, a heading over them; with `paginate_by`, a pager under them |
| `page.html` | its title, description and date, then its markdown |
| `404.html` | a headline and a link home |

`[extra] dark = true` on a page or a section makes the whole page dark.

## Develop it

`npm install`, then:

- `npm run build`: copies ciderui's `dist/site.css` and fonts into `static/`, and builds `static/ciderui-zola.css` from `css/`.
- `npm test`: `static/` is up to date; the theme's components write ciderui's examples' markup; `test/site` builds and every page passes ciderui's `CheckMarkup`; no page scrolls sideways at 320 to 1600px. Needs `zola` and `go`.

## License

MIT (`LICENSE`). Inter, in `static/fonts/`, is the Inter Project Authors', under the SIL Open Font License 1.1 (`LICENSE-Inter`). ciderui-zola is not affiliated with Apple.
