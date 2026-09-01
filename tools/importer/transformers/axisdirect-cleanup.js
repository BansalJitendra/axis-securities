/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: axisdirect site-wide cleanup.
 *
 * Removes non-authorable site chrome from the Axis Direct (Next.js/MUI SPA)
 * homepage so the import contains only page-level authorable content.
 *
 * All selectors verified by reading migration-work/cleaned.html:
 *   - <header class="MuiStack-root mui-149e5i1">   → global header shell
 *       (contains the skip-navigation instructions, the rfm-marquee live ticker,
 *        and both <nav> elements — all site chrome, removed with the header)
 *   - <footer id="footer-content">                 → global footer shell
 *   - <nav> (x2, both inside the header)           → utility/main navigation
 *
 * Scripts, styles, svg, link, noscript, iframe tags and tracking attributes
 * (onclick/data-track/style/aria/role) are already stripped from cleaned.html
 * by the scraper, so no attribute/element cleanup is needed here.
 */

const TransformHook = {
  beforeTransform: 'beforeTransform',
  afterTransform: 'afterTransform',
};

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.afterTransform) {
    // Non-authorable site chrome (verified in cleaned.html).
    WebImporter.DOMUtils.remove(element, [
      'header',
      'footer',
      '#footer-content',
      '#skip-navigation-intsructions-wrapper',
      '.rfm-marquee-container',
      'nav',
    ]);
  }
}
