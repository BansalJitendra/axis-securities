/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-stats. Base: columns.
 * Source: https://www.axisdirect.in/ (.mui-158jxei)
 * Generated for Axis Direct homepage migration.
 *
 * Library convention (Columns): first row = block name; subsequent rows split
 * content into as many columns as the natural visual grouping. Here the source
 * is a row of trust/stat items (icon + label) separated by <hr> dividers, so we
 * emit ONE content row whose cells are the individual stat items — one column
 * per stat.
 */
export default function parse(element, { document }) {
  // Each stat item: icon image(s) + a heading/label. Dividers (<hr>) between them
  // are decorative and excluded.
  const items = Array.from(element.querySelectorAll(':scope > .mui-og3pzo'));

  // Fallback: if the direct-child selector matched nothing, take any stat items.
  const statItems = items.length
    ? items
    : Array.from(element.querySelectorAll('.mui-og3pzo'));

  // Empty-block guard.
  if (!statItems.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];

  // One row, one cell per stat item (each item keeps its icon image(s) + label).
  const row = statItems.map((item) => {
    const cellContent = [];
    // Preserve the meaningful children (images + label text), dropping empty wrappers.
    item.querySelectorAll('img').forEach((img) => cellContent.push(img));
    const label = item.querySelector('.mui-f4y4in, span, h2, h3, p');
    if (label) cellContent.push(label);
    // If nothing specific matched, fall back to the whole item.
    return cellContent.length ? cellContent : [item];
  });
  cells.push(row);

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-stats', cells });
  element.replaceWith(block);
}
