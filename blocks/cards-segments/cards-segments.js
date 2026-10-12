import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-segments-card-image';
      else div.className = 'cards-segments-card-body';
    });
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    img.closest('picture').replaceWith(optimizedPic);
  });
  block.textContent = '';
  block.append(ul);

  // Mobile shows the first six segment tiles with a View all / View less
  // toggle (source behaviour); CSS hides the toggle and extra tiles on desktop.
  const cards = [...ul.children].filter((li) => li.querySelector('.cards-segments-card-image'));
  if (cards.length > 6) {
    cards.slice(6).forEach((li) => li.classList.add('cards-segments-extra'));
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'cards-segments-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = 'View all';
    toggle.addEventListener('click', () => {
      const expanded = block.classList.toggle('expanded');
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.textContent = expanded ? 'View less' : 'View all';
    });
    block.append(toggle);
  }
}
