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
        const link = document2.createElement("a");
        link.href = href;
        link.textContent = label;
        strong.append(link);
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
  function parse2(element, { document: document2 }) {
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
  function parse5(element, { document: document2 }) {
    const headings = Array.from(element.querySelectorAll(":scope > .mui-44obd5 h2, :scope > div > h2"));
    const introHeadings = headings.length ? headings : Array.from(element.querySelectorAll("h2")).slice(0, 2);
    let cards = Array.from(element.querySelectorAll(".mui-19yww5h"));
    if (!cards.length) cards = Array.from(element.querySelectorAll(".swiper-slide"));
    if (!cards.length && !introHeadings.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [];
    if (introHeadings.length) {
      cells.push([introHeadings, ""]);
    }
    cards.forEach((card) => {
      const img = card.querySelector("img");
      const title = card.querySelector("h1, h2, h3, h4, h5, h6");
      const list = card.querySelector("ol, ul");
      const imageCell = img || "";
      const textCell = [];
      if (title) textCell.push(title);
      if (list) textCell.push(list);
      if (!textCell.length) textCell.push(card.textContent.trim());
      cells.push([imageCell, textCell]);
    });
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
          ".mui-on6ge4"
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
        instances: [".mui-10os289"]
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
    ...PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [transform2] : []
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
