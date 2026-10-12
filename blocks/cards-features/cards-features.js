/*
 * cards-features — "Key Features" carousel.
 * Authored rows (2 columns): intro (empty | title + description), one row per
 * card (icon | linked <h3> + points list), closing CTA (empty | link).
 * Rendered like the source: centred looping carousel with arrows (desktop),
 * progress dots and autoplay; each whole card links to its feature page.
 */

const AUTOPLAY_MS = 5000;

function createEl(tag, className) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  return el;
}

/** Row cells without the empty ones authors leave in 2-column rows. */
const filledCells = (row) => [...row.children]
  .filter((c) => c.textContent.trim() || c.querySelector('picture, img'));

/**
 * Builds one card <li> from a row: head (icon, title, chevron) + points.
 * @param {Element} row
 * @returns {HTMLLIElement}
 */
function buildCard(row) {
  const li = createEl('li', 'cards-features-card');
  const cells = [...row.children];
  const iconCell = cells.find((c) => c.querySelector('picture, img') && !c.querySelector('h1, h2, h3, h4, h5, h6'));
  const body = cells.find((c) => c !== iconCell && c.textContent.trim()) || createEl('div');

  const head = createEl('div', 'cards-features-card-head');
  const pic = iconCell && iconCell.querySelector('picture, img');
  if (pic) {
    const icon = createEl('div', 'cards-features-card-icon');
    icon.append(pic);
    head.append(icon);
  }
  const title = body.querySelector('h1, h2, h3, h4, h5, h6');
  if (title) {
    title.classList.add('cards-features-card-title');
    head.append(title);
  }
  const link = title && title.querySelector('a[href]');
  if (link) {
    link.classList.add('cards-features-card-link'); // stretched over the card
    const chevron = createEl('span', 'cards-features-chevron');
    chevron.setAttribute('aria-hidden', 'true');
    head.append(chevron);
  }

  body.className = 'cards-features-card-body';
  li.append(head, body);
  return li;
}

/**
 * Centred, looping carousel: three copies of the cards (clones either side)
 * so the active card can always sit in the middle with neighbours peeking.
 * @param {Element} block
 * @param {HTMLLIElement[]} cards
 */
function buildCarousel(block, cards) {
  const n = cards.length;
  const viewport = createEl('div', 'cards-features-viewport');
  const track = createEl('ul', 'cards-features-track');
  const clone = (li) => {
    const c = li.cloneNode(true);
    c.setAttribute('aria-hidden', 'true');
    c.inert = true;
    c.classList.add('is-clone');
    return c;
  };
  const before = cards.map(clone);
  const after = cards.map(clone);
  [...before, ...cards, ...after].forEach((li) => track.append(li));
  viewport.append(track);

  const controls = createEl('div', 'cards-features-controls');
  if (n < 2) return { viewport, controls };

  const prev = createEl('button', 'cards-features-arrow cards-features-prev');
  const next = createEl('button', 'cards-features-arrow cards-features-next');
  prev.type = 'button';
  next.type = 'button';
  prev.setAttribute('aria-label', 'Previous feature');
  next.setAttribute('aria-label', 'Next feature');
  const dots = createEl('div', 'cards-features-dots');
  const dotButtons = cards.map((li, i) => {
    const dot = createEl('button', 'cards-features-dot');
    dot.type = 'button';
    const name = li.querySelector('.cards-features-card-title');
    dot.setAttribute('aria-label', `Show ${name ? name.textContent.trim() : `feature ${i + 1}`}`);
    dots.append(dot);
    return dot;
  });
  controls.append(prev, dots, next);
  block.style.setProperty('--cards-features-autoplay', `${AUTOPLAY_MS}ms`);

  let current = 0; // logical index; may step to -1 or n before wrapping
  let timer;
  const all = [...track.children];

  const position = (animate) => {
    const target = all[n + current];
    const offset = target.offsetLeft - (viewport.clientWidth - target.offsetWidth) / 2;
    track.style.transition = animate ? '' : 'none';
    track.style.transform = `translateX(${-offset}px)`;
    if (!animate) {
      // eslint-disable-next-line no-void
      void track.offsetWidth; // flush so the next move animates again
      track.style.transition = '';
    }
  };

  const updateDots = () => {
    const active = ((current % n) + n) % n;
    dotButtons.forEach((d) => d.classList.remove('active'));
    // eslint-disable-next-line no-void
    void dotButtons[active].offsetWidth; // restart the progress fill
    dotButtons[active].classList.add('active');
    dotButtons.forEach((d, i) => d.setAttribute('aria-current', i === active ? 'true' : 'false'));
    cards.forEach((c, i) => c.classList.toggle('is-active', i === active));
  };

  const go = (i) => {
    current = i;
    position(true);
    updateDots();
  };

  // After animating onto a clone, jump back to the real card silently.
  track.addEventListener('transitionend', () => {
    if (current >= 0 && current < n) return;
    current = ((current % n) + n) % n;
    position(false);
  });

  const stop = () => clearInterval(timer);
  const start = () => {
    stop();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    timer = setInterval(() => go(current + 1), AUTOPLAY_MS);
  };

  prev.addEventListener('click', () => { go(current - 1); start(); });
  next.addEventListener('click', () => { go(current + 1); start(); });
  dotButtons.forEach((d, i) => d.addEventListener('click', () => { go(i); start(); }));

  block.addEventListener('mouseenter', () => { stop(); block.classList.add('paused'); });
  block.addEventListener('mouseleave', () => { block.classList.remove('paused'); updateDots(); start(); });
  block.addEventListener('focusin', stop);
  window.addEventListener('resize', () => position(false));

  requestAnimationFrame(() => { position(false); updateDots(); });
  start();
  return { viewport, controls };
}

export default function decorate(block) {
  const rows = [...block.children];
  const isCardRow = (row) => !!row.querySelector('picture, img') && !!row.querySelector('h1, h2, h3, h4, h5, h6');

  // Intro (title + description): the first non-card row holding a heading.
  const introRow = rows.find((r) => !isCardRow(r) && r.querySelector('h1, h2, h3'));
  // Closing CTA: a non-card row after the cards holding only a link.
  const ctaRow = rows.filter((r) => r !== introRow && !isCardRow(r)).find((r) => r.querySelector('a[href]'));
  const cards = rows.filter(isCardRow).map(buildCard);

  block.textContent = '';

  if (introRow) {
    const header = createEl('div', 'cards-features-header');
    filledCells(introRow).forEach((c) => header.append(...c.childNodes));
    block.append(header);
  }

  const { viewport, controls } = buildCarousel(block, cards);
  block.append(viewport, controls);

  if (ctaRow) {
    const a = ctaRow.querySelector('a[href]');
    const cta = createEl('p', 'cards-features-cta');
    cta.append(a);
    block.append(cta);
  }
}
