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
 * Builds the interactive "Platform Features" tab set. Each feature is authored
 * as an <h3> (the tab label) followed by a <p> (its description). We turn the
 * <h3>s into a horizontal row of clickable tabs and show one panel at a time,
 * matching the source. A trailing "Download App" link is shared below.
 * @param {Element} cell The platforms content cell
 */
function decorateFeatureTabs(cell) {
  const featuresHeading = [...cell.children]
    .find((el) => el.tagName === 'H2' && /platform features/i.test(el.textContent));
  if (!featuresHeading) return;

  // Everything after the "Platform Features" heading: h3 = new panel, other
  // nodes belong to the current panel. A trailing link is the shared CTA.
  const after = [];
  let sib = featuresHeading.nextElementSibling;
  while (sib) {
    after.push(sib);
    sib = sib.nextElementSibling;
  }

  // Pull off a trailing shared CTA (the "Download App" link paragraph).
  let cta = null;
  if (after.length && after[after.length - 1].querySelector('a')) {
    cta = after.pop();
  }

  // Group into panels, each starting at an <h3>.
  const panels = [];
  let current = null;
  after.forEach((el) => {
    if (el.tagName === 'H3') {
      current = document.createElement('div');
      current.className = 'widget-feature-panel';
      panels.push(current);
    }
    if (current) current.appendChild(el);
  });
  if (!panels.length) return;

  // Build the tab row from each panel's heading text.
  const tabRow = document.createElement('div');
  tabRow.className = 'widget-feature-tabs';
  const tabs = panels.map((panel, i) => {
    const h3 = panel.querySelector('h3');
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'widget-feature-tab';
    tab.textContent = h3 ? h3.textContent.trim() : `Tab ${i + 1}`;
    tabRow.appendChild(tab);
    return tab;
  });

  const panelWrap = document.createElement('div');
  panelWrap.className = 'widget-feature-panels';
  panels.forEach((p) => panelWrap.appendChild(p));

  const activate = (idx) => {
    tabs.forEach((t, i) => t.classList.toggle('active', i === idx));
    panels.forEach((p, i) => p.classList.toggle('active', i === idx));
  };
  tabs.forEach((tab, i) => tab.addEventListener('click', () => activate(i)));
  activate(0);

  // Reassemble: heading, tab row, panels, shared CTA.
  featuresHeading.after(tabRow);
  tabRow.after(panelWrap);
  if (cta) panelWrap.after(cta);
}

/**
 * Decorates the platforms showcase: marks tab paragraphs and drops the
 * empty media link that would otherwise render as an empty button.
 * @param {Element} block
 */
function decoratePlatforms(block) {
  const cell = findContentCell(block, /Investor App/i);
  if (!cell) return;

  // Capture the platform media (an authored .webm/.mp4 link) so we can render
  // it as an autoplaying video in the left column, matching the source's
  // two-column layout (video left, tabs + features right).
  let mediaUrl = null;
  [...cell.querySelectorAll('a')].forEach((a) => {
    const href = a.getAttribute('href') || '';
    if (/\.(webm|mp4)(\?|#|$)/i.test(href) && !a.textContent.trim()) {
      mediaUrl = href;
      (a.closest('p') || a).remove();
    }
  });

  const tabs = [];
  [...cell.children].forEach((el) => {
    if (el.tagName === 'P') {
      const text = el.textContent.trim();
      if (/^(Investor App|Trader App|Trader Pro Terminal)$/.test(text)) {
        el.classList.add('widget-platform-tab');
        tabs.push(el);
      }
      // Remove any remaining empty (media) links so they don't render as
      // empty buttons.
      const a = el.querySelector('a');
      if (a && !a.textContent.trim() && !a.querySelector('img')) el.remove();
    }
  });

  // Group the tab pills into a single horizontal row (they render as a
  // stacked column otherwise). Insert the row where the first tab was.
  if (tabs.length) {
    const tabRow = document.createElement('div');
    tabRow.className = 'widget-platform-tabs';
    tabs[0].before(tabRow);
    tabs.forEach((t) => tabRow.appendChild(t));
  }

  decorateFeatureTabs(cell);

  // Split into two columns — media on the left, all the content on the right —
  // matching the source. Only when a media URL was found.
  if (mediaUrl) {
    const media = document.createElement('div');
    media.className = 'widget-platform-media';
    const video = document.createElement('video');
    video.setAttribute('src', mediaUrl);
    video.setAttribute('autoplay', '');
    video.setAttribute('loop', '');
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.muted = true;
    media.appendChild(video);

    const content = document.createElement('div');
    content.className = 'widget-platform-content';
    [...cell.children].forEach((c) => content.appendChild(c));

    cell.append(media, content);
  }
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
