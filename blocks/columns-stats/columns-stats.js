export default function decorate(block) {
  // Rows -> flatten to individual stat cells. EDS wraps each cell's images +
  // label text into a single <p>; restructure into a value graphic block plus
  // a caption row (icon + label) to match the source layout.
  const cells = [...block.children].flatMap((row) => [...row.children]);
  block.classList.add(`columns-stats-${cells.length}-cols`);

  cells.forEach((cell) => {
    const pics = [...cell.querySelectorAll('picture')];
    const label = (cell.textContent || '').trim();
    const valuePic = pics[0];
    const iconPic = pics[1];

    cell.textContent = '';
    cell.classList.add('columns-stats-item');

    if (valuePic) {
      const value = document.createElement('div');
      value.className = 'columns-stats-value';
      value.append(valuePic);
      cell.append(value);
    }

    const caption = document.createElement('div');
    caption.className = 'columns-stats-caption';
    if (iconPic) caption.append(iconPic);
    if (label) {
      const span = document.createElement('span');
      span.className = 'columns-stats-label';
      span.textContent = label;
      caption.append(span);
    }
    cell.append(caption);
  });
}
