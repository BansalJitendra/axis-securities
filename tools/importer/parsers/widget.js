/* eslint-disable */
/* global WebImporter */
/**
 * Parser for widget. Base: widget (custom — no block-library convention).
 * Source: https://www.axisdirect.in/
 *   instances: .mui-u14qbz (hero recommendation card), .mui-1ump8tf
 *   ("Latest Recommendations" carousel), .mui-on6ge4 (recommendations widget).
 * Generated for Axis Direct homepage migration.
 *
 * These instances are heterogeneous interactive "recommendation" widgets with no
 * fixed library structure, so this parser preserves the full meaningful content
 * of the matched element in a single-column block:
 *   - Row 1: block name (added by createBlock)
 *   - Row 2: heading (optional, kept as a semantic heading)
 *   - Row 3: the remaining content of the widget, preserving images, headings,
 *            links and text so nothing is dropped.
 */
export default function parse(element, { document }) {
  // Optional heading for semantic emphasis.
  const heading = element.querySelector('h1, h2, h3');

  // Collect all direct meaningful content nodes. We keep the live nodes (they are
  // moved into the block, then the now-empty source element is replaced), which
  // preserves images/links/headings and guarantees text completeness across the
  // differing instances.
  const contentNodes = Array.from(element.childNodes).filter((node) => {
    if (node.nodeType === 1) {
      const tag = node.tagName.toLowerCase();
      // Drop non-content elements.
      if (tag === 'script' || tag === 'style' || tag === 'noscript') return false;
      return true;
    }
    // Keep non-empty text nodes; drop whitespace-only nodes.
    if (node.nodeType === 3) return node.textContent.trim().length > 0;
    return false;
  });

  // Empty-block guard. Bail (unwrap in place, emit no block) when the element has
  // neither visible text nor media — an empty widget block adds nothing to the
  // imported content. This also cleanly skips instances that carry only
  // client-rendered/interactive scaffolding with no static content.
  const hasText = (element.textContent || '').trim().length > 0;
  const hasMedia = !!element.querySelector('img, picture, svg, video, iframe, a[href]');
  if ((!heading && contentNodes.length === 0) || (!hasText && !hasMedia)) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];

  // Heading row (only if a heading exists and is not the sole content node).
  if (heading) {
    cells.push([heading]);
  }

  // Content row: everything else. If the heading was pulled into its own row,
  // exclude it from the content cell to avoid duplicating it.
  const contentCell = contentNodes.filter((node) => node !== heading);
  if (contentCell.length) {
    cells.push([contentCell]);
  }

  // Fallback: if filtering left nothing (e.g. heading was the only node), keep it.
  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'widget', cells });
  element.replaceWith(block);
}
