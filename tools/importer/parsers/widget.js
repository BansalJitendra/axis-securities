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
 *
 * "Platforms for Seamless Access" (the instance holding a [role=tablist]) is
 * special-cased: the source only renders the active platform tab, so all three
 * platforms are read from the Next.js flight data (self.__next_f) embedded in
 * the page and authored as:
 *   - Row: section title <h2> (accent words in <strong>) + "Platform Features" <h2>
 *   - One row per platform: <h3>platform</h3>, then per feature
 *     <h4>label</h4> + media (<img> or a link to the .webm video) + <p>description</p>,
 *     and finally the platform CTA <p><a></a></p>.
 */

const SOURCE_ORIGIN = 'https://www.axisdirect.in';
const ASSET_BASE = `${SOURCE_ORIGIN}/simplehai-assets`;

/**
 * Concatenated Next.js flight payload strings. The importer hands parsers a
 * script-free copy of the DOM, so the import script's onLoad stashes the live
 * page's flight scripts on window.__IMPORT_FLIGHT_SCRIPTS__; fall back to the
 * inline scripts of `document` (e.g. when the parser runs on the live DOM).
 */
function flightPayload(document) {
  const sources = [];
  if (typeof window !== 'undefined' && window.__IMPORT_FLIGHT_SCRIPTS__) {
    sources.push(window.__IMPORT_FLIGHT_SCRIPTS__);
  }
  document.querySelectorAll('script').forEach((s) => sources.push(s.textContent || ''));

  let out = '';
  sources.forEach((text) => {
    const re = /self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g;
    let m;
    while ((m = re.exec(text))) {
      try { out += JSON.parse(m[1]); } catch (e) { /* skip malformed chunk */ }
    }
  });
  return out;
}

/** Balanced-brace JSON object that encloses position `at`, starting at `start`. */
function objectAt(text, start) {
  let depth = 0; let inStr = false; let esc = false;
  for (let i = start; i < text.length; i += 1) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) {
        try { return JSON.parse(text.slice(start, i + 1)); } catch (e) { return null; }
      }
    }
  }
  return null;
}

/** [{ appNamePrefix, appNameSuffix, appHeader, platformFeaturesArray: [...] }, ...] */
function platformsData(document) {
  const payload = flightPayload(document);
  const key = '"platforms":[';
  const at = payload.indexOf(key);
  if (at < 0) return { platforms: [], title: null };
  const apps = [];
  let i = at + key.length;
  while (payload[i] === '{') {
    const obj = objectAt(payload, i);
    if (!obj) break;
    apps.push(obj);
    // advance past this object
    let depth = 0; let inStr = false; let esc = false; let j = i;
    for (; j < payload.length; j += 1) {
      const c = payload[j];
      if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; }
      else if (c === '"') inStr = true;
      else if (c === '{') depth += 1;
      else if (c === '}') { depth -= 1; if (depth === 0) break; }
    }
    i = j + 1;
    if (payload[i] === ',') i += 1;
  }
  // Section title label sits just before the platforms prop.
  const before = payload.slice(Math.max(0, at - 1500), at);
  const labels = [...before.matchAll(/"label":("(?:[^"\\]|\\.)*")/g)];
  let title = null;
  if (labels.length) { try { title = JSON.parse(labels[labels.length - 1][1]); } catch (e) { /* ignore */ } }
  return { platforms: apps, title };
}

/**
 * Rich-text label ("<p>Platforms for <span style=color:…>Seamless Access</span></p>")
 * → heading element with the coloured span authored as <strong>.
 */
function richHeading(document, tag, html, fallback) {
  const h = document.createElement(tag);
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  const src = tmp.querySelector('p') || tmp;
  if (!src.textContent.trim()) {
    h.textContent = fallback || '';
    return h;
  }
  src.childNodes.forEach((n) => {
    if (n.nodeType === 3) h.append(document.createTextNode(n.textContent));
    else if (n.nodeType === 1 && /color/i.test(n.getAttribute('style') || '')) {
      const strong = document.createElement('strong');
      strong.textContent = n.textContent;
      h.append(strong);
    } else if (n.nodeType === 1) h.append(document.createTextNode(n.textContent));
  });
  return h;
}

function assetUrl(path) {
  if (!path) return '';
  if (/^https?:/i.test(path)) return path;
  return `${ASSET_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

function parsePlatforms(element, document) {
  const { platforms, title } = platformsData(document);
  if (!platforms.length) return false;

  const titleText = (element.querySelector('h2') || {}).textContent || 'Platforms for Seamless Access';
  const headRow = [
    richHeading(document, 'h2', title, titleText.trim()),
    richHeading(document, 'h2', platforms[0].appHeader, 'Platform Features'),
  ];

  const rows = [[headRow]]; // one cell holding both headings
  platforms.forEach((app) => {
    const name = [app.appNamePrefix, app.appNameSuffix].filter(Boolean).join(' ').trim();
    const cell = [];
    const h3 = document.createElement('h3');
    h3.textContent = name;
    cell.push(h3);

    const features = app.platformFeaturesArray || [];
    features.forEach((f) => {
      const h4 = document.createElement('h4');
      h4.textContent = f.label;
      cell.push(h4);

      const url = assetUrl(f.appPreviewImage);
      if (url && (f.assetType === 'VIDEO' || /\.(webm|mp4)$/i.test(url))) {
        const p = document.createElement('p');
        const a = document.createElement('a');
        a.href = url;
        a.textContent = url;
        p.append(a);
        cell.push(p);
      } else if (url) {
        const img = document.createElement('img');
        img.src = url;
        img.alt = `${f.label} on Axis Direct ${name}`;
        cell.push(img);
      }

      if (f.description) {
        const p = document.createElement('p');
        p.textContent = f.description;
        cell.push(p);
      }
    });

    // One CTA per platform (identical across its features on the source).
    const ctaSrc = features.find((f) => f.redirectUrl);
    if (ctaSrc) {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = ctaSrc.redirectUrl;
      a.textContent = ctaSrc.startInvesting || 'Download App';
      p.append(a);
      cell.push(p);
    }
    rows.push([cell]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'widget', cells: rows });
  element.replaceWith(block);
  return true;
}

export default function parse(element, { document }) {
  if (element.querySelector('[role="tablist"]') && /platform/i.test(element.textContent)
    && parsePlatforms(element, document)) {
    return;
  }

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
