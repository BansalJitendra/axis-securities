/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-carousel. Base: hero.
 * Source: https://www.axisdirect.in/ (first .swiper in #main-content — the only
 * swiper whose slides carry an <h1>).
 *
 * Library convention (Hero): 1 column. This is a multi-slide carousel, so each
 * slide contributes one 1-column row containing, in order:
 *   - Background Image (optional)  — the slide illustration
 *   - Title (optional)             — styled as a heading (<h1> first slide, <h2> others)
 *   - Subheading (optional)        — additional text: paragraph(s), a "- " bullet
 *                                    list rendered as <ul>, small print as <p><sub>
 *   - Call-to-Action (optional)    — text with a link (<p><strong><a>)
 * <strong> inside the title / small print marks the accent-coloured words.
 *
 * Source DOM (Next.js + MUI; emotion class hashes are unstable, so none are used):
 *   .swiper-slide
 *     > div (mobile copy)   — mob illustration, small type
 *     > div (desktop copy)  — web illustration, full type   <- parsed
 *         [role=heading] > span > p+   title lines, accent <span style="color:...">
 *         [role=none]    > span > p+   subheading; <span style="font-size:<=12px"> = small print
 *         a.MuiButton-root             CTA (repeated in a mobile CTA bar)
 *         img                          /_next/image?url=<svg>
 */

const ACCENT_RE = /color\s*:\s*(hsl\(\s*334|#99144e|#97144d|rgb\(\s*15[13],\s*20)/i;

const cleanText = (s) => s.replace(/ /g, ' ').replace(/\s+/g, ' ');

const styled = (n, test) => n.nodeType === 1
  && (test(n.getAttribute('style') || '')
    || [...n.querySelectorAll('[style]')].some((c) => test(c.getAttribute('style'))));

const isAccent = (n) => styled(n, (s) => ACCENT_RE.test(s));

const isSmall = (n) => styled(n, (s) => {
  const m = s.match(/font-size\s*:\s*([\d.]+)px/i);
  return !!m && parseFloat(m[1]) <= 12;
});

/** Split the text content of a source node into lines at <p> and <br> boundaries. */
function sourceLines(src) {
  const blocks = src.querySelectorAll('p');
  const lines = [];
  (blocks.length ? [...blocks] : [src]).forEach((p) => {
    let line = [];
    p.childNodes.forEach((n) => {
      if (n.nodeType === 1 && n.tagName === 'BR') {
        lines.push(line);
        line = [];
      } else line.push(n);
    });
    lines.push(line);
  });
  return lines.filter((l) => l.some((n) => cleanText(n.textContent).trim()));
}

/** Append a line's inline content: accent spans -> <strong>, other markup -> text. */
function appendInline(document, target, nodes) {
  nodes.forEach((n) => {
    const text = cleanText(n.textContent);
    if (!text.trim() && n.nodeType === 1) return;
    if (isAccent(n)) {
      const strong = document.createElement('strong');
      strong.textContent = text.trim();
      target.append(strong);
    } else {
      target.append(document.createTextNode(text));
    }
  });
  const { firstChild, lastChild } = target;
  if (firstChild && firstChild.nodeType === 3) firstChild.textContent = firstChild.textContent.replace(/^\s+/, '');
  if (lastChild && lastChild.nodeType === 3) lastChild.textContent = lastChild.textContent.replace(/\s+$/, '');
}

function buildTitle(document, src, level) {
  const h = document.createElement(`h${level}`);
  sourceLines(src).forEach((nodes, i) => {
    if (i) h.append(document.createElement('br'));
    appendInline(document, h, nodes);
  });
  return h.textContent.trim() ? h : null;
}

function buildSubheading(document, src) {
  const out = [];
  let list = null;
  sourceLines(src).forEach((nodes) => {
    const text = cleanText(nodes.map((n) => n.textContent).join('')).trim();
    if (/^[-–•]\s+/.test(text)) {
      if (!list) {
        list = document.createElement('ul');
        out.push(list);
      }
      const li = document.createElement('li');
      appendInline(document, li, nodes);
      if (li.firstChild && li.firstChild.nodeType === 3) {
        li.firstChild.textContent = li.firstChild.textContent.replace(/^[-–•]\s+/, '');
      }
      list.append(li);
      return;
    }
    list = null;
    const p = document.createElement('p');
    const textNodes = nodes.filter((n) => cleanText(n.textContent).trim());
    if (textNodes.every(isSmall)) {
      const sub = document.createElement('sub');
      appendInline(document, sub, nodes);
      p.append(sub);
    } else {
      appendInline(document, p, nodes);
    }
    out.push(p);
  });
  return out;
}

/** /_next/image?url=<encoded>&w=... -> original asset URL. */
function originalImageUrl(img) {
  const src = img.getAttribute('src') || '';
  const m = src.match(/[?&]url=([^&]+)/);
  if (m) return decodeURIComponent(m[1]);
  try { return new URL(src, 'https://www.axisdirect.in').href; } catch (e) { return src; }
}

export default function parse(element, { document }) {
  // Swiper loop mode clones slides; keep one per data-swiper-slide-index.
  const seenIdx = new Set();
  const slides = [...element.querySelectorAll('.swiper-slide')].filter((s) => {
    if (s.classList.contains('swiper-slide-duplicate')) return false;
    const idx = s.getAttribute('data-swiper-slide-index');
    if (idx === null) return true;
    if (seenIdx.has(idx)) return false;
    seenIdx.add(idx);
    return true;
  });

  if (!slides.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];

  slides.forEach((slide) => {
    // The desktop copy is the last child holding a heading; fall back to the slide.
    const copies = [...slide.children].filter((c) => c.querySelector('[role="heading"], h1, h2, h3'));
    const root = copies[copies.length - 1] || slide;

    // Title
    const titleSrc = root.querySelector('[role="heading"], h1, h2, h3');
    const title = titleSrc ? buildTitle(document, titleSrc, cells.length ? 2 : 1) : null;

    // Subheading
    const subSrc = root.querySelector('[role="none"]');
    const subheading = subSrc ? buildSubheading(document, subSrc) : [];

    // Call-to-Action (the desktop copy repeats it in a mobile bar; dedupe by href)
    const ctas = [];
    const hrefs = new Set();
    root.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href');
      const label = cleanText(a.textContent).trim();
      if (!label || hrefs.has(href)) return;
      hrefs.add(href);
      const p = document.createElement('p');
      const strong = document.createElement('strong');
      const link = document.createElement('a');
      link.href = href;
      link.textContent = label;
      strong.append(link);
      p.append(strong);
      ctas.push(p);
    });

    // Background Image — source alts are empty or a generic copy-paste, so
    // describe the illustration with the slide title instead.
    const contentCell = [];
    const srcImg = root.querySelector('img');
    if (srcImg) {
      const img = document.createElement('img');
      img.src = originalImageUrl(srcImg);
      img.alt = title
        ? cleanText([...title.childNodes].map((n) => (n.nodeName === 'BR' ? ' ' : n.textContent)).join('')).trim()
        : (srcImg.getAttribute('alt') || '');
      contentCell.push(img);
    }
    if (title) contentCell.push(title);
    contentCell.push(...subheading, ...ctas);

    if (title || contentCell.length > 1) cells.push([contentCell]);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-carousel', cells });
  element.replaceWith(block);
}
