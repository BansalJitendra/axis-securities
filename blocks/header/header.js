// Axis Direct header — metadata-independent nav fragment loader.
// All copy/links live in content/nav.plain.html (flat sections, in order:
// notice, ticker, brand, navigation, tools); this file only reads that DOM,
// builds interactive controls (skip links, search, text-size picker, ticker
// marquee, dropdowns, hamburger) and wires hover/click/keyboard behaviour.

const isDesktop = window.matchMedia('(width >= 1280px)');
const NOTICE_DISMISSED_KEY = 'hide_skip_nav_instructions';
const FONT_SIZE_KEY = 'ACCESSIBILITY_FONT_SIZE_STORAGE_KEY';
const FONT_SIZES = [
  { key: 'small', size: '14px', label: 'Small text size' },
  { key: 'default', size: '', label: 'Default text size' },
  { key: 'large', size: '18px', label: 'Large text size' },
];

function el(tag, className, attrs = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  return node;
}

function icon(name) {
  return el('span', `nav-icon nav-icon-${name}`, { 'aria-hidden': 'true' });
}

function storageGet(key) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

function storageSet(key, value) {
  try { window.localStorage.setItem(key, value); } catch { /* storage unavailable */ }
}

/**
 * Fetch the nav fragment. Metadata-independent dual-fetch: /content first
 * when previewing the local import folder (localhost / aem up), then the site
 * root (DA/EDS production). Production pages skip the /content attempt so
 * they never log a 404.
 * @returns {Promise<Document|null>} parsed fragment document
 */
async function fetchNavFragment() {
  const local = window.location.pathname.startsWith('/content/');
  let resp = local ? await fetch('/content/nav.plain.html') : null;
  if (!resp || !resp.ok) resp = await fetch('/nav.plain.html');
  if (!resp.ok) return null;
  const html = await resp.text();
  return new DOMParser().parseFromString(html, 'text/html');
}

/* ------------------------------------------------------------------ */
/* Notice bar + skip links                                             */
/* ------------------------------------------------------------------ */

/**
 * Accessibility notice ("Press Tab to reveal …") with a dismiss button, and
 * the visually-hidden skip links it describes.
 * @param {Element} section notice section from the fragment
 * @returns {{ notice: Element|null, skipLinks: Element|null }}
 */
function buildNotice(section) {
  if (!section) return { notice: null, skipLinks: null };
  const text = section.querySelector('p');
  const list = section.querySelector('ul');

  let skipLinks = null;
  if (list) {
    skipLinks = el('div', 'nav-skip-links', { role: 'navigation', 'aria-label': 'Skip links' });
    skipLinks.append(list);
  }

  let notice = null;
  if (text && storageGet(NOTICE_DISMISSED_KEY) !== 'true') {
    notice = el('div', 'nav-notice');
    text.classList.add('nav-notice-text');
    text.querySelectorAll('code').forEach((c) => {
      const kbd = el('kbd');
      kbd.textContent = c.textContent;
      c.replaceWith(kbd);
    });
    const dismiss = el('button', 'nav-notice-dismiss', { type: 'button', 'aria-label': 'Dismiss skip navigation instructions' });
    dismiss.append(icon('close'));
    dismiss.addEventListener('click', () => {
      storageSet(NOTICE_DISMISSED_KEY, 'true');
      notice.remove();
    });
    notice.append(text, dismiss);
  }
  return { notice, skipLinks };
}

/** Give skip-link targets an id (main, search, footer) when they lack one. */
function wireSkipTargets() {
  const main = document.querySelector('main');
  if (main && !main.id) main.id = 'main';
  const footer = document.querySelector('footer');
  if (footer && !footer.id) footer.id = 'footer';
}

/* ------------------------------------------------------------------ */
/* Market ticker                                                       */
/* ------------------------------------------------------------------ */

/**
 * Scrolling market-price ticker. Each authored item is
 * "<strong>SYMBOL</strong> price change%"; the row is duplicated so the
 * marquee loops without a visible gap.
 * @param {Element} section ticker section from the fragment
 * @returns {Element|null}
 */
function buildTicker(section) {
  if (!section) return null;
  const label = section.querySelector('p');
  const items = [...section.querySelectorAll('li')];
  if (!items.length) return null;

  const wrapper = el('div', 'nav-ticker', { role: 'region', 'aria-label': label ? label.textContent.trim() : 'Live market prices' });
  const track = el('div', 'nav-ticker-track');

  const build = (li, hidden) => {
    const sym = li.querySelector('strong');
    const symbol = sym ? sym.textContent.trim() : '';
    const rest = li.textContent.replace(symbol, '').trim().split(/\s+/);
    const [price = '', change = ''] = rest;
    const up = !change.startsWith('-');
    const item = el('span', 'nav-ticker-item', { role: 'group', 'aria-label': `${symbol} stock data` });
    if (hidden) item.setAttribute('aria-hidden', 'true');
    const s = el('span', 'nav-ticker-sym');
    s.textContent = symbol;
    const pr = el('span', 'nav-ticker-price');
    pr.textContent = price;
    const ch = el('span', `nav-ticker-chg ${up ? 'up' : 'down'}`);
    ch.textContent = `(${change})`;
    ch.append(icon(up ? 'arrow-up' : 'arrow-down'));
    item.append(s, pr, ch);
    return item;
  };

  items.forEach((li) => track.append(build(li, false)));
  items.forEach((li) => track.append(build(li, true)));
  track.style.setProperty('--nav-ticker-duration', `${items.length * 3}s`);
  wrapper.append(track);
  return wrapper;
}

/* ------------------------------------------------------------------ */
/* Brand                                                               */
/* ------------------------------------------------------------------ */

function decorateBrand(section) {
  if (!section) return;
  const paras = [...section.querySelectorAll(':scope > p')];
  paras.forEach((p) => {
    if (p.querySelector('a')) {
      p.classList.add('nav-brand-logo');
      const a = p.querySelector('a');
      a.setAttribute('aria-label', 'Go to homepage: Axis Direct');
    } else {
      // decorative maroon tab behind the logo (first = desktop, second = mobile)
      const tabs = section.querySelectorAll('.nav-brand-tab, .nav-brand-tab-mobile').length;
      p.classList.add(tabs ? 'nav-brand-tab-mobile' : 'nav-brand-tab');
      p.setAttribute('aria-hidden', 'true');
      const img = p.querySelector('img');
      if (img) img.alt = '';
    }
  });
}

/* ------------------------------------------------------------------ */
/* Navigation dropdowns                                                */
/* ------------------------------------------------------------------ */

function closeAllDropdowns(nav, except) {
  nav.querySelectorAll('.nav-drop').forEach((li) => {
    if (li === except) return;
    li.setAttribute('aria-expanded', 'false');
    const trigger = li.querySelector(':scope > p > a, :scope > p');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  });
}

/**
 * Mobile: a group heading with links toggles them (multi-expand accordion).
 * Desktop ignores the toggle — groups are always shown inside the dropdown.
 * @param {Element} group
 * @param {Element|null} heading
 */
function decorateGroupAccordion(group, heading) {
  if (!heading) return;
  group.setAttribute('aria-expanded', 'false');
  heading.setAttribute('role', 'button');
  heading.setAttribute('tabindex', '0');
  heading.setAttribute('aria-expanded', 'false');
  const toggle = (e) => {
    if (isDesktop.matches) return;
    e.preventDefault();
    const open = group.getAttribute('aria-expanded') !== 'true';
    group.setAttribute('aria-expanded', open ? 'true' : 'false');
    heading.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  heading.addEventListener('click', toggle);
  heading.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') toggle(e);
  });
}

/**
 * A top-level item with a nested list becomes a dropdown: on desktop it opens
 * on hover/focus; on mobile its label toggles the group accordion.
 * Panel content = groups, each a <p> heading (optionally a link) + <ul> links.
 * @param {Element} li
 * @param {Element} nav
 */
function decorateDropItem(li, nav) {
  li.classList.add('nav-drop');
  li.setAttribute('aria-expanded', 'false');
  const label = li.querySelector(':scope > p');
  const trigger = (label && label.querySelector('a')) || label;
  const panel = li.querySelector(':scope > ul');
  panel.classList.add('nav-panel');
  if (label) label.classList.add('nav-drop-label');
  if (trigger) {
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-haspopup', 'true');
  }

  // groups: heading (+ decorative icon, shown on mobile) and link list
  [...panel.children].forEach((group) => {
    group.classList.add('nav-group');
    const heading = group.querySelector(':scope > p');
    const links = group.querySelector(':scope > ul');
    if (heading) {
      heading.classList.add('nav-group-title');
      const img = heading.querySelector('img');
      if (img) {
        img.alt = '';
        const media = img.closest('picture') || img;
        const iconWrap = el('span', 'nav-group-icon', { 'aria-hidden': 'true' });
        media.replaceWith(iconWrap);
        iconWrap.append(media);
      }
      heading.append(icon(links ? 'chevron-down' : 'chevron-right'));
    }
    if (links) {
      links.classList.add('nav-group-links');
      decorateGroupAccordion(group, heading);
    } else {
      group.classList.add('nav-group-solo');
    }
  });

  const setExpanded = (state) => {
    li.setAttribute('aria-expanded', state ? 'true' : 'false');
    if (trigger) trigger.setAttribute('aria-expanded', state ? 'true' : 'false');
  };

  li.addEventListener('mouseenter', () => {
    if (!isDesktop.matches) return;
    closeAllDropdowns(nav, li);
    setExpanded(true);
  });
  li.addEventListener('mouseleave', () => {
    if (isDesktop.matches) setExpanded(false);
  });
  li.addEventListener('focusin', () => {
    if (!isDesktop.matches) return;
    closeAllDropdowns(nav, li);
    setExpanded(true);
  });
  li.addEventListener('focusout', (e) => {
    if (isDesktop.matches && !li.contains(e.relatedTarget)) setExpanded(false);
  });

  // Mobile: the card title (dropdown trigger) is a label, not a link — the
  // card always lists its groups, as on the source.
  if (trigger && trigger.tagName === 'A') {
    trigger.addEventListener('click', (e) => {
      if (!isDesktop.matches) e.preventDefault();
    });
  }
}

/* ------------------------------------------------------------------ */
/* Tools: text size, search, CTAs                                      */
/* ------------------------------------------------------------------ */

function applyFontSize(key) {
  const opt = FONT_SIZES.find((o) => o.key === key) || FONT_SIZES[1];
  document.documentElement.style.fontSize = opt.size;
  return opt;
}

/**
 * "Aa" button + popup with the authored A- / A / A+ options; sets the root
 * font size (14 / 16 / 18px) and remembers the choice.
 * @param {Element} labelEl "Text size" paragraph
 * @param {Element} list option list
 */
function buildFontSize(labelEl, list) {
  const wrap = el('div', 'nav-fontsize', { 'aria-label': 'Accessibility options' });
  const toggle = el('button', 'nav-fontsize-toggle', {
    type: 'button', 'aria-label': 'Open font size options', 'aria-expanded': 'false', 'aria-controls': 'nav-fontsize-options',
  });
  toggle.append(icon('font-size'));
  const popup = el('div', 'nav-fontsize-options', { id: 'nav-fontsize-options', role: 'group', 'aria-label': labelEl ? labelEl.textContent.trim() : 'Text size' });
  popup.hidden = true;

  const options = [...list.querySelectorAll('li')].slice(0, FONT_SIZES.length);
  const buttons = options.map((li, i) => {
    const b = el('button', `nav-fontsize-option nav-fontsize-${FONT_SIZES[i].key}`, { type: 'button', 'aria-label': FONT_SIZES[i].label, 'aria-pressed': 'false' });
    b.textContent = li.textContent.trim();
    popup.append(b);
    return b;
  });

  const select = (key) => {
    const opt = applyFontSize(key);
    buttons.forEach((b, i) => b.setAttribute('aria-pressed', FONT_SIZES[i].key === opt.key ? 'true' : 'false'));
  };
  select(storageGet(FONT_SIZE_KEY) || 'default');

  const setOpen = (open) => {
    popup.hidden = !open;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(popup.hidden);
  });
  buttons.forEach((b, i) => b.addEventListener('click', () => {
    storageSet(FONT_SIZE_KEY, FONT_SIZES[i].key);
    select(FONT_SIZES[i].key);
    setOpen(false);
  }));
  document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) setOpen(false); });
  wrap.append(toggle, popup);
  return wrap;
}

/**
 * Search box (form controls are built here, not in the fragment). Focus
 * widens it and shows the authored "Trending" suggestions.
 * @param {string} placeholder
 * @param {Element|null} trendingLabel
 * @param {Element|null} trendingList
 */
function buildSearch(placeholder, trendingLabel, trendingList) {
  const wrapper = el('div', 'nav-search', { role: 'search', id: 'search' });
  const form = el('form');
  form.action = 'https://simplehai.axisdirect.in/search';
  form.method = 'get';

  const field = el('div', 'nav-search-field');
  const input = el('input', 'nav-search-input', {
    type: 'search', name: 'q', placeholder, autocomplete: 'off', 'aria-label': 'Search stocks, mutual funds, and more',
  });
  field.append(icon('search'), input);
  form.append(field);

  if (trendingList) {
    const results = el('div', 'nav-search-results', { id: 'nav-search-results' });
    results.hidden = true;
    const head = el('p', 'nav-search-results-title');
    head.textContent = trendingLabel ? trendingLabel.textContent.trim() : 'Trending';
    const ul = el('ul', '', { role: 'listbox', 'aria-label': head.textContent });
    [...trendingList.querySelectorAll('li')].forEach((li) => {
      const term = li.textContent.trim();
      const opt = el('li', 'nav-search-option', { role: 'option', tabindex: '-1' });
      opt.append(icon('trend'), document.createTextNode(term));
      opt.addEventListener('mousedown', (e) => {
        e.preventDefault();
        input.value = term;
        form.submit();
      });
      ul.append(opt);
    });
    results.append(head, ul);
    form.append(results);
    input.setAttribute('aria-controls', 'nav-search-results');
    input.addEventListener('focus', () => { results.hidden = false; wrapper.classList.add('is-focused'); });
    input.addEventListener('blur', () => { results.hidden = true; wrapper.classList.remove('is-focused'); });
  } else {
    input.addEventListener('focus', () => wrapper.classList.add('is-focused'));
    input.addEventListener('blur', () => wrapper.classList.remove('is-focused'));
  }

  wrapper.append(form);
  return wrapper;
}

/**
 * Tools section: [p Search][p Trending][ul terms][p Text size][ul A-/A/A+][ul CTAs].
 * @param {Element} section
 * @returns {{ tools: Element, fontSize: Element|null }}
 */
function buildTools(section) {
  const tools = el('div', 'nav-tools');
  if (!section) return { tools, fontSize: null, account: null };
  const kids = [...section.children];
  const textOf = (n) => (n ? n.textContent.trim() : '');
  const findP = (re) => kids.find((k) => k.tagName === 'P' && re.test(textOf(k)));
  const after = (n) => (n && n.nextElementSibling && n.nextElementSibling.tagName === 'UL' ? n.nextElementSibling : null);

  const searchP = findP(/^search$/i);
  const trendingP = findP(/trending/i);
  const sizeP = findP(/text size|font size/i);
  const ctaList = kids.filter((k) => k.tagName === 'UL' && k.querySelector('a')).pop();

  const fontSize = sizeP && after(sizeP) ? buildFontSize(sizeP, after(sizeP)) : null;
  tools.append(buildSearch(searchP ? textOf(searchP) : 'Search', trendingP, after(trendingP)));

  // Standalone link paragraph = account shortcut (mobile closed bar icon).
  const accountP = kids.find((k) => k.tagName === 'P' && k.querySelector('a') && k.textContent.trim() === k.querySelector('a').textContent.trim());
  let account = null;
  if (accountP) {
    const a = accountP.querySelector('a');
    account = el('a', 'nav-account', { href: a.getAttribute('href'), 'aria-label': a.textContent.trim() });
    account.append(icon('account'));
  }

  if (ctaList) {
    ctaList.classList.add('nav-ctas');
    const links = ctaList.querySelectorAll('a');
    links.forEach((a, i) => a.classList.add('nav-cta', i === links.length - 1 ? 'nav-cta-primary' : 'nav-cta-secondary'));
    tools.append(ctaList);
  }
  return { tools, fontSize, account };
}

/* ------------------------------------------------------------------ */
/* Mobile menu                                                         */
/* ------------------------------------------------------------------ */

function toggleMobileMenu(nav, force) {
  const open = force !== undefined ? force : nav.getAttribute('aria-expanded') !== 'true';
  nav.setAttribute('aria-expanded', open ? 'true' : 'false');
  const button = nav.querySelector('.nav-hamburger button');
  if (button) {
    button.setAttribute('aria-label', open ? 'Close main menu' : 'Open main menu');
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  document.body.style.overflowY = open && !isDesktop.matches ? 'hidden' : '';
  if (!open) closeAllDropdowns(nav);
}

/** Reset menu/dropdown/search state when crossing the desktop/mobile breakpoint. */
function handleViewportChange(nav) {
  closeAllDropdowns(nav);
  toggleMobileMenu(nav, false);
  nav.classList.remove('is-searching');
  nav.querySelectorAll('.nav-group[aria-expanded]').forEach((g) => {
    g.setAttribute('aria-expanded', 'false');
    const h = g.querySelector('.nav-group-title');
    if (h) h.setAttribute('aria-expanded', 'false');
  });
}

/**
 * Identify the fragment sections by their content (not their position), so
 * authors can reorder or omit sections and older nav documents still render:
 *   notice   — a paragraph with keyboard keys (<code>)
 *   ticker   — list items of "<strong>SYMBOL</strong> price change%"
 *   brand    — the home link with the logo image
 *   sections — the list whose items own nested lists (dropdowns)
 *   tools    — everything else (search label, text size, CTAs)
 * @param {Element[]} divs top-level fragment sections
 * @returns {Object<string, Element>}
 */
function classifySections(divs) {
  const found = {};
  const take = (name, test) => {
    const hit = divs.find((d) => !Object.values(found).includes(d) && test(d));
    if (hit) found[name] = hit;
  };
  take('notice', (d) => !!d.querySelector('p code'));
  take('ticker', (d) => {
    const lis = [...d.querySelectorAll(':scope > ul > li')];
    return lis.length > 1 && lis.every((li) => li.querySelector('strong') && /%/.test(li.textContent));
  });
  take('brand', (d) => !!d.querySelector('a img'));
  take('sections', (d) => !!d.querySelector(':scope > ul > li > ul'));
  take('tools', (d) => !!d.querySelector('a, p'));
  return found;
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const fragment = await fetchNavFragment();
  block.textContent = '';
  if (!fragment) return;

  const sections = classifySections([...fragment.body.children]);

  const { notice, skipLinks } = buildNotice(sections.notice);
  const ticker = buildTicker(sections.ticker);

  const nav = el('nav', '', { id: 'nav', 'aria-label': 'Main navigation' });

  const brand = sections.brand || el('div');
  brand.className = 'nav-brand';
  decorateBrand(brand);

  const navSections = sections.sections || el('div');
  navSections.className = 'nav-sections';
  const topList = navSections.querySelector(':scope > ul');
  if (topList) {
    topList.setAttribute('role', 'menubar');
    [...topList.children].forEach((li) => {
      const label = li.querySelector(':scope > p');
      if (label && !li.querySelector(':scope > ul')) label.classList.add('nav-drop-label');
      if (li.querySelector(':scope > ul')) decorateDropItem(li, nav);
    });
  }

  const { tools, fontSize, account } = buildTools(sections.tools);

  // Maroon bar = links + text-size; white bar = search + CTAs.
  const bar = el('div', 'nav-bar');
  bar.append(navSections);
  if (fontSize) bar.append(fontSize);

  const hamburger = el('div', 'nav-hamburger');
  const hamburgerButton = el('button', '', {
    type: 'button', 'aria-controls': 'nav', 'aria-label': 'Open main menu', 'aria-expanded': 'false',
  });
  hamburgerButton.append(el('span', 'nav-hamburger-icon', { 'aria-hidden': 'true' }), icon('close'));
  hamburgerButton.addEventListener('click', () => toggleMobileMenu(nav));
  hamburger.append(hamburgerButton);

  // Mobile closed bar: search + account shortcuts (hidden on desktop).
  const quick = el('div', 'nav-quick');
  const searchToggle = el('button', 'nav-search-toggle', { type: 'button', 'aria-label': 'Open search' });
  searchToggle.append(icon('search'));
  quick.append(searchToggle);
  if (account) quick.append(account);

  // Drawer top row: decorative support icon next to Aa (no action on source).
  const support = el('span', 'nav-support');
  support.append(icon('support'));

  nav.append(hamburger, brand, bar, support, tools, quick);
  nav.setAttribute('aria-expanded', 'false');

  // Mobile search mode: the search icon turns the bar into a search row.
  const searchInput = tools.querySelector('.nav-search-input');
  const setSearching = (on) => {
    nav.classList.toggle('is-searching', on);
    block.classList.toggle('is-searching', on);
    searchToggle.setAttribute('aria-expanded', on ? 'true' : 'false');
  };
  searchToggle.addEventListener('click', () => {
    setSearching(true);
    if (searchInput) searchInput.focus();
  });
  if (searchInput) {
    searchInput.addEventListener('blur', () => {
      if (nav.getAttribute('aria-expanded') !== 'true') setSearching(false);
    });
  }

  // Close dropdowns on outside click / Escape.
  document.addEventListener('click', (e) => {
    if (isDesktop.matches && !nav.contains(e.target)) closeAllDropdowns(nav);
  });
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Escape') return;
    closeAllDropdowns(nav);
    if (!isDesktop.matches && nav.getAttribute('aria-expanded') === 'true') {
      toggleMobileMenu(nav, false);
      hamburgerButton.focus();
    }
  });
  isDesktop.addEventListener('change', () => handleViewportChange(nav));

  const navWrapper = el('div', 'nav-wrapper');
  navWrapper.append(nav);

  if (skipLinks) block.append(skipLinks);
  if (notice) block.append(notice);
  if (ticker) block.append(ticker);
  block.append(navWrapper);
  wireSkipTargets();
}
