// ciderui-zola's one script: what ciderui leaves to the page for its
// gallery (cui-gallery) and its shelf (cui-shelf), whose CSS shows the
// state set here. A row's paddles (cui-gallery-paddle, aria-controls naming
// the row, the first the previous) scroll it by its width, the row's snap
// settling it, and the one at an end is disabled; a gallery's dots
// (cui-gallery-dot, a link to an item) scroll the row to their item, and the
// dot of the item the row shows is aria-current. Without it the rows still
// scroll and snap, and a dot is a link.

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
    let queued = false;
    const queue = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; update(); });
    };
    row.addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue);
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
