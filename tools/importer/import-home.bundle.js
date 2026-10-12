/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-home.js
  var import_home_exports = {};
  __export(import_home_exports, {
    default: () => import_home_default
  });

  // tools/importer/parsers/hero-carousel.js
  var ACCENT_RE = /color\s*:\s*(hsl\(\s*334|#99144e|#97144d|rgb\(\s*15[13],\s*20)/i;
  var cleanText = (s) => s.replace(/ /g, " ").replace(/\s+/g, " ");
  var styled = (n, test) => n.nodeType === 1 && (test(n.getAttribute("style") || "") || [...n.querySelectorAll("[style]")].some((c) => test(c.getAttribute("style"))));
  var isAccent = (n) => styled(n, (s) => ACCENT_RE.test(s));
  var isSmall = (n) => styled(n, (s) => {
    const m = s.match(/font-size\s*:\s*([\d.]+)px/i);
    return !!m && parseFloat(m[1]) <= 12;
  });
  function sourceLines(src) {
    const blocks = src.querySelectorAll("p");
    const lines = [];
    (blocks.length ? [...blocks] : [src]).forEach((p) => {
      let line = [];
      p.childNodes.forEach((n) => {
        if (n.nodeType === 1 && n.tagName === "BR") {
          lines.push(line);
          line = [];
        } else line.push(n);
      });
      lines.push(line);
    });
    return lines.filter((l) => l.some((n) => cleanText(n.textContent).trim()));
  }
  function appendInline(document2, target, nodes) {
    nodes.forEach((n) => {
      const text = cleanText(n.textContent);
      if (!text.trim() && n.nodeType === 1) return;
      if (isAccent(n)) {
        const strong = document2.createElement("strong");
        strong.textContent = text.trim();
        target.append(strong);
      } else {
        target.append(document2.createTextNode(text));
      }
    });
    const { firstChild, lastChild } = target;
    if (firstChild && firstChild.nodeType === 3) firstChild.textContent = firstChild.textContent.replace(/^\s+/, "");
    if (lastChild && lastChild.nodeType === 3) lastChild.textContent = lastChild.textContent.replace(/\s+$/, "");
  }
  function buildTitle(document2, src, level) {
    const h = document2.createElement(`h${level}`);
    sourceLines(src).forEach((nodes, i) => {
      if (i) h.append(document2.createElement("br"));
      appendInline(document2, h, nodes);
    });
    return h.textContent.trim() ? h : null;
  }
  function buildSubheading(document2, src) {
    const out = [];
    let list = null;
    sourceLines(src).forEach((nodes) => {
      const text = cleanText(nodes.map((n) => n.textContent).join("")).trim();
      if (/^[-–•]\s+/.test(text)) {
        if (!list) {
          list = document2.createElement("ul");
          out.push(list);
        }
        const li = document2.createElement("li");
        appendInline(document2, li, nodes);
        if (li.firstChild && li.firstChild.nodeType === 3) {
          li.firstChild.textContent = li.firstChild.textContent.replace(/^[-–•]\s+/, "");
        }
        list.append(li);
        return;
      }
      list = null;
      const p = document2.createElement("p");
      const textNodes = nodes.filter((n) => cleanText(n.textContent).trim());
      if (textNodes.every(isSmall)) {
        const sub = document2.createElement("sub");
        appendInline(document2, sub, nodes);
        p.append(sub);
      } else {
        appendInline(document2, p, nodes);
      }
      out.push(p);
    });
    return out;
  }
  function originalImageUrl(img) {
    const src = img.getAttribute("src") || "";
    const m = src.match(/[?&]url=([^&]+)/);
    if (m) return decodeURIComponent(m[1]);
    try {
      return new URL(src, "https://www.axisdirect.in").href;
    } catch (e) {
      return src;
    }
  }
  function parse(element, { document: document2 }) {
    const seenIdx = /* @__PURE__ */ new Set();
    const slides = [...element.querySelectorAll(".swiper-slide")].filter((s) => {
      if (s.classList.contains("swiper-slide-duplicate")) return false;
      const idx = s.getAttribute("data-swiper-slide-index");
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
      const copies = [...slide.children].filter((c) => c.querySelector('[role="heading"], h1, h2, h3'));
      const root = copies[copies.length - 1] || slide;
      const titleSrc = root.querySelector('[role="heading"], h1, h2, h3');
      const title = titleSrc ? buildTitle(document2, titleSrc, cells.length ? 2 : 1) : null;
      const subSrc = root.querySelector('[role="none"]');
      const subheading = subSrc ? buildSubheading(document2, subSrc) : [];
      const ctas = [];
      const hrefs = /* @__PURE__ */ new Set();
      root.querySelectorAll("a[href]").forEach((a) => {
        const href = a.getAttribute("href");
        const label = cleanText(a.textContent).trim();
        if (!label || hrefs.has(href)) return;
        hrefs.add(href);
        const p = document2.createElement("p");
        const strong = document2.createElement("strong");
        const link2 = document2.createElement("a");
        link2.href = href;
        link2.textContent = label;
        strong.append(link2);
        p.append(strong);
        ctas.push(p);
      });
      const contentCell = [];
      const srcImg = root.querySelector("img");
      if (srcImg) {
        const img = document2.createElement("img");
        img.src = originalImageUrl(srcImg);
        img.alt = title ? cleanText([...title.childNodes].map((n) => n.nodeName === "BR" ? " " : n.textContent).join("")).trim() : srcImg.getAttribute("alt") || "";
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
    const block = WebImporter.Blocks.createBlock(document2, { name: "hero-carousel", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/widget.js
  var SOURCE_ORIGIN = "https://www.axisdirect.in";
  var ASSET_BASE = `${SOURCE_ORIGIN}/simplehai-assets`;
  function flightPayload(document2) {
    const sources = [];
    if (typeof window !== "undefined" && window.__IMPORT_FLIGHT_SCRIPTS__) {
      sources.push(window.__IMPORT_FLIGHT_SCRIPTS__);
    }
    document2.querySelectorAll("script").forEach((s) => sources.push(s.textContent || ""));
    let out = "";
    sources.forEach((text) => {
      const re = /self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g;
      let m;
      while (m = re.exec(text)) {
        try {
          out += JSON.parse(m[1]);
        } catch (e) {
        }
      }
    });
    return out;
  }
  function objectAt(text, start) {
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < text.length; i += 1) {
      const c = text[i];
      if (inStr) {
        if (esc) esc = false;
        else if (c === "\\") esc = true;
        else if (c === '"') inStr = false;
      } else if (c === '"') inStr = true;
      else if (c === "{") depth += 1;
      else if (c === "}") {
        depth -= 1;
        if (depth === 0) {
          try {
            return JSON.parse(text.slice(start, i + 1));
          } catch (e) {
            return null;
          }
        }
      }
    }
    return null;
  }
  function platformsData(document2) {
    const payload = flightPayload(document2);
    const key = '"platforms":[';
    const at = payload.indexOf(key);
    if (at < 0) return { platforms: [], title: null };
    const apps = [];
    let i = at + key.length;
    while (payload[i] === "{") {
      const obj = objectAt(payload, i);
      if (!obj) break;
      apps.push(obj);
      let depth = 0;
      let inStr = false;
      let esc = false;
      let j = i;
      for (; j < payload.length; j += 1) {
        const c = payload[j];
        if (inStr) {
          if (esc) esc = false;
          else if (c === "\\") esc = true;
          else if (c === '"') inStr = false;
        } else if (c === '"') inStr = true;
        else if (c === "{") depth += 1;
        else if (c === "}") {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      i = j + 1;
      if (payload[i] === ",") i += 1;
    }
    const before = payload.slice(Math.max(0, at - 1500), at);
    const labels = [...before.matchAll(/"label":("(?:[^"\\]|\\.)*")/g)];
    let title = null;
    if (labels.length) {
      try {
        title = JSON.parse(labels[labels.length - 1][1]);
      } catch (e) {
      }
    }
    return { platforms: apps, title };
  }
  function richHeading(document2, tag, html, fallback) {
    const h = document2.createElement(tag);
    const tmp = document2.createElement("div");
    tmp.innerHTML = html || "";
    const src = tmp.querySelector("p") || tmp;
    if (!src.textContent.trim()) {
      h.textContent = fallback || "";
      return h;
    }
    src.childNodes.forEach((n) => {
      if (n.nodeType === 3) h.append(document2.createTextNode(n.textContent));
      else if (n.nodeType === 1 && /color/i.test(n.getAttribute("style") || "")) {
        const strong = document2.createElement("strong");
        strong.textContent = n.textContent;
        h.append(strong);
      } else if (n.nodeType === 1) h.append(document2.createTextNode(n.textContent));
    });
    return h;
  }
  function assetUrl(path) {
    if (!path) return "";
    if (/^https?:/i.test(path)) return path;
    return `${ASSET_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  }
  function parsePlatforms(element, document2) {
    const { platforms, title } = platformsData(document2);
    if (!platforms.length) return false;
    const titleText = (element.querySelector("h2") || {}).textContent || "Platforms for Seamless Access";
    const headRow = [
      richHeading(document2, "h2", title, titleText.trim()),
      richHeading(document2, "h2", platforms[0].appHeader, "Platform Features")
    ];
    const rows = [[headRow]];
    platforms.forEach((app) => {
      const name = [app.appNamePrefix, app.appNameSuffix].filter(Boolean).join(" ").trim();
      const cell = [];
      const h3 = document2.createElement("h3");
      h3.textContent = name;
      cell.push(h3);
      const features = app.platformFeaturesArray || [];
      features.forEach((f) => {
        const h4 = document2.createElement("h4");
        h4.textContent = f.label;
        cell.push(h4);
        const url = assetUrl(f.appPreviewImage);
        if (url && (f.assetType === "VIDEO" || /\.(webm|mp4)$/i.test(url))) {
          const p = document2.createElement("p");
          const a = document2.createElement("a");
          a.href = url;
          a.textContent = url;
          p.append(a);
          cell.push(p);
        } else if (url) {
          const img = document2.createElement("img");
          img.src = url;
          img.alt = `${f.label} on Axis Direct ${name}`;
          cell.push(img);
        }
        if (f.description) {
          const p = document2.createElement("p");
          p.textContent = f.description;
          cell.push(p);
        }
      });
      const ctaSrc = features.find((f) => f.redirectUrl);
      if (ctaSrc) {
        const p = document2.createElement("p");
        const a = document2.createElement("a");
        a.href = ctaSrc.redirectUrl;
        a.textContent = ctaSrc.startInvesting || "Download App";
        p.append(a);
        cell.push(p);
      }
      rows.push([cell]);
    });
    const block = WebImporter.Blocks.createBlock(document2, { name: "widget", cells: rows });
    element.replaceWith(block);
    return true;
  }
  function parse2(element, { document: document2 }) {
    if (element.querySelector('[role="tablist"]') && /platform/i.test(element.textContent) && parsePlatforms(element, document2)) {
      return;
    }
    const heading = element.querySelector("h1, h2, h3");
    const contentNodes = Array.from(element.childNodes).filter((node) => {
      if (node.nodeType === 1) {
        const tag = node.tagName.toLowerCase();
        if (tag === "script" || tag === "style" || tag === "noscript") return false;
        return true;
      }
      if (node.nodeType === 3) return node.textContent.trim().length > 0;
      return false;
    });
    const hasText = (element.textContent || "").trim().length > 0;
    const hasMedia = !!element.querySelector("img, picture, svg, video, iframe, a[href]");
    if (!heading && contentNodes.length === 0 || !hasText && !hasMedia) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [];
    if (heading) {
      cells.push([heading]);
    }
    const contentCell = contentNodes.filter((node) => node !== heading);
    if (contentCell.length) {
      cells.push([contentCell]);
    }
    if (cells.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document2, { name: "widget", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns-stats.js
  function parse3(element, { document: document2 }) {
    const items = Array.from(element.querySelectorAll(":scope > .mui-og3pzo"));
    const statItems = items.length ? items : Array.from(element.querySelectorAll(".mui-og3pzo"));
    if (!statItems.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [];
    const row = statItems.map((item) => {
      const cellContent = [];
      item.querySelectorAll("img").forEach((img) => cellContent.push(img));
      const label = item.querySelector(".mui-f4y4in, span, h2, h3, p");
      if (label) cellContent.push(label);
      return cellContent.length ? cellContent : [item];
    });
    cells.push(row);
    const block = WebImporter.Blocks.createBlock(document2, { name: "columns-stats", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-segments.js
  function parse4(element, { document: document2 }) {
    const sectionHeading = element.querySelector(":scope > h2, :scope > h1, h2");
    let cardLinks = Array.from(element.querySelectorAll("a")).filter((a) => a.querySelector("img") || a.querySelector("h3, h2, h4"));
    if (!cardLinks.length) {
      cardLinks = Array.from(element.querySelectorAll(".mui-1owyt9z"));
    }
    if (!cardLinks.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [];
    if (sectionHeading) {
      cells.push([sectionHeading, ""]);
    }
    cardLinks.forEach((card) => {
      const img = card.querySelector("img");
      const title = card.querySelector("h1, h2, h3, h4, h5, h6");
      const href = card.tagName === "A" ? card.getAttribute("href") : null;
      const imageCell = img || "";
      let textCell;
      if (href && title) {
        const a = document2.createElement("a");
        a.setAttribute("href", href);
        a.textContent = title.textContent.trim();
        textCell = a;
      } else if (title) {
        textCell = title;
      } else if (href) {
        const a = document2.createElement("a");
        a.setAttribute("href", href);
        a.textContent = card.textContent.trim();
        textCell = a;
      } else {
        textCell = card.textContent.trim();
      }
      cells.push([imageCell, textCell]);
    });
    const block = WebImporter.Blocks.createBlock(document2, { name: "cards-segments", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-features.js
  var SOURCE_ORIGIN2 = "https://www.axisdirect.in";
  var ASSET_BASE2 = `${SOURCE_ORIGIN2}/simplehai-assets`;
  function flightPayload2(document2) {
    const sources = [];
    if (typeof window !== "undefined" && window.__IMPORT_FLIGHT_SCRIPTS__) sources.push(window.__IMPORT_FLIGHT_SCRIPTS__);
    document2.querySelectorAll("script").forEach((s) => sources.push(s.textContent || ""));
    let out = "";
    sources.forEach((text) => {
      const re = /self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g;
      let m;
      while (m = re.exec(text)) {
        try {
          out += JSON.parse(m[1]);
        } catch (e) {
        }
      }
    });
    return out;
  }
  function flightProp(payload, key, from = 0) {
    const needle = `"${key}":`;
    let at = payload.indexOf(needle, from);
    while (at >= 0) {
      const start = at + needle.length;
      const open = payload[start];
      if (open === "[" || open === "{") {
        const close = open === "[" ? "]" : "}";
        let depth = 0;
        let inStr = false;
        let esc = false;
        for (let i = start; i < payload.length; i += 1) {
          const c = payload[i];
          if (inStr) {
            if (esc) esc = false;
            else if (c === "\\") esc = true;
            else if (c === '"') inStr = false;
          } else if (c === '"') inStr = true;
          else if (c === open) depth += 1;
          else if (c === close) {
            depth -= 1;
            if (depth === 0) {
              try {
                return { value: JSON.parse(payload.slice(start, i + 1)), at };
              } catch (e) {
                break;
              }
            }
          }
        }
      }
      at = payload.indexOf(needle, at + 1);
    }
    return null;
  }
  var assetUrl2 = (p) => !p || /^https?:/i.test(p) ? p || "" : `${ASSET_BASE2}${p.startsWith("/") ? "" : "/"}${p}`;
  var pageUrl = (p) => !p || /^https?:/i.test(p) ? p || "" : `${SOURCE_ORIGIN2}${p.startsWith("/") ? "" : "/"}${p}`;
  function richHeading2(document2, tag, html, fallback) {
    const h = document2.createElement(tag);
    const tmp = document2.createElement("div");
    tmp.innerHTML = html || "";
    const src = tmp.querySelector("p") || tmp;
    if (!src.textContent.trim()) {
      h.textContent = fallback || "";
      return h;
    }
    src.childNodes.forEach((n) => {
      const style = n.nodeType === 1 && n.getAttribute("style") || "";
      const accent = /color/i.test(style) && !/hsl\(\s*0\s*,\s*0%\s*,\s*0%\s*\)|#000\b|rgb\(\s*0,\s*0,\s*0\s*\)/i.test(style);
      if (accent) {
        const strong = document2.createElement("strong");
        strong.textContent = n.textContent;
        h.append(strong);
      } else {
        h.append(document2.createTextNode(n.textContent));
      }
    });
    return h;
  }
  var str = (m) => {
    try {
      return m ? JSON.parse(m[1]) : null;
    } catch (e) {
      return null;
    }
  };
  function fromFlightData(document2) {
    const payload = flightPayload2(document2);
    const features = flightProp(payload, "features");
    if (!features || !Array.isArray(features.value) || !features.value.length || !features.value[0].heading) return null;
    const before = payload.slice(Math.max(0, features.at - 1500), features.at);
    const after = payload.slice(features.at, features.at + 2e4);
    return {
      title: str([...before.matchAll(/"label":("(?:[^"\\]|\\.)*")/g)].pop()),
      // subtitle: the string children of the last {"component":"h2", sx:{…}, …} before the features
      subtitle: str(before.slice(Math.max(0, before.lastIndexOf('"component":"h2"'))).match(/"children":("(?:[^"\\]|\\.)*")/)),
      features: features.value,
      ctaLabel: str(after.match(/"allFeatureButtonLabel":("(?:[^"\\]|\\.)*")/)),
      ctaUrl: str(after.match(/"viewAllFeatureRedirectUrl":("(?:[^"\\]|\\.)*")/))
    };
  }
  function link(document2, href, text) {
    const a = document2.createElement("a");
    a.href = href;
    a.textContent = text;
    return a;
  }
  function parse5(element, { document: document2 }) {
    const data = fromFlightData(document2);
    const cells = [];
    if (data) {
      const intro = [richHeading2(document2, "h2", data.title, "Key Features")];
      if (data.subtitle) {
        const p = document2.createElement("p");
        p.textContent = data.subtitle;
        intro.push(p);
      }
      cells.push(["", intro]);
      data.features.forEach((f) => {
        const img = document2.createElement("img");
        img.src = assetUrl2(f.imageUrl);
        img.alt = f.imageAltText || f.heading || "";
        const h3 = document2.createElement("h3");
        if (f.path) h3.append(link(document2, pageUrl(f.path), f.heading));
        else h3.textContent = f.heading;
        const text = [h3];
        if (Array.isArray(f.benefits) && f.benefits.length) {
          const ul = document2.createElement("ul");
          f.benefits.forEach((b) => {
            const li = document2.createElement("li");
            li.textContent = b;
            ul.append(li);
          });
          text.push(ul);
        }
        cells.push([img, text]);
      });
      if (data.ctaLabel && data.ctaUrl) {
        const p = document2.createElement("p");
        p.append(link(document2, pageUrl(data.ctaUrl), data.ctaLabel));
        cells.push(["", [p]]);
      }
    } else {
      const introHeadings = Array.from(element.querySelectorAll("h2")).slice(0, 2);
      const slides = Array.from(element.querySelectorAll(".swiper-slide"));
      if (!slides.length && !introHeadings.length) {
        element.replaceWith(...element.childNodes);
        return;
      }
      if (introHeadings.length) cells.push(["", introHeadings]);
      const seen = /* @__PURE__ */ new Set();
      slides.forEach((card) => {
        const title = card.querySelector("h1, h2, h3, h4, h5, h6");
        const key = title ? title.textContent.trim() : card.textContent.trim();
        if (seen.has(key)) return;
        seen.add(key);
        const img = card.querySelector("img");
        const list = card.querySelector("ol, ul");
        const textCell = [];
        if (title) textCell.push(title);
        if (list) textCell.push(list);
        if (!textCell.length) textCell.push(card.textContent.trim());
        cells.push([img || "", textCell]);
      });
      const cta = [...element.querySelectorAll("a[href]")].find((a) => /explore/i.test(a.textContent));
      if (cta) {
        const p = document2.createElement("p");
        p.append(link(document2, cta.href, cta.textContent.trim()));
        cells.push(["", [p]]);
      }
    }
    const block = WebImporter.Blocks.createBlock(document2, { name: "cards-features", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns-appdownload.js
  function parse6(element, { document: document2 }) {
    const panels = Array.from(element.querySelectorAll(":scope > .mui-yrhiuv, :scope > .mui-ozins0"));
    let appPanels = panels;
    if (!appPanels.length) {
      appPanels = Array.from(element.children).filter(
        (c) => c.tagName !== "IMG" && c.querySelector("h1, h2, h3")
      );
    }
    const leadImage = element.querySelector(":scope > img");
    if (!appPanels.length && !leadImage) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [];
    const columnCount = appPanels.length || 2;
    if (leadImage) {
      const introRow = [leadImage];
      while (introRow.length < columnCount) introRow.push("");
      cells.push(introRow);
    }
    if (appPanels.length) {
      cells.push(appPanels.map((panel) => panel));
    }
    const block = WebImporter.Blocks.createBlock(document2, { name: "columns-appdownload", cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/axisdirect-cleanup.js
  var TransformHook = {
    beforeTransform: "beforeTransform",
    afterTransform: "afterTransform"
  };
  function transform(hookName, element, payload) {
    if (hookName === TransformHook.afterTransform) {
      WebImporter.DOMUtils.remove(element, [
        "header",
        "footer",
        "#footer-content",
        "#skip-navigation-intsructions-wrapper",
        ".rfm-marquee-container",
        "nav"
      ]);
    }
  }

  // tools/importer/transformers/axisdirect-sections.js
  var SECTION_MARKER_ATTR = "data-excat-section-id";
  function sectionSelector(section) {
    const sel = section.selector;
    return Array.isArray(sel) ? sel[0] : sel;
  }
  function transform2(hookName, element, payload) {
    const sections = payload.template && payload.template.sections || [];
    if (hookName === "beforeTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        if (i === 0 && !section.style) continue;
        const sectionEl = element.querySelector(sectionSelector(section));
        if (!sectionEl) continue;
        const hr = document.createElement("hr");
        if (section.style) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
        sectionEl.before(hr);
      }
    }
    if (hookName === "afterTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        if (!section.style) continue;
        const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
        const anchor = marker || element.querySelector(sectionSelector(section));
        if (!anchor) continue;
        const metadataBlock = WebImporter.Blocks.createBlock(document, {
          name: "Section Metadata",
          cells: { style: section.style }
        });
        anchor.after(metadataBlock);
        if (marker) {
          marker.removeAttribute(SECTION_MARKER_ATTR);
          if (i === 0) marker.remove();
        }
      }
    }
  }

  // tools/importer/transformers/axisdirect-image-overrides.js
  var PNG_BASE = "https://main--axis-securities--bansaljitendra.aem.page/images";
  var OVERRIDES = {
    // hero carousel (desktop "web" illustrations)
    "sebi-web-hb": `${PNG_BASE}/hero-sebi.png`,
    "mirae-nfo-web": `${PNG_BASE}/hero-mirae-nfo.png`,
    "contra-nfo-banner-web": `${PNG_BASE}/hero-contra-nfo.png`,
    "all-in-one-roof-web-hb": `${PNG_BASE}/hero-all-in-one.png`,
    "cashback-web-hb": `${PNG_BASE}/hero-cashback.png`,
    "smallcase-web-hb": `${PNG_BASE}/hero-smallcase.png`,
    "emargin-web-hb": `${PNG_BASE}/hero-emargin.png`,
    "portfolio-analyser-web-hb": `${PNG_BASE}/hero-portfolio.png`,
    // Platforms for Seamless Access — Trader App / Trader Pro Terminal screens
    "trader-scanners": `${PNG_BASE}/home/trader-scanners.png`,
    "trader-options-strategies": `${PNG_BASE}/home/trader-options-strategies.png`,
    "trader-basket-orders": `${PNG_BASE}/home/trader-basket-orders.png`,
    "trader-real-time-chart-trading": `${PNG_BASE}/home/trader-real-time-chart-trading.png`,
    "trader-fundamental-and-technical-insights": `${PNG_BASE}/home/trader-fundamental-and-technical-insights.png`,
    "trader-option-chain-with-basket": `${PNG_BASE}/home/trader-option-chain-with-basket.png`,
    "trader-emargin": `${PNG_BASE}/home/trader-emargin.png`,
    "traderpro-scanners": `${PNG_BASE}/home/traderpro-scanners.png`,
    "traderpro-watchlist": `${PNG_BASE}/home/traderpro-watchlist.png`,
    "traderpro-smart-alert": `${PNG_BASE}/home/traderpro-smart-alert.png`,
    "traderpro-option-strategies": `${PNG_BASE}/home/traderpro-option-strategies.png`,
    "traderpro-trade-from-chart": `${PNG_BASE}/home/traderpro-trade-from-chart.png`,
    "traderpro-option-chain": `${PNG_BASE}/home/traderpro-option-chain.png`,
    // Key Features icons over the size limit
    "track-investments": `${PNG_BASE}/home/track-investments.png`,
    "margin-trading-facility": `${PNG_BASE}/home/margin-trading-facility.png`,
    "after-market-order": `${PNG_BASE}/home/after-market-order.png`
  };
  function svgStem(src) {
    if (!src) return null;
    let path = src;
    const m = src.match(/[?&]url=([^&]+)/);
    if (m) {
      try {
        path = decodeURIComponent(m[1]);
      } catch (e) {
      }
    }
    const file = path.split("?")[0].split("#")[0].split("/").pop() || "";
    if (!/\.svg$/i.test(file)) return null;
    return file.replace(/\.svg$/i, "").toLowerCase().replace(/_/g, "-").replace(/-\d{8}-\d{6}$/, "");
  }
  function transform3(hookName, element, payload) {
    if (hookName !== "afterTransform") return;
    element.querySelectorAll("img").forEach((img) => {
      const stem = svgStem(img.getAttribute("src"));
      const png = stem && OVERRIDES[stem];
      if (!png) return;
      img.setAttribute("src", png);
      img.removeAttribute("srcset");
    });
  }

  // tools/importer/transformers/axisdirect-open-account.js
  var TransformHook2 = {
    beforeTransform: "beforeTransform",
    afterTransform: "afterTransform"
  };
  var clean = (t) => (t || "").replace(/[​\s]+/g, " ").trim();
  function transform4(hookName, element, payload) {
    if (hookName !== TransformHook2.beforeTransform) return;
    const { document: document2 } = payload;
    const input = element.querySelector(
      'form input[name="mobileNumber"], form input#mobileNumber, form input[inputmode="numeric"], form input[placeholder*="Mobile" i]'
    );
    if (!input) return;
    const form = input.closest("form");
    const label = form.querySelector(`label[for="${input.id}"]`) || form.querySelector("label");
    const labelText = clean(label && label.textContent) || clean(input.getAttribute("placeholder"));
    const placeholder = clean(input.getAttribute("placeholder")) || labelText;
    const prefix = [...form.querySelectorAll("span, div, p")].map((e) => clean(e.textContent)).find((t) => /^\+\d{1,3}-?$/.test(t)) || "";
    const submit = form.querySelector('button[type="submit"]') || form.querySelector("button");
    const ctaText = clean(submit && submit.textContent);
    const checkbox = form.querySelector('input[type="checkbox"]');
    let terms = null;
    if (checkbox) {
      let row = checkbox.parentElement;
      while (row && row !== form && !/accept|agree|terms/i.test(row.textContent)) row = row.parentElement;
      const textEl = row && [...row.querySelectorAll("span")].find((s) => /accept|agree/i.test(s.textContent) && !s.contains(checkbox));
      if (textEl) {
        terms = document2.createElement("p");
        [...textEl.childNodes].forEach((n) => {
          if (n.nodeType === 1 && /^(button|a)$/i.test(n.tagName)) {
            const em = document2.createElement("em");
            em.textContent = clean(n.textContent);
            terms.append(" ", em);
          } else if (n.nodeType === 3 || n.nodeType === 1) {
            terms.append(clean(n.textContent));
          }
        });
        terms.normalize();
      }
    }
    const out = [];
    const p = (text) => {
      const el = document2.createElement("p");
      el.textContent = text;
      out.push(el);
    };
    if (labelText) p(labelText);
    p(clean(`${prefix} ${placeholder}`));
    if (ctaText) p(ctaText);
    if (terms) out.push(terms);
    form.replaceWith(...out);
  }

  // tools/importer/import-home.js
  var parsers = {
    "hero-carousel": parse,
    "widget": parse2,
    "columns-stats": parse3,
    "cards-segments": parse4,
    "cards-features": parse5,
    "columns-appdownload": parse6
  };
  var PAGE_TEMPLATE = {
    name: "home",
    description: "Axis Direct homepage: hero carousel, open-account lead capture, trust stats, segment tiles, live recommendations, platform showcase, key features, and app-download panels.",
    urls: [
      "https://www.axisdirect.in/"
    ],
    blocks: [
      {
        name: "hero-carousel",
        instances: ["#main-content .swiper:has(> .swiper-wrapper > .swiper-slide h1)"]
      },
      {
        name: "widget",
        instances: [
          "#main-content > div.mui-1b45yeg > div.MuiStack-root.mui-cdmdob > div.mui-zmt9z3 > div.swiper > div.MuiBox-root.mui-u14qbz",
          ".mui-1ump8tf",
          '#main-content div:has(> div > div[role="tablist"])'
        ]
      },
      {
        name: "columns-stats",
        instances: [".mui-158jxei"]
      },
      {
        name: "cards-segments",
        instances: [".mui-1frjd1d"]
      },
      {
        name: "cards-features",
        instances: ["#main-content div:has(> div > h2 + h2):has(.swiper)"]
      },
      {
        name: "columns-appdownload",
        instances: [".mui-o9n91k"]
      }
    ],
    sections: [
      {
        id: "rc1",
        name: "Hero",
        selector: [".mui-cdmdob"],
        style: null,
        blocks: ["hero-carousel", "widget"],
        defaultContent: []
      },
      {
        id: "rc3",
        name: "Trust, Segments, Recommendations, Platforms & Features",
        selector: [".mui-103t6ge"],
        style: null,
        blocks: ["columns-stats", "cards-segments", "widget", "cards-features"],
        defaultContent: []
      },
      {
        id: "rc4",
        name: "App Download",
        selector: [".mui-o9n91k"],
        style: null,
        blocks: ["columns-appdownload"],
        defaultContent: []
      }
    ]
  };
  var transformers = [
    transform,
    transform4,
    ...PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [transform2] : [],
    transform3
  ];
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), {
      template: PAGE_TEMPLATE
    });
    transformers.forEach((transformerFn) => {
      try {
        transformerFn.call(null, hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
    });
  }
  function findBlocksOnPage(document2, template) {
    const pageBlocks = [];
    template.blocks.forEach((blockDef) => {
      blockDef.instances.forEach((selector) => {
        const elements = document2.querySelectorAll(selector);
        if (elements.length === 0) {
          console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
        }
        elements.forEach((element) => {
          pageBlocks.push({
            name: blockDef.name,
            selector,
            element,
            section: blockDef.section || null
          });
        });
      });
    });
    console.log(`Found ${pageBlocks.length} block instances on page`);
    return pageBlocks;
  }
  var import_home_default = {
    // Runs on the live page before html2md hands the transform a script-free
    // copy of the DOM: stash the Next.js flight-data scripts so parsers can read
    // content the page only renders on interaction (e.g. inactive platform tabs).
    onLoad: ({ document: document2 }) => {
      window.__IMPORT_FLIGHT_SCRIPTS__ = [...document2.querySelectorAll("script")].map((s) => s.textContent || "").filter((t) => t.includes("self.__next_f.push")).join("\n");
    },
    transform: (payload) => {
      const { document: document2, url, html, params } = payload;
      const main = document2.body;
      executeTransformers("beforeTransform", main, payload);
      const pageBlocks = findBlocksOnPage(document2, PAGE_TEMPLATE);
      pageBlocks.forEach((block) => {
        if (!block.element.parentNode) return;
        const parser = parsers[block.name];
        if (parser) {
          try {
            parser(block.element, { document: document2, url, params });
          } catch (e) {
            console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
          }
        } else {
          console.warn(`No parser found for block: ${block.name}`);
        }
      });
      executeTransformers("afterTransform", main, payload);
      const hr = document2.createElement("hr");
      main.appendChild(hr);
      WebImporter.rules.createMetadata(main, document2);
      WebImporter.rules.transformBackgroundImages(main, document2);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html?$/, "");
      const path = WebImporter.FileUtils.sanitizePath(rawPath === "" ? "/index" : rawPath);
      return [{
        element: main,
        path,
        report: {
          title: document2.title,
          template: PAGE_TEMPLATE.name,
          blocks: pageBlocks.map((b) => b.name)
        }
      }];
    }
  };
  return __toCommonJS(import_home_exports);
})();
