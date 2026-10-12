/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: swap known oversized source SVGs for preview-safe PNGs.
 *
 * The AEM preview service rejects large SVG images (these embed raster
 * photos, 75 KB – 2.3 MB), which fails preview/publish of the whole page
 * ("Images … have failed validation"). Each of these was rasterised to a 2x
 * PNG, uploaded to Document Authoring and previewed, so it has a public URL
 * on the preview domain. Pointing imported content at those URLs means every
 * re-import (and every sync of the imported page) carries a valid image.
 *
 * Keys are the normalised source file stem: lowercase, "_" -> "-", and any
 * "-YYYYMMDD-HHMMSS" upload timestamp removed.
 */

const PNG_BASE = 'https://main--axis-securities--bansaljitendra.aem.page/images';

const OVERRIDES = {
  // hero carousel (desktop "web" illustrations)
  'sebi-web-hb': `${PNG_BASE}/hero-sebi.png`,
  'mirae-nfo-web': `${PNG_BASE}/hero-mirae-nfo.png`,
  'contra-nfo-banner-web': `${PNG_BASE}/hero-contra-nfo.png`,
  'all-in-one-roof-web-hb': `${PNG_BASE}/hero-all-in-one.png`,
  'cashback-web-hb': `${PNG_BASE}/hero-cashback.png`,
  'smallcase-web-hb': `${PNG_BASE}/hero-smallcase.png`,
  'emargin-web-hb': `${PNG_BASE}/hero-emargin.png`,
  'portfolio-analyser-web-hb': `${PNG_BASE}/hero-portfolio.png`,
  // Platforms for Seamless Access — Trader App / Trader Pro Terminal screens
  'trader-scanners': `${PNG_BASE}/home/trader-scanners.png`,
  'trader-options-strategies': `${PNG_BASE}/home/trader-options-strategies.png`,
  'trader-basket-orders': `${PNG_BASE}/home/trader-basket-orders.png`,
  'trader-real-time-chart-trading': `${PNG_BASE}/home/trader-real-time-chart-trading.png`,
  'trader-fundamental-and-technical-insights': `${PNG_BASE}/home/trader-fundamental-and-technical-insights.png`,
  'trader-option-chain-with-basket': `${PNG_BASE}/home/trader-option-chain-with-basket.png`,
  'trader-emargin': `${PNG_BASE}/home/trader-emargin.png`,
  'traderpro-scanners': `${PNG_BASE}/home/traderpro-scanners.png`,
  'traderpro-watchlist': `${PNG_BASE}/home/traderpro-watchlist.png`,
  'traderpro-smart-alert': `${PNG_BASE}/home/traderpro-smart-alert.png`,
  'traderpro-option-strategies': `${PNG_BASE}/home/traderpro-option-strategies.png`,
  'traderpro-trade-from-chart': `${PNG_BASE}/home/traderpro-trade-from-chart.png`,
  'traderpro-option-chain': `${PNG_BASE}/home/traderpro-option-chain.png`,
  // Key Features icons over the size limit
  'track-investments': `${PNG_BASE}/home/track-investments.png`,
  'margin-trading-facility': `${PNG_BASE}/home/margin-trading-facility.png`,
  'after-market-order': `${PNG_BASE}/home/after-market-order.png`,
  // App-download mobile illustration (447 KB)
  'investor-app-preview': `${PNG_BASE}/app-download-mobile.png`,
};

/** "…/uploads/all_in_one_roof_web_hb-20251118-061323.svg" -> "all-in-one-roof-web-hb" */
function svgStem(src) {
  if (!src) return null;
  let path = src;
  // Next.js image proxy: /_next/image?url=<encoded>&w=…
  const m = src.match(/[?&]url=([^&]+)/);
  if (m) {
    try { path = decodeURIComponent(m[1]); } catch (e) { /* keep raw */ }
  }
  const file = path.split('?')[0].split('#')[0].split('/').pop() || '';
  if (!/\.svg$/i.test(file)) return null;
  return file.replace(/\.svg$/i, '').toLowerCase().replace(/_/g, '-').replace(/-\d{8}-\d{6}$/, '');
}

export default function transform(hookName, element, payload) {
  if (hookName !== 'afterTransform') return;
  element.querySelectorAll('img').forEach((img) => {
    const stem = svgStem(img.getAttribute('src'));
    const png = stem && OVERRIDES[stem];
    if (!png) return;
    img.setAttribute('src', png);
    img.removeAttribute('srcset');
  });
}
