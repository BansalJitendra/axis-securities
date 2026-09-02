const AUTOPLAY_MS = 5000;

export default function decorate(block) {
  const slides = [...block.children];
  if (!slides.length) return;

  // Build track + reorganize each slide (row) into text column + image column.
  const track = document.createElement('div');
  track.className = 'hero-carousel-track';

  slides.forEach((slide, i) => {
    slide.classList.add('hero-carousel-slide');
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', `${i + 1} of ${slides.length}`);
    if (i !== 0) slide.setAttribute('aria-hidden', 'true');

    const cell = slide.firstElementChild;
    if (cell) {
      cell.classList.add('hero-carousel-cell');
      // Pull the image (first <p> holding a <picture>) into its own column.
      const picP = [...cell.children].find((el) => el.querySelector && el.querySelector('picture'));
      // The first slide's image is the LCP element — load it eagerly with high
      // priority instead of lazily (the default from the import pipeline).
      if (i === 0) {
        const heroImg = picP && picP.querySelector('img');
        if (heroImg) {
          heroImg.setAttribute('loading', 'eager');
          heroImg.setAttribute('fetchpriority', 'high');
        }
      }
      const imageCol = document.createElement('div');
      imageCol.className = 'hero-carousel-image';
      const textCol = document.createElement('div');
      textCol.className = 'hero-carousel-text';
      [...cell.children].forEach((el) => {
        if (el === picP) imageCol.append(el);
        else textCol.append(el);
      });
      cell.textContent = '';
      cell.append(textCol, imageCol);
    }
    track.append(slide);
  });
  block.append(track);

  // No controls needed for a single slide.
  if (slides.length < 2) return;

  // Navigation arrows.
  const nav = document.createElement('div');
  nav.className = 'hero-carousel-nav';
  const prev = document.createElement('button');
  prev.className = 'hero-carousel-arrow hero-carousel-prev';
  prev.type = 'button';
  prev.setAttribute('aria-label', 'Previous slide');
  const next = document.createElement('button');
  next.className = 'hero-carousel-arrow hero-carousel-next';
  next.type = 'button';
  next.setAttribute('aria-label', 'Next slide');
  nav.append(prev, next);
  block.append(nav);

  // Dots.
  const dots = document.createElement('div');
  dots.className = 'hero-carousel-dots';
  dots.setAttribute('role', 'tablist');
  const dotButtons = slides.map((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'hero-carousel-dot';
    dot.type = 'button';
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
    dots.append(dot);
    return dot;
  });
  block.append(dots);

  let current = 0;
  let timer;

  const update = () => {
    track.style.transform = `translateX(-${current * 100}%)`;
    slides.forEach((s, i) => {
      if (i === current) s.removeAttribute('aria-hidden');
      else s.setAttribute('aria-hidden', 'true');
    });
    dotButtons.forEach((d, i) => {
      d.classList.toggle('active', i === current);
      d.setAttribute('aria-selected', i === current ? 'true' : 'false');
    });
  };

  const go = (index) => {
    current = (index + slides.length) % slides.length;
    update();
  };

  const stop = () => clearInterval(timer);
  const start = () => {
    stop();
    timer = setInterval(() => go(current + 1), AUTOPLAY_MS);
  };

  prev.addEventListener('click', () => { go(current - 1); start(); });
  next.addEventListener('click', () => { go(current + 1); start(); });
  dotButtons.forEach((d, i) => d.addEventListener('click', () => { go(i); start(); }));

  block.addEventListener('mouseenter', stop);
  block.addEventListener('mouseleave', start);

  update();
  start();
}
