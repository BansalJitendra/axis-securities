/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: axisdirect section breaks / section metadata.
 *
 * Template "home" defines 3 sections (from tools/importer/page-templates.json):
 *   rc1 "Hero"          selector .mui-cdmdob    style null
 *   rc3 "Trust/…/Feat"  selector .mui-103t6ge   style null
 *   rc4 "App Download"  selector .mui-o9n91k    style null
 *
 * All three boundary selectors verified in migration-work/cleaned.html as
 * distinct elements under <main> (rc4 is a sibling after rc3, not nested).
 * No section has a `style`, so this transformer only inserts <hr> section
 * breaks (one before every section except the first → 2 breaks) and adds no
 * Section Metadata blocks.
 *
 * page-templates.json stores each `selector` as an array, so it is normalized
 * to a single CSS selector string before use.
 *
 * Follows the reference implementation: breaks are inserted in beforeTransform
 * (while every section element still exists, before parsers replace them),
 * iterating sections in reverse. Section Metadata (none here) would be added in
 * afterTransform anchored to a marker <hr>.
 */

const SECTION_MARKER_ATTR = 'data-excat-section-id';

function sectionSelector(section) {
  const sel = section.selector;
  return Array.isArray(sel) ? sel[0] : sel;
}

export default function transform(hookName, element, payload) {
  const sections = (payload.template && payload.template.sections) || [];

  if (hookName === 'beforeTransform') {
    // Insert breaks now, before parsers can replace any section element.
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (i === 0 && !section.style) continue; // first section: no leading break
      const sectionEl = element.querySelector(sectionSelector(section));
      if (!sectionEl) continue; // selector didn't match — skip, never guess

      const hr = document.createElement('hr');
      if (section.style) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
      sectionEl.before(hr);
    }
  }

  if (hookName === 'afterTransform') {
    // Add Section Metadata for any styled section, anchored to its marker <hr>
    // (or the original element if it survived). No styled sections in this
    // template, so this loop is effectively a no-op but kept per reference.
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (!section.style) continue;

      const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
      const anchor = marker || element.querySelector(sectionSelector(section));
      if (!anchor) continue;

      const metadataBlock = WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata',
        cells: { style: section.style },
      });
      anchor.after(metadataBlock);

      if (marker) {
        marker.removeAttribute(SECTION_MARKER_ATTR);
        if (i === 0) marker.remove();
      }
    }
  }
}
