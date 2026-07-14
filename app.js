const filterButtons = [...document.querySelectorAll('[data-filter]')];
const projectCards = [...document.querySelectorAll('[data-category]')];
const emptyState = document.querySelector('[data-filter-empty]');

for (const button of filterButtons) {
  button.addEventListener('click', () => {
    const selected = button.dataset.filter;
    let visibleCount = 0;

    for (const candidate of filterButtons) {
      const active = candidate === button;
      candidate.classList.toggle('is-active', active);
      candidate.setAttribute('aria-pressed', String(active));
    }

    for (const card of projectCards) {
      const categories = card.dataset.category.split(' ');
      const visible = selected === 'all' || categories.includes(selected);
      card.hidden = !visible;
      if (visible) visibleCount += 1;
    }

    emptyState.hidden = visibleCount > 0;
  });
}

document.querySelector('[data-year]').textContent = new Date().getFullYear();
