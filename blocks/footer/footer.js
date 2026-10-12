/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // metadata-independent: pages previewed locally from the import folder live
  // under /content/, everywhere else the fragment is at the root — request
  // only the one that exists (no 404 round-trip).
  const base = window.location.pathname.startsWith('/content/') ? '/content' : '';
  const resp = await fetch(`${base}/footer.plain.html`);
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

  // Group each heading + its following list into a single column unit so the
  // links stay under their heading in the grid (otherwise headings and lists
  // fill separate grid cells and drift apart).
  const linksSection = footer.querySelector('.footer-links');
  if (linksSection) {
    const cols = [];
    let current = null;
    [...linksSection.children].forEach((el) => {
      if (el.tagName === 'H3') {
        current = document.createElement('div');
        current.className = 'footer-col';
        cols.push(current);
      }
      if (current) current.append(el);
    });
    cols.forEach((col) => linksSection.append(col));

    // Mobile: each column is an accordion (heading button + collapsible list),
    // as on the source; desktop CSS shows every list and a plain heading.
    cols.forEach((col, i) => {
      const h3 = col.querySelector('h3');
      const list = col.querySelector('ul');
      if (!h3 || !list) return;
      list.id = `footer-col-${i}`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'footer-col-toggle';
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-controls', list.id);
      btn.append(...h3.childNodes);
      h3.append(btn);
      btn.addEventListener('click', () => {
        const open = col.classList.toggle('open');
        btn.setAttribute('aria-expanded', String(open));
      });
    });
  }

  const contact = footer.querySelector('.footer-contact');
  if (contact) {
    // "Call: …" / "Email: …" — small label before the value
    contact.querySelectorAll(':scope > p').forEach((p) => {
      const first = p.firstChild;
      const m = first && first.nodeType === Node.TEXT_NODE && first.textContent.match(/^\s*(Call|Email)\s*:\s*/i);
      if (!m) return;
      const label = document.createElement('span');
      label.className = 'footer-label';
      label.textContent = `${m[1]} :`;
      first.textContent = first.textContent.slice(m[0].length);
      p.classList.add('footer-contact-line');
      p.prepend(label);
    });

    // "Download the App for you today" heading + app links → one card
    const appHeading = [...contact.querySelectorAll(':scope > h3')].find((h) => /download/i.test(h.textContent));
    if (appHeading) {
      const card = document.createElement('div');
      card.className = 'footer-app-card';
      const apps = document.createElement('div');
      apps.className = 'footer-app-links';
      // app links follow the heading, bare or wrapped in a paragraph
      let el = appHeading.nextSibling;
      while (el) {
        const next = el.nextSibling;
        if (el.nodeType === Node.ELEMENT_NODE && el.tagName === 'A') apps.append(el);
        else if (el.nodeType === Node.ELEMENT_NODE && el.tagName === 'P' && el.querySelector('a picture')) {
          apps.append(...el.querySelectorAll('a'));
          el.remove();
        } else if (el.nodeType === Node.TEXT_NODE && !el.textContent.trim()) el.remove();
        el = next;
      }
      appHeading.replaceWith(card);
      card.append(appHeading, apps);
    }
  }

  // Bottom policy links "A | B | C" → a list (bulleted on mobile)
  const bottom = footer.querySelector('.footer-bottom');
  const policy = bottom && [...bottom.querySelectorAll(':scope > p')].find((p) => p.querySelectorAll('a').length > 1);
  if (policy) {
    const ul = document.createElement('ul');
    ul.className = 'footer-policy';
    policy.querySelectorAll('a').forEach((a) => {
      const li = document.createElement('li');
      li.append(a);
      ul.append(li);
    });
    policy.replaceWith(ul);
  }

  block.append(footer);
}
