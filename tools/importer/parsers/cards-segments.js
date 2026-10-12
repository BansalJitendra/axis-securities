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

/**
 * "<h2><p><span style=color:hsl(0,0%,0%)>Unified Access to </span>
 *  <span style=color:hsl(334,…)>All Segments in One Account</span></p></h2>"
 * → <h2>Unified Access to <strong>All Segments in One Account</strong></h2>
 * (accent = coloured, non-black span; same convention as cards-features/widget).
 * When inline styles were stripped, the rich-text runs are still separate
 * sibling spans inside the <p>: the first run is plain, later runs are accent.
 */
function accentHeading(document, source) {
  const h = document.createElement('h2');
  const p = source.querySelector('p') || source;
  const spans = [...p.children].filter((c) => c.tagName === 'SPAN' && c.textContent.trim());
  if (spans.length < 2) { h.textContent = source.textContent.trim(); return h; }
  const styled = spans.some((s) => /color/i.test(s.getAttribute('style') || ''));
  spans.forEach((s, i) => {
    const style = s.getAttribute('style') || '';
    const black = styled
      ? !/color/i.test(style) || /hsl\(\s*0\s*,\s*0%\s*,\s*0%\s*\)|#000\b|rgb\(\s*0,\s*0,\s*0\s*\)/i.test(style)
      : i === 0;
    if (black) {
      h.append(document.createTextNode(s.textContent));
    } else {
      const strong = document.createElement('strong');
      strong.textContent = s.textContent.trim();
      h.append(strong);
    }
  });
  return h;
}

export default function parse(element, { document }) {
  // Optional section heading. It belongs to this block's content, so it must be
  // captured inside the block (not left as a sibling, which would drop it from the
  // content-completeness score). Placed as the first row with an empty second cell
  // to keep the 2-column shape consistent.
  const sourceHeading = element.querySelector(':scope > h2, :scope > h1, h2');
  const sectionHeading = sourceHeading && accentHeading(document, sourceHeading);

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
