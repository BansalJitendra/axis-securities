/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-carousel. Base: hero.
 * Source: https://www.axisdirect.in/ (.mui-cdmdob / .swiper-wrapper)
 * Generated for Axis Direct homepage migration.
 *
 * Library convention (Hero): 1 column. This is a multi-slide carousel, so each
 * slide contributes one 1-column row containing its background image (optional),
 * heading, subheading and call-to-action(s).
 *
 * Cross-instance resilience: the instances[] selectors include both the swiper
 * wrapper (post-init, exposes `.swiper-slide`) and the broader container (which
 * may not expose swiper classes). We therefore fall back to per-slide MuiGrid
 * containers, which exist regardless of swiper initialization.
 */
export default function parse(element, { document }) {
  // 1) Post-init: each carousel slide carries a `.swiper-slide` class.
  let slides = Array.from(element.querySelectorAll('.swiper-slide'));

  // 2) Fallback: per-slide content is wrapped in a MuiGrid container that holds
  //    the title stack. Filter to grids that actually contain a heading/title so
  //    unrelated grids are excluded.
  if (!slides.length) {
    slides = Array.from(element.querySelectorAll('.MuiGrid-container'))
      .filter((g) => g.querySelector('.mui-lkj04c, h1, h2, h3'));
  }

  // No slides found → this element is not (or is no longer) a carousel. The
  // page-templates instances[] for this block are nested (the swiper wrapper is
  // a descendant of the outer container), so once the wrapper instance has been
  // converted the outer-container instance has no slides left. Bail by unwrapping
  // in place rather than forcing a broken single-slide block.
  if (!slides.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];

  slides.forEach((slide) => {
    // Heading: prefer a real heading element, else the typography title node.
    const heading = slide.querySelector('h1, h2, h3')
      || slide.querySelector('.mui-6pydv');

    // Subheading: the descriptive paragraph beneath the heading.
    const subheading = slide.querySelector('p.mui-zsakwy, .mui-zsakwy');

    // Call-to-action links (dedupe by href — mobile + desktop copies repeat the same link).
    const ctas = [];
    const seenHrefs = new Set();
    slide.querySelectorAll('a.MuiButton-root, a[class*="MuiButton"]').forEach((a) => {
      const href = a.getAttribute('href') || '';
      if (seenHrefs.has(href)) return;
      seenHrefs.add(href);
      ctas.push(a);
    });

    // Background / hero image (optional).
    const image = slide.querySelector('img');

    const contentCell = [];
    if (image) contentCell.push(image);
    if (heading) contentCell.push(heading);
    if (subheading && subheading !== heading) contentCell.push(subheading);
    ctas.forEach((cta) => contentCell.push(cta));

    // Only add a row if the slide yielded content.
    if (contentCell.length) cells.push([contentCell]);
  });

  // Empty-block guard: nothing extracted → unwrap in place.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-carousel', cells });
  element.replaceWith(block);
}
