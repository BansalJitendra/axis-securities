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

const VIDEO_RE = /\.(webm|mp4)(\?|#|$)/i;

/**
 * Wires a set of tab buttons to panels (one active at a time).
 * @param {Element[]} tabs
 * @param {Element[]} panels
 * @param {(i: number) => void} [onChange]
 */
function wireTabs(tabs, panels, onChange) {
  const activate = (idx) => {
    tabs.forEach((t, i) => {
      t.classList.toggle('active', i === idx);
      t.setAttribute('aria-selected', i === idx ? 'true' : 'false');
      t.tabIndex = i === idx ? 0 : -1;
    });
    panels.forEach((p, i) => {
      p.classList.toggle('active', i === idx);
      p.hidden = i !== idx;
    });
    if (onChange) onChange(idx);
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => activate(i));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      activate(next);
      tabs[next].focus();
    });
  });
  activate(0);
  return activate;
}

/**
 * Media for one feature: a .webm/.mp4 link becomes a lazily-loaded looping
 * video; a picture is used as-is.
 * @param {Element} node authored paragraph holding the link or picture
 * @returns {Element|null}
 */
function buildFeatureMedia(node) {
  const a = node.querySelector('a[href]');
  if (a && VIDEO_RE.test(a.getAttribute('href'))) {
    const video = createEl('video', 'widget-platform-video');
    video.dataset.src = a.getAttribute('href');
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'none';
    ['muted', 'loop', 'playsinline'].forEach((attr) => video.setAttribute(attr, ''));
    video.setAttribute('aria-hidden', 'true');
    return video;
  }
  return node.querySelector('picture') || node.querySelector('img');
}

/** Play the active feature's video (loading it on first use); pause the rest. */
function syncVideos(mediaItems, activeIdx) {
  mediaItems.forEach((m, i) => {
    if (!m || m.tagName !== 'VIDEO') return;
    if (i === activeIdx) {
      if (!m.src && m.dataset.src) m.src = m.dataset.src;
      m.play().catch(() => {});
    } else {
      m.pause();
    }
  });
}

/**
 * Builds one platform pane: media column + "Platform Features" column with
 * feature pill tabs and the active feature's description card + CTA.
 * Authored row: <h3>platform</h3>, then per feature <h4>label</h4>, media,
 * <p>description</p>; a trailing link paragraph is the platform CTA.
 * @param {Element} cell platform row cell
 * @param {Element|null} featuresHeading shared "Platform Features" heading
 * @param {string} id unique id prefix
 */
function buildPlatformPane(cell, featuresHeading, id) {
  const kids = [...cell.children];
  const nameEl = kids.find((k) => k.tagName === 'H3');
  const name = nameEl ? nameEl.textContent.trim() : '';

  // Trailing CTA: last paragraph holding a non-video link.
  let cta = null;
  const last = kids[kids.length - 1];
  const lastLink = last && last.querySelector('a[href]');
  if (lastLink && !VIDEO_RE.test(lastLink.getAttribute('href'))) cta = kids.pop();

  // Features: <h4> starts a feature; media + description follow.
  const features = [];
  kids.forEach((k) => {
    if (k === nameEl) return;
    if (k.tagName === 'H4') {
      features.push({ label: k, media: null, desc: [] });
      return;
    }
    const f = features[features.length - 1];
    if (!f) return;
    if (!f.media && (k.querySelector('picture, img') || (k.querySelector('a[href]') && VIDEO_RE.test(k.querySelector('a[href]').getAttribute('href'))))) {
      f.media = buildFeatureMedia(k);
    } else {
      f.desc.push(k);
    }
  });

  const pane = createEl('div', 'widget-platform-pane');
  pane.id = `${id}-panel`;
  pane.setAttribute('role', 'tabpanel');

  const media = createEl('div', 'widget-platform-media');
  const mediaItems = features.map((f) => {
    const slot = createEl('div', 'widget-platform-media-item');
    if (f.media) slot.append(f.media);
    media.append(slot);
    return f.media;
  });

  const content = createEl('div', 'widget-platform-content');
  if (featuresHeading) content.append(featuresHeading.cloneNode(true));

  const featureTabs = createEl('div', 'widget-feature-tabs');
  featureTabs.setAttribute('role', 'tablist');
  featureTabs.setAttribute('aria-label', `${name} features`);
  const cards = createEl('div', 'widget-feature-panels');
  const tabs = features.map((f, i) => {
    const tab = createEl('button', 'widget-feature-tab', f.label.textContent.trim());
    tab.type = 'button';
    tab.id = `${id}-f${i}`;
    tab.setAttribute('role', 'tab');
    featureTabs.append(tab);

    const card = createEl('div', 'widget-feature-panel');
    card.setAttribute('role', 'tabpanel');
    card.setAttribute('aria-labelledby', tab.id);
    f.label.className = 'widget-feature-title';
    card.append(f.label, ...f.desc);
    if (cta) {
      const c = cta.cloneNode(true);
      c.className = 'widget-feature-cta';
      card.append(c);
    }
    cards.append(card);
    return tab;
  });
  content.append(featureTabs, cards);

  const mediaSlots = [...media.children];
  const activateFeature = wireTabs(tabs, [...cards.children], (idx) => {
    mediaSlots.forEach((m, i) => m.classList.toggle('active', i === idx));
    if (pane.classList.contains('active') && pane.closest('.widget-platforms.in-view')) syncVideos(mediaItems, idx);
    pane.dataset.activeFeature = idx;
  });

  pane.append(media, content);
  return {
    name, pane, mediaItems, activateFeature,
  };
}

/**
 * Decorates the platforms showcase like the source: centred title, platform
 * tabs (Investor App / Trader App / Trader Pro Terminal), and per platform a
 * media column beside "Platform Features" pill tabs + description card.
 * Authored rows: [title h2 + "Platform Features" h2], then one row per platform.
 * @param {Element} block
 */
function decoratePlatforms(block) {
  const rows = [...block.children];
  const headRow = rows[0];
  const platformRows = rows.slice(1).filter((r) => r.querySelector('h3'));
  if (!headRow || !platformRows.length) return;

  const headCell = headRow.querySelector(':scope > div') || headRow;
  headRow.classList.add('widget-platforms-head');
  const headings = [...headCell.querySelectorAll('h2')];
  const featuresHeading = headings.length > 1 ? headings[headings.length - 1] : null;
  if (featuresHeading) {
    featuresHeading.remove();
    featuresHeading.removeAttribute('id'); // cloned into every pane
    featuresHeading.classList.add('widget-features-heading');
  }

  const uid = `widget-platforms-${[...document.querySelectorAll('.widget-platforms')].indexOf(block)}`;
  const panes = platformRows.map((row, i) => buildPlatformPane(row.querySelector(':scope > div') || row, featuresHeading, `${uid}-p${i}`));

  const body = createEl('div', 'widget-platform-body');
  const tabRow = createEl('div', 'widget-platform-tabs');
  tabRow.setAttribute('role', 'tablist');
  tabRow.setAttribute('aria-label', 'Platforms');
  const tabs = panes.map((p, i) => {
    const tab = createEl('button', 'widget-platform-tab', p.name);
    tab.type = 'button';
    tab.id = `${uid}-p${i}-tab`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', p.pane.id);
    p.pane.setAttribute('aria-labelledby', tab.id);
    tabRow.append(tab);
    return tab;
  });

  const stage = createEl('div', 'widget-platform-stage');
  panes.forEach((p) => stage.append(p.pane));
  body.append(tabRow, stage);

  platformRows.forEach((r) => r.remove());
  block.append(body);

  wireTabs(tabs, panes.map((p) => p.pane), (idx) => {
    panes.forEach((p, i) => {
      if (i === idx) {
        p.activateFeature(Number(p.pane.dataset.activeFeature || 0));
      } else {
        syncVideos(p.mediaItems, -1);
      }
    });
  });

  // Only start video playback once the section is near the viewport.
  const first = panes[0];
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      io.disconnect();
      block.classList.add('in-view');
      const active = panes.find((p) => p.pane.classList.contains('active')) || first;
      syncVideos(active.mediaItems, Number(active.pane.dataset.activeFeature || 0));
    }
  }, { rootMargin: '200px' });
  io.observe(block);
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
