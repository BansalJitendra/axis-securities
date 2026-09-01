/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-features. Base: cards.
 * Source: https://www.axisdirect.in/ (.mui-10os289)
 * Generated for Axis Direct homepage migration.
 *
 * Library convention (Cards): 2 columns. First row = block name; each subsequent
 * row is one card (cell 1 = image/icon, cell 2 = text: title + description/CTA).
 * Source is a "Key Features" section: a heading + subheading, then a carousel of
 * feature cards, each with an icon image, an <h3> title and a bullet list of
 * feature points. Emitted as: an intro row (heading + subheading) followed by one
 * 2-column row per feature card.
 */
export default function parse(element, { document }) {
  // Section heading(s): the main title and the descriptive subheading.
  const headings = Array.from(element.querySelectorAll(':scope > .mui-44obd5 h2, :scope > div > h2'));
  const introHeadings = headings.length
    ? headings
    : Array.from(element.querySelectorAll('h2')).slice(0, 2);

  // Feature cards.
  let cards = Array.from(element.querySelectorAll('.mui-19yww5h'));
  if (!cards.length) cards = Array.from(element.querySelectorAll('.swiper-slide'));

  // Empty-block guard.
  if (!cards.length && !introHeadings.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];

  // Intro row: heading(s) in the first cell, empty second cell keeps 2-column shape.
  if (introHeadings.length) {
    cells.push([introHeadings, '']);
  }

  cards.forEach((card) => {
    const img = card.querySelector('img');
    const title = card.querySelector('h1, h2, h3, h4, h5, h6');
    // The bullet list of feature points (description content).
    const list = card.querySelector('ol, ul');

    const imageCell = img || '';

    const textCell = [];
    if (title) textCell.push(title);
    if (list) textCell.push(list);
    // Fallback: if neither title nor list found, use the card's text.
    if (!textCell.length) textCell.push(card.textContent.trim());

    cells.push([imageCell, textCell]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-features', cells });
  element.replaceWith(block);
}
