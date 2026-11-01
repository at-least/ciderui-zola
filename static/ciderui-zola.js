// ciderui-zola's one script: what ciderui leaves to the page for its
// gallery (cui-gallery) and its shelf (cui-shelf), whose CSS shows the
// state set here. A row's paddles (cui-gallery-paddle, aria-controls naming
// the row, the first the previous) scroll it by its width, the row's snap
// settling it, and the one at an end is disabled; a gallery's dots
// (cui-gallery-dot, a link to an item) scroll the row to their item, and the
// dot of the item the row shows is aria-current. Without it the rows still
// scroll and snap, and a dot is a link. And the search page's results
// (search.html), which need a script to be found, the global nav's
// search's suggestions, and a docs page's listings' copy buttons.

(() => {
  const smooth = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

  // the row's start, where its items snap: its scroll padding
  const start = (row) => parseFloat(getComputedStyle(row).scrollPaddingLeft) || 0;

  const rows = new Map();
  for (const paddle of document.querySelectorAll('.cui-gallery-paddle[aria-controls]')) {
    const row = document.getElementById(paddle.getAttribute('aria-controls'));
    if (!row) throw new Error(`ciderui-zola: a paddle controls #${paddle.getAttribute('aria-controls')}, which is not on the page`);
    if (!rows.has(row)) rows.set(row, { paddles: [], dots: [] });
    rows.get(row).paddles.push(paddle);
  }
  for (const dot of document.querySelectorAll('.cui-gallery-dot[href^="#"]')) {
    const item = document.getElementById(decodeURIComponent(dot.hash.slice(1)));
    const row = item?.closest('.cui-gallery-scroller, .cui-shelf-scroller');
    if (!row) throw new Error(`ciderui-zola: a dot links to ${dot.hash}, which is not an item of a row`);
    if (!rows.has(row)) rows.set(row, { paddles: [], dots: [] });
    rows.get(row).dots.push([dot, item]);
  }

  for (const [row, { paddles, dots }] of rows) {
    if (paddles.length && paddles.length !== 2) throw new Error(`ciderui-zola: #${row.id} has ${paddles.length} paddles, not 2`);
    const [previous, next] = paddles;
    const update = () => {
      if (previous) {
        previous.disabled = row.scrollLeft <= 1;
        next.disabled = row.scrollLeft + row.clientWidth >= row.scrollWidth - 1;
      }
      if (dots.length) {
        const at = row.getBoundingClientRect().left + start(row);
        let current = dots[0];
        for (const d of dots) {
          if (Math.abs(d[1].getBoundingClientRect().left - at) < Math.abs(current[1].getBoundingClientRect().left - at)) current = d;
        }
        for (const [dot] of dots) {
          if (dot === current[0]) dot.setAttribute('aria-current', 'true');
          else dot.removeAttribute('aria-current');
        }
      }
    };
    // set in the event itself: a browser sends a scroll event and a resize
    // event once a frame at most, and a frame out of the window may run no
    // animation frame (Safari 26.5 on iOS ran none for a page's iframe out of
    // sight while its row scrolled, ciderui's reference/docs/)
    row.addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    if (previous) {
      previous.addEventListener('click', () => row.scrollBy({ left: -row.clientWidth, behavior: smooth() }));
      next.addEventListener('click', () => row.scrollBy({ left: row.clientWidth, behavior: smooth() }));
    }
    for (const [dot, item] of dots) {
      dot.addEventListener('click', (e) => {
        e.preventDefault();
        row.scrollTo({ left: row.scrollLeft + item.getBoundingClientRect().left - row.getBoundingClientRect().left - start(row), behavior: smooth() });
      });
    }
    update();
  }
})();

// the search page (search.html, its form cz-search): the query (?q=) in its
// field, and the pages of Zola's search index (fuse_json, its address the
// form's data-index) whose title, description or text hold each of its
// words, those whose title holds the most of them first, each a row cloned
// from the page's template (cz-search-results, a cui-posts holding one row),
// after it; none, its heading says so. Without the script, the field alone.
(() => {
  const form = document.querySelector('.cz-search');
  if (!form) return;
  const query = (new URLSearchParams(location.search).get('q') ?? '').trim();
  form.elements.q.value = query;
  if (!query) return;
  const template = document.querySelector('template.cz-search-results');
  if (!template) throw new Error('ciderui-zola: the search page has no results template (template.cz-search-results)');
  const words = query.toLowerCase().split(/\s+/);
  const here = new URL(form.action, location.href).pathname;
  fetch(form.dataset.index)
    .then((res) => {
      if (!res.ok) throw new Error(`ciderui-zola: the search index ${form.dataset.index}: ${res.status}`);
      return res.json();
    })
    .then((pages) => {
      const hits = pages
        .filter((p) => p.title && new URL(p.url).pathname !== here)
        .filter((p) => words.every((w) => `${p.title} ${p.description ?? ''} ${p.body}`.toLowerCase().includes(w)))
        .map((p) => ({ p, score: words.filter((w) => p.title.toLowerCase().includes(w)).length }))
        .sort((a, b) => b.score - a.score)
        .map(({ p }) => p);
      const results = template.content.cloneNode(true);
      const list = results.querySelector('.cui-posts-list');
      const row = list.firstElementChild;
      row.remove();
      results.querySelector('.cui-posts-heading').textContent = `${hits.length ? 'Results' : 'No results'} for “${query}”`;
      for (const p of hits) {
        const r = row.cloneNode(true);
        r.querySelector('.cui-post').href = p.url;
        r.querySelector('.cui-post-headline').textContent = p.title;
        list.append(r);
      }
      if (!hits.length) list.remove();
      template.after(results);
    });
})();

// the global nav's search's suggestions (its flyout, search_flyout, and
// base.html's template cz-suggestions, ciderui's sections): once two
// characters are typed, in the quick links' place, the pages whose title
// holds what was typed (Pages, those starting with it first) and
// the words of the pages' titles and descriptions its last word starts
// (Searches, each sent to the search page as q, the words the most
// pages use first), five of each as apple.com's, what was typed marked; with
// fewer, or the field cleared, the quick links again (apple.com's clear
// button leaves its suggestions until something is typed: its script
// returns before drawing its quick links). Zola's index (fuse_json, the
// template's data-index) is fetched once, when first needed, the search
// page left out; a status line, read aloud and not shown (cz-status), says
// what the suggestions hold, as apple.com's. Without the script, the quick
// links.
(() => {
  const template = document.querySelector('template.cz-suggestions');
  if (!template) return;
  const panel = document.querySelector('.cui-globalnav-searchpanel');
  const form = panel.querySelector('.cui-globalnav-searchfield');
  const input = form.elements.q;
  const close = panel.querySelector(':scope > .cui-globalnav-closebutton');
  // the quick links: what is between the field and the sheet's X
  const quick = [];
  for (let n = form.nextElementSibling; n !== close; n = n.nextElementSibling) quick.push(n);
  const status = document.createElement('p');
  status.className = 'cz-status';
  status.setAttribute('role', 'status');
  form.after(status);
  // what the status line says of the quick links, as apple.com's does when
  // they come back
  const list = quick.find((n) => n.matches('ul'));
  const quickSaid = list ? `${list.children.length} ${list.previousElementSibling.textContent} available` : '';
  let shown = quick;
  // what is shown already stays: put back, its rows would fade in again
  const show = (nodes, said) => {
    if (nodes === shown) return;
    for (const n of shown) n.remove();
    close.before(...nodes);
    shown = nodes;
    status.textContent = said;
  };
  const sections = [...template.content.querySelectorAll('.cui-globalnav-searchlinks')].map((list) => ({ heading: list.previousElementSibling, list, row: list.firstElementChild }));
  const here = new URL(form.action, location.href).pathname;
  let index;
  const load = () => (index ??= fetch(template.dataset.index)
    .then((res) => {
      if (!res.ok) throw new Error(`ciderui-zola: the search index ${template.dataset.index}: ${res.status}`);
      return res.json();
    })
    .then((all) => {
      const pages = all.filter((p) => p.title && new URL(p.url).pathname !== here);
      const used = new Map();
      for (const p of pages) {
        for (const w of new Set(`${p.title} ${p.description ?? ''}`.toLowerCase().match(/[\p{L}\p{N}]+/gu))) used.set(w, (used.get(w) ?? 0) + 1);
      }
      const words = [...used].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length || (a[0] < b[0] ? -1 : 1)).map(([w]) => w);
      return { pages, words };
    }));
  // a row's text, its part from at, length long, marked
  const mark = (row, text, at, length) => {
    const span = row.querySelector('span');
    const m = span.querySelector('mark');
    m.textContent = text.slice(at, at + length);
    span.replaceChildren(text.slice(0, at), m, text.slice(at + length));
  };
  const typed = () => input.value.trim().replace(/\s+/g, ' ');
  const update = () => {
    const q = typed();
    if (q.length < 2) return show(quick, quickSaid);
    load().then(({ pages, words }) => {
      // a later input shows its own
      if (typed() !== q) return;
      const lower = q.toLowerCase();
      const links = pages
        .map((p) => ({ p, at: p.title.toLowerCase().indexOf(lower) }))
        .filter(({ at }) => at >= 0)
        .sort((a, b) => (b.at === 0) - (a.at === 0))
        .slice(0, 5);
      const last = lower.split(' ').at(-1);
      const searches = words.filter((w) => w.startsWith(last)).slice(0, 5).map((w) => lower.slice(0, lower.length - last.length) + w);
      const nodes = [];
      const said = [];
      const section = ({ heading, list, row }, items, fill) => {
        if (!items.length) return;
        const rows = list.cloneNode(false);
        for (const item of items) {
          const r = row.cloneNode(true);
          fill(r, item);
          rows.append(r);
        }
        nodes.push(heading.cloneNode(true), rows);
        said.push(`${items.length} ${heading.textContent}`);
      };
      section(sections[0], links, (r, { p, at }) => {
        r.querySelector('a').href = p.url;
        mark(r, p.title, at, q.length);
      });
      section(sections[1], searches, (r, s) => {
        const to = new URL(form.action, location.href);
        to.searchParams.set('q', s);
        r.querySelector('a').href = to.href;
        mark(r, s, 0, q.length);
      });
      show(nodes, said.length ? `${said.join(' and ')} available` : 'No suggestions');
    });
  };
  input.addEventListener('input', update);
  // a reset empties the field after its event, which no input follows
  form.addEventListener('reset', () => show(quick, quickSaid));
})();

// a docs page's code listings (ciderui's cui-docs-copy, around each code
// block of a docs page): each one's copy button shown, which its CSS leaves
// hidden with no script, and a click copies its listing's code, the button
// marked copied for a second, as DocC's (ciderui's reference/apple.com,
// docc-copy). A copy refused (no clipboard) rejects, uncaught.
(() => {
  for (const button of document.querySelectorAll('.cui-docs-copy-button')) {
    const listing = button.parentElement.querySelector(':scope > pre');
    if (!listing) throw new Error('ciderui-zola: a copy button with no listing beside it');
    button.hidden = false;
    let timer;
    button.addEventListener('click', async () => {
      await navigator.clipboard.writeText(listing.textContent);
      button.dataset.state = 'copied';
      clearTimeout(timer);
      timer = setTimeout(() => { delete button.dataset.state; }, 1000);
    });
  }
})();
