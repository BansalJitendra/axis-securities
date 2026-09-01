/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // metadata-independent dual-fetch: /content first (localhost), then root (DA/EDS prod)
  let resp = await fetch('/content/footer.plain.html');
  if (!resp.ok) resp = await fetch('/footer.plain.html');
  if (!resp.ok) return;

  const html = await resp.text();
  const tmp = document.createElement('div');
  tmp.innerHTML = html;

  block.textContent = '';
  const footer = document.createElement('div');

  const sections = [...tmp.children];
  const classNames = [
    'footer-brand', // 0: brand logo
    'footer-links', // 1: primary link columns
    'footer-contact', // 2: contact + app download
    'footer-stocks-index', // 3: A-Z stocks index
    'footer-legal', // 4: legal / regulatory disclosures
    'footer-bottom', // 5: policy links + copyright
  ];

  sections.forEach((section, i) => {
    if (classNames[i]) section.classList.add(classNames[i]);
    footer.append(section);
  });

  block.append(footer);
}
