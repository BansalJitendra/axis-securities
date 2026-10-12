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
  // Authored either as "4.6 ratings" or descriptively, e.g.
  // "Axis Direct Investor App on Google Play — rated 4.6 stars".
  const short = raw.match(/^([\d.]+)\s*(.*)$/);
  const rated = short ? null : raw.match(/(\d+(?:\.\d+)?)/);

  const pill = document.createElement('a');
  pill.className = 'appdownload-pill';
  pill.href = href;
  if (rated) pill.setAttribute('aria-label', raw);
  if (storePic) pill.appendChild(storePic);
  const num = document.createElement('span');
  num.className = 'appdownload-rating-num';
  num.textContent = (short && short[1]) || (rated && rated[1]) || raw;
  const word = document.createElement('span');
  word.className = 'appdownload-rating-word';
  word.textContent = (short && short[2]) || (rated ? 'ratings' : '');
  pill.append(num, word);
  return pill;
}

/**
 * Mobile: the cards row is a horizontal scroll-snap carousel (one centred card,
 * the next peeking in) with dots, an active-card highlight and autoplay, like
 * the source. Desktop CSS lays the cards out statically and hides the dots.
 */
function initCarousel(block, row) {
  const cards = [...row.children];
  if (cards.length < 2) return;
  const dots = document.createElement('div');
  dots.className = 'appdownload-dots';
  const buttons = cards.map((card, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'appdownload-dot';
    dot.setAttribute('aria-label', `Show app ${i + 1} of ${cards.length}`);
    dots.append(dot);
    return dot;
  });
  block.append(dots);

  let active = -1;
  const setActive = (idx) => {
    if (idx === active) return;
    active = idx;
    cards.forEach((c, i) => c.classList.toggle('active', i === idx));
    buttons.forEach((b, i) => b.classList.toggle('active', i === idx));
  };
  const goTo = (idx) => {
    const card = cards[idx];
    row.scrollTo({ left: card.offsetLeft - (row.clientWidth - card.offsetWidth) / 2, behavior: 'smooth' });
  };
  const nearest = () => {
    const mid = row.scrollLeft + row.clientWidth / 2;
    let best = 0;
    cards.forEach((c, i) => {
      const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
      if (d < Math.abs(cards[best].offsetLeft + cards[best].offsetWidth / 2 - mid)) best = i;
    });
    return best;
  };
  row.addEventListener('scroll', () => setActive(nearest()), { passive: true });
  buttons.forEach((b, i) => b.addEventListener('click', () => goTo(i)));
  setActive(0);

  const mobile = window.matchMedia('(width < 900px)');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  let timer;
  const stop = () => { clearInterval(timer); timer = null; };
  ['pointerdown', 'touchstart', 'wheel', 'keydown'].forEach((ev) => row.addEventListener(ev, stop, { once: true, passive: true }));
  if (!still.matches) {
    timer = setInterval(() => {
      if (mobile.matches && !document.hidden) goTo((active + 1) % cards.length);
    }, 5000);
  }
}

function decorateCard(card) {
  const kids = [...card.children];
  const h3 = card.querySelector('h3');
  const titleIdx = kids.indexOf(h3);

  const iconP = titleIdx > 0
    ? kids.slice(0, titleIdx).find((k) => k.querySelector('picture'))
    : kids.find((k) => k.querySelector('picture') && !k.querySelector('a'));
  const after = titleIdx >= 0 ? kids.slice(titleIdx + 1) : kids;

  // optional "get the app" link right after the title (mobile chevron)
  const next = h3 && h3.nextElementSibling;
  const goP = next && next.tagName === 'P' && next.querySelector('a')
    && !next.querySelector('picture') && !/\d/.test(next.textContent) ? next : null;

  const desc = after.find((k) => k.tagName === 'P'
    && !k.querySelector('picture') && !k.querySelector('a'));
  const qrP = after.find((k) => k.querySelector('picture') && !k.querySelector('a'));
  const badgeParas = after.filter((k) => k.querySelector('a') && k !== goP);
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
  if (goP) {
    const link = goP.querySelector('a');
    const go = document.createElement('a');
    go.className = 'appdownload-go';
    go.href = link.href;
    go.setAttribute('aria-label', link.textContent.trim());
    header.appendChild(go);
  }

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
    [...illoRow.children].forEach((cell, i) => {
      const pic = cell.querySelector('picture');
      if (pic && cell.children.length === 1) {
        // second picture = portrait illustration shown on mobile
        cell.classList.add(i === 0 ? 'columns-appdownload-img-col' : 'columns-appdownload-img-mobile');
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
    initCarousel(block, cardsRow);
  }
}
