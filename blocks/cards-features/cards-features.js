import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {
  const rows = [...block.children];
  const ul = document.createElement('ul');

  rows.forEach((row, index) => {
    // First row is the section header (title + subtitle), not a card.
    if (index === 0) {
      row.classList.add('cards-features-header');
      // drop any empty trailing cells authored in the header row
      [...row.children].forEach((cell) => {
        if (!cell.textContent.trim() && !cell.querySelector('picture,img')) cell.remove();
      });
      return;
    }

    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture, img')) {
        div.className = 'cards-features-card-icon';
      } else {
        div.className = 'cards-features-card-body';
      }
    });
    ul.append(li);
    row.remove();
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '120' }]);
    img.closest('picture').replaceWith(optimizedPic);
  });

  block.append(ul);
}
