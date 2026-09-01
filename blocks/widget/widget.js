/*
 * Widget block.
 *
 * On the source site this block powered three live, JS-driven widgets
 * (a recommendations carousel and a platforms showcase). During migration the
 * content was captured statically, so this block does NOT load anything at
 * runtime — it decorates the already-imported static markup in place.
 *
 * Two variants are detected from the block's leading heading:
 *   - "Latest Recommendations"        -> .widget-recommendations
 *   - "Platforms for Seamless Access" -> .widget-platforms
 */

const PCT_RE = /^[+-]?\d+(\.\d+)?%$/;

/**
 * Returns the content cell (inner div) of the block row whose text matches.
 * @param {Element} block
 * @param {RegExp} re
 * @returns {Element|null}
 */
function findContentCell(block, re) {
  const row = [...block.children].find((r) => re.test(r.textContent));
  if (!row) return null;
  return row.querySelector(':scope > div') || row;
}

/**
 * Groups the flat sequence of recommendation paragraphs into cards.
 * Each card starts at a percentage paragraph (e.g. "+14%").
 * @param {Element} block
 */
function decorateRecommendations(block) {
  const cell = findContentCell(block, /Potential Returns/i);
  if (!cell) return;

  const kids = [...cell.children];
  const isPct = (el) => el.tagName === 'P' && PCT_RE.test(el.textContent.trim());

  // Trailing "Login to view more" pseudo-link.
  let moreEl = null;
  if (kids.length && /login to view more/i.test(kids[kids.length - 1].textContent)) {
    moreEl = kids.pop();
    moreEl.classList.add('widget-reco-more');
  }

  // Lead copy before the first card (e.g. "Log in for personalised investment picks").
  const leadEls = [];
  while (kids.length && !isPct(kids[0])) leadEls.push(kids.shift());
  leadEls.forEach((el) => el.classList.add('widget-reco-lead'));

  // Group the remaining paragraphs into cards (appendChild moves live nodes).
  const cards = [];
  let current = null;
  kids.forEach((el) => {
    if (isPct(el)) {
      current = document.createElement('div');
      current.className = 'widget-reco-card';
      cards.push(current);
    }
    if (current) current.appendChild(el);
  });

  // Tag paragraphs inside each card for styling.
  cards.forEach((card) => {
    const paras = [...card.children];
    paras.forEach((p, i) => {
      const hasImg = !!p.querySelector('img');
      const text = p.textContent.trim();
      if (i === 0) p.classList.add('widget-reco-pct');
      else if (hasImg && !text) p.classList.add('widget-reco-badge');
      else if (hasImg && text) p.classList.add('widget-reco-name');
      else if (/^Potential Returns$/i.test(text)) p.classList.add('widget-reco-caption');
      else p.classList.add('widget-reco-stat');
    });
  });

  // Rebuild the cell: lead, card grid, trailing link.
  const grid = document.createElement('div');
  grid.className = 'widget-reco-cards';
  cards.forEach((c) => grid.appendChild(c));

  cell.textContent = '';
  leadEls.forEach((el) => cell.appendChild(el));
  cell.appendChild(grid);
  if (moreEl) cell.appendChild(moreEl);
}

/**
 * Decorates the platforms showcase: marks tab paragraphs and drops the
 * empty media link that would otherwise render as an empty button.
 * @param {Element} block
 */
function decoratePlatforms(block) {
  const cell = findContentCell(block, /Investor App/i);
  if (!cell) return;

  [...cell.children].forEach((el) => {
    if (el.tagName === 'P') {
      const text = el.textContent.trim();
      if (/^(Investor App|Trader App|Trader Pro Terminal)$/.test(text)) {
        el.classList.add('widget-platform-tab');
      }
      // Remove empty (media) links so they don't render as empty buttons.
      const a = el.querySelector('a');
      if (a && !a.textContent.trim() && !a.querySelector('img')) el.remove();
    }
  });
}

/**
 * Decorates a widget block using its already-imported static content.
 * @param {Element} block The widget block element
 */
export default function decorate(block) {
  const heading = block.querySelector('h1, h2, h3, h4');
  const title = heading ? heading.textContent.trim().toLowerCase() : '';

  if (title.includes('recommendation')) {
    block.classList.add('widget-recommendations');
    decorateRecommendations(block);
  } else if (title.includes('platform')) {
    block.classList.add('widget-platforms');
    decoratePlatforms(block);
  }
}
