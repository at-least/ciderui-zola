// ciderui-zola's one script: what ciderui leaves to the page for its
// gallery (cui-gallery) and its shelf (cui-shelf), whose CSS shows the
// state set here. A row's paddles (cui-gallery-paddle, aria-controls naming
// the row, the first the previous) scroll it by its width, the row's snap
// settling it, and the one at an end is disabled; a gallery's dots
// (cui-gallery-dot, a link to an item) scroll the row to their item, and the
// dot of the item the row shows is aria-current. Without it the rows still
// scroll and snap, and a dot is a link. And the search page's results
// (search.html), which need a script to be found.

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
