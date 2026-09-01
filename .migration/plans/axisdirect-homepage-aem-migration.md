I'll help migrate the Axis Direct homepage to AEM. Let me clarify the scope so the plan matches what you need.Let me check the current project state to ground the plan.# Axis Direct Homepage Migration Plan

Migrate the homepage at **https://www.axisdirect.in/** to AEM Edge Delivery Services — full migration (content structure + visual design + navigation header + footer), then upload the result to Document Authoring.

## Overview

| Item | Value |
|------|-------|
| Source URL | https://www.axisdirect.in/ (homepage) |
| Scope | Content structure + design/styling + header nav + footer |
| Site | `axis-securities` (org `BansalJitendra`) |
| Final output | Upload migrated page to Document Authoring |
| Content source | `https://content.da.live/bansaljitendra/axis-securities/` |

## Checklist

### 1. Analyze the source page
- [ ] Scrape the homepage (capture HTML, metadata, images, screenshots)
- [ ] Identify page sections and content sequences
- [ ] Survey available EDS blocks in the project (`cards`, `columns`, `hero`, `widget`, etc.) and the Block Collection
- [ ] Decide authoring approach per section (default content vs. blocks) and choose/create block variants

### 2. Build import infrastructure
- [ ] Generate the page template / block mapping for the homepage
- [ ] Create block parsers for each block variant
- [ ] Create page transformers (cleanup, section handling, images)
- [ ] Generate the bundled import script

### 3. Import the content
- [ ] Run the bulk import script to produce HTML content (never hand-author content files)
- [ ] Preview and verify the imported page renders locally

### 4. Migrate the design
- [ ] Extract design tokens / global styles from the source (colors, fonts, spacing)
- [ ] Style each block variant to match the original (scoped CSS per block)
- [ ] Visually critique and iterate against the original page

### 5. Migrate navigation (header)
- [ ] Extract header/nav structure from the source (desktop, mobile, megamenu as needed)
- [ ] Instrument and build the EDS navigation
- [ ] Validate nav structure and appearance vs. original

### 6. Migrate footer
- [ ] Extract footer structure from the source (desktop + mobile)
- [ ] Build the EDS footer
- [ ] Validate footer content and appearance vs. original

### 7. Verify & finalize
- [ ] Full-page visual comparison against the original; fix divergences
- [ ] Confirm all sections, blocks, header, and footer render correctly in preview
- [ ] Upload the migrated page to Document Authoring (`admin.da.live`)
- [ ] Report final preview/publish links

## Notes & Prerequisites

- **Optional plugins available but not yet enabled** — the request looks like a standard content/marketing homepage, so these likely aren't needed, but flagging them:
  - `excat-commerce` — only if the homepage should be treated as a product/listing (PDP/PLP) page.
  - `forms-excat` — only if we need to convert HTML forms (e.g. a login/open-account form) into Adaptive Form JSON.
  - I can enable any of these if you want them; otherwise I'll proceed without them.
- **Document Authoring upload** requires the Adobe credentials opt-in (Settings → LLM Permissions). Credentials are injected automatically — no token needed in chat. If the upload returns 401/403, I'll ask you to enable that toggle and retry.
- Content files will only be produced via the bundled import script, never hand-edited.

---

*This plan is in Plan mode. To begin the migration, switch to Execute mode. Would you also like me to enable the `forms-excat` or `excat-commerce` plugins before starting, or is the standard content/design/nav/footer migration above sufficient?*
