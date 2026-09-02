// Axis Direct header — metadata-independent nav fragment loader.
// All copy/links live in content/nav.plain.html; this file only reads that DOM,
// builds interactive controls (search form), and wires hover/click/mobile behavior.

const isDesktop = window.matchMedia('(min-width: 900px)');

/**
 * Fetch the nav fragment. Metadata-independent dual-fetch:
 * /content first (localhost / aem up), then root (DA/EDS production).
 * @returns {Promise<Document|null>} parsed fragment document
 */
async function fetchNavFragment() {
  let resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) resp = await fetch('/nav.plain.html');
  if (!resp.ok) return null;
  const html = await resp.text();
  return new DOMParser().parseFromString(html, 'text/html');
}

/**
 * Close all open dropdowns within the given nav.
 * @param {Element} nav
 */
function closeAllDropdowns(nav) {
  nav.querySelectorAll('.nav-drop').forEach((li) => {
    li.setAttribute('aria-expanded', 'false');
    const trigger = li.querySelector(':scope > p, :scope > a');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  });
}

/**
 * Wire a top-level nav item that owns a dropdown panel.
 * aria-expanded lives on BOTH the <li> (for layout hooks) and the trigger
 * element (whose next sibling is the panel <ul>) for accordion semantics.
 * Desktop: hover opens/closes. Mobile: click on the trigger expands/collapses.
 * @param {Element} li top-level list item containing a nested <ul>
 * @param {Element} nav
 */
function decorateDropItem(li, nav) {
  li.classList.add('nav-drop');
  li.setAttribute('aria-expanded', 'false');
  const trigger = li.querySelector(':scope > p, :scope > a');
  const panel = li.querySelector(':scope > ul');
  if (panel) panel.classList.add('nav-megamenu-panel');
  if (trigger) {
    trigger.setAttribute('aria-expanded', 'false');
    if (panel && trigger.tagName === 'P') trigger.setAttribute('aria-haspopup', 'true');
  }

  const setExpanded = (state) => {
    li.setAttribute('aria-expanded', state ? 'true' : 'false');
    if (trigger) trigger.setAttribute('aria-expanded', state ? 'true' : 'false');
  };

  li.addEventListener('mouseenter', () => {
    if (!isDesktop.matches) return;
    closeAllDropdowns(nav);
    setExpanded(true);
  });
  li.addEventListener('mouseleave', () => {
    if (!isDesktop.matches) return;
    setExpanded(false);
  });

  // Mobile: tapping a trigger that owns a panel toggles expand in place
  // (multi-expand accordion — matches source; both text and chevron expand).
  // Sections are independent: opening one does not close the others.
  if (trigger && panel) {
    trigger.addEventListener('click', (e) => {
      if (isDesktop.matches) return;
      e.preventDefault();
      const expanded = li.getAttribute('aria-expanded') === 'true';
      setExpanded(!expanded);
    });
  }
}

/* Representative market snapshot for the scrolling ticker. The source shows a
   live feed above the nav; the migrated page is static, so this is a fixed
   snapshot rendered as a marquee to match the look. */
const TICKER_STOCKS = [
  ['BAJFINANCE', '1,057.80', 0.37], ['HCLTECH', '1,334.00', -1.29],
  ['HINDUNILVR', '1,968.00', -1.34], ['EICHERMOT', '7,608.00', -4.54],
  ['APOLLOHOSP', '8,687.00', -0.78], ['TCS', '2,338.80', -1.27],
  ['NESTLEIND', '1,418.70', -1.36], ['MAXHEALTH', '991.50', -1.15],
  ['NTPC', '329.20', 0.52], ['SBIN', '1,020.90', -1.31],
  ['TATACONSUM', '1,017.10', -1.30], ['TATASTEEL', '182.84', -0.67],
  ['POWERGRID', '267.40', 1.08], ['ICICIBANK', '1,425.50', -0.87],
  ['DRREDDY', '1,163.80', -0.61], ['TECHM', '1,617.80', -1.23],
  ['ONGC', '237.11', 0.28], ['JIOFIN', '236.10', 0.11],
  ['WIPRO', '177.56', -2.28], ['INFY', '1,133.30', -1.96],
  ['BAJAJFINSV', '1,977.20', 0.26], ['KOTAKBANK', '422.40', -0.61],
  ['SBILIFE', '1,729.20', -0.58], ['BAJAJ-AUTO', '12,030.00', -2.68],
  ['LT', '3,991.30', 0.28], ['BEL', '405.05', -1.50],
  ['SENSEX', '76,518.39', -0.55], ['ETERNAL', '327.00', -0.23],
  ['ASIANPAINT', '2,520.80', -2.12], ['TITAN', '5,038.00', -0.24],
  ['AXISBANK', '1,258.90', 0.07], ['JSWSTEEL', '1,301.70', -0.90],
  ['INDIGO', '4,988.50', -1.26], ['M&M', '3,175.00', -2.58],
  ['ULTRACEMCO', '11,308.00', -0.81], ['RELIANCE', '1,313.10', 0.31],
  ['GRASIM', '3,271.10', -1.03], ['HINDALCO', '1,004.40', -0.99],
  ['TRENT', '2,858.90', 0.14], ['NIFTY', '23,892.20', -0.68],
];

/**
 * Build the scrolling market-price ticker shown above the nav (matches the
 * source). Static snapshot; the row is duplicated so the marquee loops without
 * a visible gap.
 * @returns {Element} ticker wrapper
 */
function buildTicker() {
  const wrapper = document.createElement('div');
  wrapper.className = 'nav-ticker';

  const track = document.createElement('div');
  track.className = 'nav-ticker-track';

  const buildItem = (sym, price, pct) => {
    const item = document.createElement('span');
    item.className = 'nav-ticker-item';
    const up = pct >= 0;
    item.innerHTML = `<span class="nav-ticker-sym">${sym}</span>`
      + `<span class="nav-ticker-price">${price}</span>`
      + `<span class="nav-ticker-chg ${up ? 'up' : 'down'}">`
      + `${up ? '+' : ''}${pct.toFixed(2)}%</span>`;
    return item;
  };

  // Two copies of the list back-to-back for a seamless loop.
  for (let copy = 0; copy < 2; copy += 1) {
    TICKER_STOCKS.forEach(([sym, price, pct]) => track.append(buildItem(sym, price, pct)));
  }
  wrapper.append(track);
  return wrapper;
}

/**
 * Build the search form. Form controls must be created in JS, not the fragment.
 * @returns {Element} search wrapper
 */
function buildSearch() {
  const wrapper = document.createElement('div');
  wrapper.className = 'nav-search';
  const form = document.createElement('form');
  form.setAttribute('role', 'search');
  form.action = 'https://simplehai.axisdirect.in/search';
  form.method = 'get';

  const icon = document.createElement('span');
  icon.className = 'nav-search-icon';
  icon.setAttribute('aria-hidden', 'true');

  const input = document.createElement('input');
  input.type = 'search';
  input.name = 'q';
  input.placeholder = 'Search';
  input.setAttribute('aria-label', 'Search stocks, mutual funds, and more');

  form.append(icon, input);
  wrapper.append(form);
  return wrapper;
}

/**
 * Close any open dropdowns and reset menu state when crossing breakpoints.
 * @param {Element} nav
 */
function handleViewportChange(nav) {
  closeAllDropdowns(nav);
  nav.setAttribute('aria-expanded', 'false');
  const button = nav.querySelector('.nav-hamburger button');
  if (button) button.setAttribute('aria-label', 'Open navigation');
  document.body.style.overflowY = '';
}

/**
 * Toggle the mobile menu open/closed.
 * @param {Element} nav
 */
function toggleMobileMenu(nav) {
  const expanded = nav.getAttribute('aria-expanded') === 'true';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  const button = nav.querySelector('.nav-hamburger button');
  if (button) button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  if (expanded) closeAllDropdowns(nav);
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const fragment = await fetchNavFragment();
  block.textContent = '';
  if (!fragment) return;

  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-label', 'Main navigation');
  while (fragment.body.firstElementChild) nav.append(fragment.body.firstElementChild);

  // Label the three sections: brand, sections, tools.
  const classes = ['brand', 'sections', 'tools'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  // Brand.
  const navBrand = nav.querySelector('.nav-brand');
  if (navBrand) {
    const p = navBrand.querySelector('p');
    if (p) p.classList.add('nav-brand-logo');
  }

  // Sections: wire dropdowns for every top-level item that has a nested list.
  const navSections = nav.querySelector('.nav-sections');
  if (navSections) {
    navSections.querySelectorAll(':scope > ul > li').forEach((li) => {
      if (li.querySelector(':scope > ul')) decorateDropItem(li, nav);
    });
  }

  // Tools: prepend the search form, tag Login / Open Demat CTAs.
  const navTools = nav.querySelector('.nav-tools');
  if (navTools) {
    navTools.prepend(buildSearch());
    const links = navTools.querySelectorAll('ul a');
    if (links[0]) links[0].classList.add('nav-cta', 'nav-cta-secondary');
    if (links[1]) links[1].classList.add('nav-cta', 'nav-cta-primary');
  }

  // Hamburger for mobile.
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMobileMenu(nav));
  nav.prepend(hamburger);
  nav.setAttribute('aria-expanded', 'false');

  // Close open desktop dropdowns when clicking outside.
  document.addEventListener('click', (e) => {
    if (isDesktop.matches && !nav.contains(e.target)) closeAllDropdowns(nav);
  });
  // Close dropdowns on Escape.
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') closeAllDropdowns(nav);
  });

  // Reset state cleanly when crossing the desktop/mobile breakpoint.
  isDesktop.addEventListener('change', () => handleViewportChange(nav));

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  // Market-price ticker sits above the nav (matches the source).
  block.append(buildTicker());
  block.append(navWrapper);
}
