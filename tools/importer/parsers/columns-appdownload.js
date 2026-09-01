/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-appdownload. Base: columns.
 * Source: https://www.axisdirect.in/ (.mui-o9n91k)
 * Generated for Axis Direct homepage migration.
 *
 * Library convention (Columns): first row = block name; subsequent rows split
 * content into as many columns as the natural visual grouping. Source is an
 * app-download section: a lead banner image followed by two side-by-side app
 * panels (Investor App, Trader App), each with icon, title, description, ratings,
 * a QR code and store links. Emitted as an intro row (lead image) plus one row of
 * two columns — one per app panel.
 */
export default function parse(element, { document }) {
  // The two app panels are the direct children after the lead image.
  const panels = Array.from(element.querySelectorAll(':scope > .mui-yrhiuv, :scope > .mui-ozins0'));

  // Fallback: any direct-child stacks that carry an app title.
  let appPanels = panels;
  if (!appPanels.length) {
    appPanels = Array.from(element.children).filter(
      (c) => c.tagName !== 'IMG' && c.querySelector('h1, h2, h3'),
    );
  }

  // Lead banner image (the first direct-child image).
  const leadImage = element.querySelector(':scope > img');

  // Empty-block guard.
  if (!appPanels.length && !leadImage) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];

  // Determine the column count from the panel grouping (fall back to 2).
  const columnCount = appPanels.length || 2;

  // Intro row: lead image in the first cell; pad remaining cells to keep the
  // column count uniform across all rows.
  if (leadImage) {
    const introRow = [leadImage];
    while (introRow.length < columnCount) introRow.push('');
    cells.push(introRow);
  }

  // Content row: one column per app panel.
  if (appPanels.length) {
    cells.push(appPanels.map((panel) => panel));
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-appdownload', cells });
  element.replaceWith(block);
}
