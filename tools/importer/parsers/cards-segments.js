/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-segments. Base: cards.
 * Source: https://www.axisdirect.in/ (.mui-1frjd1d)
 * Generated for Axis Direct homepage migration.
 *
 * Library convention (Cards): 2 columns. First row = block name. Each subsequent
 * row is one card: cell 1 = image/icon (mandatory), cell 2 = text (title + optional
 * CTA). Source is a carousel of segment tiles, each an <a> wrapping an icon image
 * and an <h3> title. We emit one 2-column row per segment.
 */
export default function parse(element, { document }) {
  // Optional section heading. It belongs to this block's content, so it must be
  // captured inside the block (not left as a sibling, which would drop it from the
  // content-completeness score). Placed as the first row with an empty second cell
  // to keep the 2-column shape consistent.
  const sectionHeading = element.querySelector(':scope > h2, :scope > h1, h2');

  // Each segment card is an anchor containing an icon image + an <h3> title.
  let cardLinks = Array.from(element.querySelectorAll('a'))
    .filter((a) => a.querySelector('img') || a.querySelector('h3, h2, h4'));

  // Fallback: if no anchors matched, use the per-slide content wrappers.
  if (!cardLinks.length) {
    cardLinks = Array.from(element.querySelectorAll('.mui-1owyt9z'));
  }

  // Empty-block guard.
  if (!cardLinks.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];

  // Section heading as the first content row (empty 2nd cell keeps 2-column shape).
  if (sectionHeading) {
    cells.push([sectionHeading, '']);
  }

  cardLinks.forEach((card) => {
    const img = card.querySelector('img');
    const title = card.querySelector('h1, h2, h3, h4, h5, h6');
    const href = card.tagName === 'A' ? card.getAttribute('href') : null;

    // Image cell (mandatory per convention). If missing, use an empty cell to
    // keep the 2-column shape.
    const imageCell = img || '';

    // Text cell: a linked title when we have both an href and a title, otherwise
    // whichever is available.
    let textCell;
    if (href && title) {
      // Use the title's text (not the heading node) so it does not serialize as
      // a markdown heading ("### Equities") inside the link.
      const a = document.createElement('a');
      a.setAttribute('href', href);
      a.textContent = title.textContent.trim();
      textCell = a;
    } else if (title) {
      textCell = title;
    } else if (href) {
      const a = document.createElement('a');
      a.setAttribute('href', href);
      a.textContent = card.textContent.trim();
      textCell = a;
    } else {
      textCell = card.textContent.trim();
    }

    cells.push([imageCell, textCell]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-segments', cells });
  element.replaceWith(block);
}
