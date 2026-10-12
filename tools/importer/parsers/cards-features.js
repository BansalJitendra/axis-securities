/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-features. Base: cards.
 * Source: https://www.axisdirect.in/ ("Key Features" — the section holding the
 * features swiper; matched structurally, see page-templates.json).
 * Generated for Axis Direct homepage migration.
 *
 * Library convention (Cards): 2 columns. First row = block name; each
 * subsequent row is one card — cell 1 = Image/Icon, cell 2 = Text content
 * (Title as a heading, Description below it, optional Call-to-Action link).
 * Rows emitted, all in that 2-cell shape:
 *   - intro:   (no image) | <h2> title (accent word in <strong>) + <p> description
 *   - card:    icon <img> | <h3><a href=feature page>title</a></h3> + <ul> description points
 *   - closing: (no image) | <p><a>Explore all Features</a></p> call-to-action
 *
 * The swiper keeps only some slides (in rotated order) in the DOM, so features
 * are read from the page's Next.js flight data — same order, icons, alt text
 * and links as the source. The rendered DOM is the fallback.
 */
// --- Next.js flight-data helpers (kept inline: parsers must be self-contained) ---
// The importer hands parsers a script-free DOM copy; import-home.js's onLoad
// stashes the live page's flight scripts on window.__IMPORT_FLIGHT_SCRIPTS__.
const SOURCE_ORIGIN = 'https://www.axisdirect.in';
const ASSET_BASE = `${SOURCE_ORIGIN}/simplehai-assets`;

function flightPayload(document) {
  const sources = [];
  if (typeof window !== 'undefined' && window.__IMPORT_FLIGHT_SCRIPTS__) sources.push(window.__IMPORT_FLIGHT_SCRIPTS__);
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

/** First `"key":` whose value is a JSON array/object → { value, at } or null. */
function flightProp(payload, key, from = 0) {
  const needle = `"${key}":`;
  let at = payload.indexOf(needle, from);
  while (at >= 0) {
    const start = at + needle.length;
    const open = payload[start];
    if (open === '[' || open === '{') {
      const close = open === '[' ? ']' : '}';
      let depth = 0; let inStr = false; let esc = false;
      for (let i = start; i < payload.length; i += 1) {
        const c = payload[i];
        if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; }
        else if (c === '"') inStr = true;
        else if (c === open) depth += 1;
        else if (c === close) {
          depth -= 1;
          if (depth === 0) {
            try { return { value: JSON.parse(payload.slice(start, i + 1)), at }; } catch (e) { break; }
          }
        }
      }
    }
    at = payload.indexOf(needle, at + 1);
  }
  return null;
}

const assetUrl = (p) => (!p || /^https?:/i.test(p) ? p || '' : `${ASSET_BASE}${p.startsWith('/') ? '' : '/'}${p}`);
const pageUrl = (p) => (!p || /^https?:/i.test(p) ? p || '' : `${SOURCE_ORIGIN}${p.startsWith('/') ? '' : '/'}${p}`);

/** "<p>Key <span style=color:…>Features</span></p>" → heading; accent (non-black) spans → <strong>. */
function richHeading(document, tag, html, fallback) {
  const h = document.createElement(tag);
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  const src = tmp.querySelector('p') || tmp;
  if (!src.textContent.trim()) { h.textContent = fallback || ''; return h; }
  src.childNodes.forEach((n) => {
    const style = (n.nodeType === 1 && n.getAttribute('style')) || '';
    const accent = /color/i.test(style) && !/hsl\(\s*0\s*,\s*0%\s*,\s*0%\s*\)|#000\b|rgb\(\s*0,\s*0,\s*0\s*\)/i.test(style);
    if (accent) {
      const strong = document.createElement('strong');
      strong.textContent = n.textContent;
      h.append(strong);
    } else {
      h.append(document.createTextNode(n.textContent));
    }
  });
  return h;
}

const str = (m) => { try { return m ? JSON.parse(m[1]) : null; } catch (e) { return null; } };

function fromFlightData(document) {
  const payload = flightPayload(document);
  const features = flightProp(payload, 'features');
  if (!features || !Array.isArray(features.value) || !features.value.length
    || !features.value[0].heading) return null;

  // Title + subtitle precede the features prop; the CTA follows it.
  const before = payload.slice(Math.max(0, features.at - 1500), features.at);
  const after = payload.slice(features.at, features.at + 20000);
  return {
    title: str([...before.matchAll(/"label":("(?:[^"\\]|\\.)*")/g)].pop()),
    // subtitle: the string children of the last {"component":"h2", sx:{…}, …} before the features
    subtitle: str(before.slice(Math.max(0, before.lastIndexOf('"component":"h2"')))
      .match(/"children":("(?:[^"\\]|\\.)*")/)),
    features: features.value,
    ctaLabel: str(after.match(/"allFeatureButtonLabel":("(?:[^"\\]|\\.)*")/)),
    ctaUrl: str(after.match(/"viewAllFeatureRedirectUrl":("(?:[^"\\]|\\.)*")/)),
  };
}

function link(document, href, text) {
  const a = document.createElement('a');
  a.href = href;
  a.textContent = text;
  return a;
}

export default function parse(element, { document }) {
  const data = fromFlightData(document);
  const cells = [];

  if (data) {
    // Intro: title + description in the text cell.
    const intro = [richHeading(document, 'h2', data.title, 'Key Features')];
    if (data.subtitle) {
      const p = document.createElement('p');
      p.textContent = data.subtitle;
      intro.push(p);
    }
    cells.push(['', intro]);

    // Cards: icon | title (linked) + description points.
    data.features.forEach((f) => {
      const img = document.createElement('img');
      img.src = assetUrl(f.imageUrl);
      img.alt = f.imageAltText || f.heading || '';

      const h3 = document.createElement('h3');
      if (f.path) h3.append(link(document, pageUrl(f.path), f.heading));
      else h3.textContent = f.heading;

      const text = [h3];
      if (Array.isArray(f.benefits) && f.benefits.length) {
        const ul = document.createElement('ul');
        f.benefits.forEach((b) => {
          const li = document.createElement('li');
          li.textContent = b;
          ul.append(li);
        });
        text.push(ul);
      }
      cells.push([img, text]);
    });

    // Closing call-to-action.
    if (data.ctaLabel && data.ctaUrl) {
      const p = document.createElement('p');
      p.append(link(document, pageUrl(data.ctaUrl), data.ctaLabel));
      cells.push(['', [p]]);
    }
  } else {
    // DOM fallback: heading(s), then whatever cards the swiper rendered.
    const introHeadings = Array.from(element.querySelectorAll('h2')).slice(0, 2);
    const slides = Array.from(element.querySelectorAll('.swiper-slide'));
    if (!slides.length && !introHeadings.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    if (introHeadings.length) cells.push(['', introHeadings]);

    const seen = new Set();
    slides.forEach((card) => {
      const title = card.querySelector('h1, h2, h3, h4, h5, h6');
      const key = title ? title.textContent.trim() : card.textContent.trim();
      if (seen.has(key)) return; // swiper loop clones
      seen.add(key);
      const img = card.querySelector('img');
      const list = card.querySelector('ol, ul');
      const textCell = [];
      if (title) textCell.push(title);
      if (list) textCell.push(list);
      if (!textCell.length) textCell.push(card.textContent.trim());
      cells.push([img || '', textCell]);
    });

    const cta = [...element.querySelectorAll('a[href]')].find((a) => /explore/i.test(a.textContent));
    if (cta) {
      const p = document.createElement('p');
      p.append(link(document, cta.href, cta.textContent.trim()));
      cells.push(['', [p]]);
    }
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-features', cells });
  element.replaceWith(block);
}
