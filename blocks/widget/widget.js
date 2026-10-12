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

const RECO_AUTOPLAY_MS = 5000;
// Stat rows are authored as "<label><value>" (e.g. "TypeSmall Cap", "LTP709.95").
const STAT_RE = /^(Type|LTP|Entry Price|Status)\s*(.*)$/i;
// Values the source only reveals after login — shown blurred, as on the source.
const BLURRED_STATS = /^entry price$/i;

function createEl(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * Title row: decorative rule — heading — rule. The first word is accented
 * (source: "Latest" in maroon) unless the author already formatted part of it.
 * @param {Element} heading
 * @returns {Element}
 */
function buildRecoTitle(heading) {
  if (!heading.querySelector('strong, em')) {
    const [first, ...rest] = heading.textContent.trim().split(/\s+/);
    if (rest.length) {
      heading.textContent = '';
      heading.append(createEl('span', 'widget-reco-accent', first), ` ${rest.join(' ')}`);
    }
  }
  const row = createEl('div', 'widget-reco-title');
  row.append(createEl('span', 'widget-reco-rule'), heading, createEl('span', 'widget-reco-rule'));
  row.querySelectorAll('.widget-reco-rule').forEach((r) => r.setAttribute('aria-hidden', 'true'));
  return row;
}

/**
 * Builds one structured card from its authored paragraphs:
 *   pct, "Potential Returns", "in<N>Days", badge picture, name (+logo), stats…
 * @param {Element[]} parts
 * @returns {Element}
 */
function buildRecoCard(parts) {
  const card = createEl('div', 'widget-reco-card');
  const head = createEl('div', 'widget-reco-card-head');
  const body = createEl('div', 'widget-reco-card-body');
  const stats = createEl('div', 'widget-reco-stats');

  parts.forEach((part, i) => {
    const text = part.textContent.trim();
    const img = part.querySelector('img') || (part.tagName === 'IMG' ? part : null);

    if (i === 0) {
      // "+14%" -> big number + small "%"
      const m = text.match(/^([+-]?\d+(?:\.\d+)?)(%)$/);
      const pct = createEl('p', 'widget-reco-pct');
      if (m) pct.append(createEl('span', 'widget-reco-pct-num', m[1]), createEl('span', 'widget-reco-pct-unit', m[2]));
      else pct.textContent = text;
      head.append(pct);
    } else if (/^potential returns$/i.test(text)) {
      head.append(createEl('div', 'widget-reco-returns'));
      head.lastChild.append(createEl('p', 'widget-reco-caption', text));
    } else if (/^in\s*\d+\s*days$/i.test(text)) {
      const m = text.match(/^in\s*(\d+)\s*(days)$/i);
      const horizon = createEl('p', 'widget-reco-horizon');
      horizon.append(
        createEl('span', 'widget-reco-horizon-in', 'in'),
        createEl('span', 'widget-reco-horizon-num widget-reco-blur', m[1]),
        createEl('span', 'widget-reco-horizon-unit', m[2]),
      );
      (head.querySelector('.widget-reco-returns') || head).append(horizon);
    } else if (img && !text) {
      part.classList.add('widget-reco-badge');
      body.append(part);
    } else if (img && text) {
      part.classList.add('widget-reco-name');
      body.append(part);
    } else {
      const m = text.match(STAT_RE);
      const stat = createEl('div', 'widget-reco-stat');
      const label = m ? m[1] : '';
      const value = m ? m[2] : text;
      if (label) stat.append(createEl('span', 'widget-reco-stat-label', label));
      stat.append(createEl('span', `widget-reco-stat-value${BLURRED_STATS.test(label) ? ' widget-reco-blur' : ''}`, value));
      stats.append(stat);
    }
  });

  // A card authored without a logo still gets a name row.
  if (!body.querySelector('.widget-reco-name')) {
    const plain = [...stats.children].find((s) => !s.querySelector('.widget-reco-stat-label'));
    if (plain) {
      const name = createEl('p', 'widget-reco-name', plain.textContent);
      plain.remove();
      body.append(name);
    }
  }

  body.append(stats);
  card.append(head, body);
  return card;
}

/**
 * Carousel: arrows + progress dots + autoplay. Desktop aligns cards left and
 * never scrolls past the last card; mobile centres the active card.
 * @param {Element} viewport overflow-hidden wrapper
 * @param {Element} track flex row of cards
 * @param {Element[]} cards
 * @returns {Element} controls row
 */
function buildRecoCarousel(viewport, track, cards) {
  const controls = createEl('div', 'widget-reco-controls');
  if (cards.length < 2) return controls;

  const prev = createEl('button', 'widget-reco-arrow widget-reco-prev');
  const next = createEl('button', 'widget-reco-arrow widget-reco-next');
  prev.type = 'button';
  next.type = 'button';
  prev.setAttribute('aria-label', 'Previous recommendation');
  next.setAttribute('aria-label', 'Next recommendation');

  const dots = createEl('div', 'widget-reco-dots');
  const dotButtons = cards.map((_, i) => {
    const dot = createEl('button', 'widget-reco-dot');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Show recommendation ${i + 1}`);
    dots.append(dot);
    return dot;
  });
  controls.append(prev, dots, next);
  controls.style.setProperty('--widget-reco-autoplay', `${RECO_AUTOPLAY_MS}ms`);

  let current = 0;
  let timer;
  const isDesktop = window.matchMedia('(width >= 900px)');

  const update = () => {
    const step = cards[1].offsetLeft - cards[0].offsetLeft;
    const vw = viewport.clientWidth;
    let offset;
    if (isDesktop.matches) {
      const max = Math.max(0, track.scrollWidth - vw);
      offset = Math.min(current * step, max);
    } else {
      offset = current * step - (vw - cards[0].offsetWidth) / 2;
    }
    track.style.transform = `translateX(${-offset}px)`;
    dotButtons.forEach((d) => d.classList.remove('active'));
    // eslint-disable-next-line no-void
    void dotButtons[current].offsetWidth; // restart the progress fill
    dotButtons[current].classList.add('active');
    dotButtons.forEach((d, i) => d.setAttribute('aria-current', i === current ? 'true' : 'false'));
  };

  const go = (i) => {
    current = (i + cards.length) % cards.length;
    update();
  };
  const stop = () => clearInterval(timer);
  const start = () => {
    stop();
    timer = setInterval(() => go(current + 1), RECO_AUTOPLAY_MS);
  };

  prev.addEventListener('click', () => { go(current - 1); start(); });
  next.addEventListener('click', () => { go(current + 1); start(); });
  dotButtons.forEach((d, i) => d.addEventListener('click', () => { go(i); start(); }));

  const host = viewport.parentElement;
  host.addEventListener('mouseenter', () => { stop(); controls.classList.add('paused'); });
  host.addEventListener('mouseleave', () => { controls.classList.remove('paused'); update(); start(); });
  isDesktop.addEventListener('change', update);
  window.addEventListener('resize', update);

  requestAnimationFrame(update);
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) start();
  return controls;
}

/**
 * Groups the flat sequence of recommendation paragraphs into cards and lays
 * the section out like the source: title row, lead, card carousel, login CTA.
 * Each card starts at a percentage paragraph (e.g. "+14%").
 * @param {Element} block
 */
function decorateRecommendations(block) {
  const cell = findContentCell(block, /Potential Returns/i);
  if (!cell) return;

  const kids = [...cell.children];
  const isPct = (node) => node.tagName === 'P' && PCT_RE.test(node.textContent.trim());

  // Trailing "Login to view more" pseudo-link.
  let moreEl = null;
  if (kids.length && /login to view more/i.test(kids[kids.length - 1].textContent)) {
    moreEl = kids.pop();
    moreEl.classList.add('widget-reco-more');
  }

  // Lead copy before the first card (e.g. "Log in for personalised investment picks").
  // Its picture is the decorative squiggle drawn beside the text on desktop.
  const leadEls = [];
  while (kids.length && !isPct(kids[0])) leadEls.push(kids.shift());
  leadEls.forEach((node) => {
    node.classList.add('widget-reco-lead');
    const pic = node.querySelector('picture');
    if (pic) {
      pic.classList.add('widget-reco-squiggle');
      const img = pic.querySelector('img');
      if (img) img.alt = '';
      pic.setAttribute('aria-hidden', 'true');
    }
  });

  // Group the remaining paragraphs into cards.
  const groups = [];
  kids.forEach((node) => {
    if (isPct(node)) groups.push([]);
    if (groups.length) groups[groups.length - 1].push(node);
  });
  const cards = groups.map(buildRecoCard);

  const viewport = createEl('div', 'widget-reco-viewport');
  const track = createEl('div', 'widget-reco-cards');
  cards.forEach((c) => track.append(c));
  viewport.append(track);

  // Header: title row (from the block's heading row) + lead.
  const header = createEl('div', 'widget-reco-header');
  const heading = block.querySelector('h1, h2, h3, h4');
  const headingRow = heading && heading.closest('.widget > div');
  if (heading) header.append(buildRecoTitle(heading));
  leadEls.forEach((node) => header.append(node));
  if (headingRow && headingRow !== cell.parentElement) headingRow.remove();

  const carousel = createEl('div', 'widget-reco-carousel');
  carousel.append(viewport);
  carousel.append(buildRecoCarousel(viewport, track, cards));

  cell.textContent = '';
  cell.append(header, carousel);
  if (moreEl) cell.append(moreEl);
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
    cta.classList.add('widget-feature-cta');
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
    // Move the shared "Download App" CTA inside the active panel (grey box),
    // at its bottom — matching the source.
    if (cta && panels[idx]) panels[idx].appendChild(cta);
  };
  tabs.forEach((tab, i) => tab.addEventListener('click', () => activate(i)));
  activate(0);

  // Reassemble: heading, tab row, panels (the CTA now lives inside the active
  // panel, so it is not appended separately).
  featuresHeading.after(tabRow);
  tabRow.after(panelWrap);
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
