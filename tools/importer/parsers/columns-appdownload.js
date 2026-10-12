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
 *
 * Mobile-only source content (rendered only below the desktop breakpoint, so
 * absent from the desktop DOM) is read from the Next.js flight data:
 *   - the portrait phone illustration → second cell of the intro row
 *   - the panel header's "get the app" link (chevron) → <p><a> after the title
 */

const SOURCE_ASSETS = 'https://www.axisdirect.in/simplehai-assets';

/** Concatenated flight payload (stashed by the import script's onLoad). */
function flightText(document) {
  const sources = [];
  if (typeof window !== 'undefined' && window.__IMPORT_FLIGHT_SCRIPTS__) sources.push(window.__IMPORT_FLIGHT_SCRIPTS__);
  document.querySelectorAll('script').forEach((s) => sources.push(s.textContent || ''));
  return sources.join('\n').replace(/\\\//g, '/');
}

export default function parse(element, { document }) {
  const flight = flightText(document);
  const mobileImgPath = (flight.match(/\/uploads\/[A-Za-z0-9_.-]*app_preview[A-Za-z0-9_.-]*\.(?:svg|png|jpe?g|webp)/) || [])[0];
  const appLink = (flight.match(/https:\/\/onelink\.to\/[A-Za-z0-9]+/) || [])[0];
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
    if (mobileImgPath && columnCount > 1) {
      const mobileImg = document.createElement('img');
      mobileImg.setAttribute('src', `${SOURCE_ASSETS}${mobileImgPath}`);
      mobileImg.setAttribute('alt', leadImage.getAttribute('alt') || 'Axis Direct Investor App home screen on a phone');
      introRow.push(mobileImg);
    }
    while (introRow.length < columnCount) introRow.push('');
    cells.push(introRow);
  }

  // Content row: one column per app panel; the mobile header link goes right
  // after the panel title.
  if (appPanels.length) {
    cells.push(appPanels.map((panel) => {
      const title = panel.querySelector('h1, h2, h3');
      if (appLink && title) {
        const p = document.createElement('p');
        const a = document.createElement('a');
        a.setAttribute('href', appLink);
        a.textContent = `Download the ${title.textContent.replace(/^\s*Get the\s*/i, '').trim()}`;
        p.append(a);
        title.after(p);
      }
      return panel;
    }));
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-appdownload', cells });
  element.replaceWith(block);
}
