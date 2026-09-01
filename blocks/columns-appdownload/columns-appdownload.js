/*
 * columns-appdownload
 * Two side-by-side app-download cards (Investor App / Trader App) overlaid on a
 * full-width illustration band. Restructures the authored cells into:
 *   header (icon + title) | description | qr-row (qr + rating pills) | scan-to-download
 */

function buildPill(badgeP, ratingP) {
  const storePic = badgeP.querySelector('picture');
  const ratingA = ratingP.querySelector('a');
  const href = ratingA ? ratingA.getAttribute('href') : '#';
  const raw = (ratingA ? ratingA.textContent : ratingP.textContent).trim();
  const m = raw.match(/^([\d.]+)\s*(.*)$/);

  const pill = document.createElement('a');
  pill.className = 'appdownload-pill';
  pill.href = href;
  if (storePic) pill.appendChild(storePic);
  const num = document.createElement('span');
  num.className = 'appdownload-rating-num';
  num.textContent = m ? m[1] : raw;
  const word = document.createElement('span');
  word.className = 'appdownload-rating-word';
  word.textContent = m ? m[2] : '';
  pill.append(num, word);
  return pill;
}

function decorateCard(card) {
  const kids = [...card.children];
  const h3 = card.querySelector('h3');
  const titleIdx = kids.indexOf(h3);

  const iconP = titleIdx > 0
    ? kids.slice(0, titleIdx).find((k) => k.querySelector('picture'))
    : kids.find((k) => k.querySelector('picture') && !k.querySelector('a'));
  const after = titleIdx >= 0 ? kids.slice(titleIdx + 1) : kids;

  const desc = after.find((k) => k.tagName === 'P'
    && !k.querySelector('picture') && !k.querySelector('a'));
  const qrP = after.find((k) => k.querySelector('picture') && !k.querySelector('a'));
  const badgeParas = after.filter((k) => k.querySelector('a'));
  // last text-only paragraph = "Scan to Download"
  const textOnly = after.filter((k) => k.tagName === 'P'
    && !k.querySelector('picture') && !k.querySelector('a'));
  const scan = textOnly[textOnly.length - 1] !== desc
    ? textOnly[textOnly.length - 1]
    : null;

  // header: icon + title
  const header = document.createElement('div');
  header.className = 'appdownload-head';
  if (iconP) {
    const pic = iconP.querySelector('picture');
    if (pic) {
      const iconWrap = document.createElement('div');
      iconWrap.className = 'appdownload-icon';
      iconWrap.appendChild(pic);
      header.appendChild(iconWrap);
    }
  }
  if (h3) header.appendChild(h3);

  // qr row: qr image + ratings column of pills
  const qrRow = document.createElement('div');
  qrRow.className = 'appdownload-qr-row';
  if (qrP) {
    const qrWrap = document.createElement('div');
    qrWrap.className = 'appdownload-qr';
    const pic = qrP.querySelector('picture');
    if (pic) qrWrap.appendChild(pic);
    qrRow.appendChild(qrWrap);
  }
  const ratingsCol = document.createElement('div');
  ratingsCol.className = 'appdownload-ratings';
  for (let i = 0; i + 1 < badgeParas.length; i += 2) {
    ratingsCol.appendChild(buildPill(badgeParas[i], badgeParas[i + 1]));
  }
  qrRow.appendChild(ratingsCol);

  // rebuild card
  card.textContent = '';
  card.appendChild(header);
  if (desc) { desc.className = 'appdownload-desc'; card.appendChild(desc); }
  card.appendChild(qrRow);
  if (scan) { scan.className = 'appdownload-scan'; card.appendChild(scan); }
}

export default function decorate(block) {
  const rows = [...block.children];

  // Row 1 = illustration band; mark its single-picture cell.
  const illoRow = rows[0];
  if (illoRow) {
    illoRow.classList.add('appdownload-illo');
    [...illoRow.children].forEach((cell) => {
      const pic = cell.querySelector('picture');
      if (pic && cell.children.length === 1) {
        cell.classList.add('columns-appdownload-img-col');
      } else if (!pic) {
        cell.classList.add('appdownload-illo-empty');
      }
    });
  }

  // Row 2 = the two app cards.
  const cardsRow = rows[1];
  if (cardsRow) {
    cardsRow.classList.add('appdownload-cards');
    [...cardsRow.children].forEach((card, i) => {
      card.classList.add('appdownload-card');
      card.classList.add(i === 0 ? 'appdownload-card-investor' : 'appdownload-card-trader');
      decorateCard(card);
    });
  }
}
