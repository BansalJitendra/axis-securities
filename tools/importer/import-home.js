/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroCarouselParser from './parsers/hero-carousel.js';
import widgetParser from './parsers/widget.js';
import columnsStatsParser from './parsers/columns-stats.js';
import cardsSegmentsParser from './parsers/cards-segments.js';
import cardsFeaturesParser from './parsers/cards-features.js';
import columnsAppdownloadParser from './parsers/columns-appdownload.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/axisdirect-cleanup.js';
import sectionsTransformer from './transformers/axisdirect-sections.js';

// PARSER REGISTRY
const parsers = {
  'hero-carousel': heroCarouselParser,
  'widget': widgetParser,
  'columns-stats': columnsStatsParser,
  'cards-segments': cardsSegmentsParser,
  'cards-features': cardsFeaturesParser,
  'columns-appdownload': columnsAppdownloadParser,
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'home',
  description: 'Axis Direct homepage: hero carousel, open-account lead capture, trust stats, segment tiles, live recommendations, platform showcase, key features, and app-download panels.',
  urls: [
    'https://www.axisdirect.in/'
  ],
  blocks: [
    {
      name: 'hero-carousel',
      instances: ['.mui-cdmdob .swiper-wrapper', '.mui-cdmdob']
    },
    {
      name: 'widget',
      instances: [
        '#main-content > div.mui-1b45yeg > div.MuiStack-root.mui-cdmdob > div.mui-zmt9z3 > div.swiper > div.MuiBox-root.mui-u14qbz',
        '.mui-1ump8tf',
        '.mui-on6ge4'
      ]
    },
    {
      name: 'columns-stats',
      instances: ['.mui-158jxei']
    },
    {
      name: 'cards-segments',
      instances: ['.mui-1frjd1d']
    },
    {
      name: 'cards-features',
      instances: ['.mui-10os289']
    },
    {
      name: 'columns-appdownload',
      instances: ['.mui-o9n91k']
    }
  ],
  sections: [
    {
      id: 'rc1',
      name: 'Hero',
      selector: ['.mui-cdmdob'],
      style: null,
      blocks: ['hero-carousel', 'widget'],
      defaultContent: []
    },
    {
      id: 'rc3',
      name: 'Trust, Segments, Recommendations, Platforms & Features',
      selector: ['.mui-103t6ge'],
      style: null,
      blocks: ['columns-stats', 'cards-segments', 'widget', 'cards-features'],
      defaultContent: []
    },
    {
      id: 'rc4',
      name: 'App Download',
      selector: ['.mui-o9n91k'],
      style: null,
      blocks: ['columns-appdownload'],
      defaultContent: []
    }
  ]
};

// TRANSFORMER REGISTRY - section transformer runs after cleanup (in afterTransform hook)
const transformers = [
  cleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [sectionsTransformer] : []),
];

/**
 * Execute all page transformers for a specific hook
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = {
    ...payload,
    template: PAGE_TEMPLATE
  };

  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];

  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
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

export default {
  transform: (payload) => {
    const { document, url, html, params } = payload;

    const main = document.body;

    // 1. beforeTransform transformers (initial cleanup)
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks on page
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse each block; skip elements already replaced by earlier parsers
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. afterTransform transformers (final cleanup + section breaks)
    executeTransformers('afterTransform', main, payload);

    // 5. WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Generate sanitized path; map homepage root to /index
    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      }
    }];
  }
};
