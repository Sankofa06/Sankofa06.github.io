const filterButtons = [...document.querySelectorAll('[data-filter]')];
const emptyState = document.querySelector('[data-filter-empty]');
const projectGrid = document.querySelector('.project-grid');

function projectCards() {
  return [...document.querySelectorAll('[data-category]')];
}

function applyFilter(selected) {
  let visibleCount = 0;

  for (const card of projectCards()) {
    const categories = (card.dataset.category || '').split(' ').filter(Boolean);
    const visible = selected === 'all' || categories.includes(selected);
    card.hidden = !visible;
    if (visible) visibleCount += 1;
  }

  if (emptyState) emptyState.hidden = visibleCount > 0;
}

for (const button of filterButtons) {
  button.addEventListener('click', () => {
    const selected = button.dataset.filter;
    for (const candidate of filterButtons) {
      const active = candidate === button;
      candidate.classList.toggle('is-active', active);
      candidate.setAttribute('aria-pressed', String(active));
    }

    applyFilter(selected);
  });
}

function addText(parent, tag, text, className) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  parent.append(element);
  return element;
}

function safeLink(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
}

function createDiscoveredCard(repository, index) {
  const card = document.createElement('article');
  card.className = 'project-card project-card--discovered';
  card.dataset.repo = repository.repo;
  card.dataset.category = (repository.categories || ['tools']).join(' ');

  const glyph = addText(card, 'div', repository.display_name.slice(0, 2).toUpperCase(), 'project-glyph glyph-discovered');
  glyph.setAttribute('aria-hidden', 'true');

  const meta = document.createElement('div');
  meta.className = 'project-meta';
  addText(meta, 'span', `New project · ${String(index).padStart(2, '0')}`, 'project-number');
  addText(meta, 'span', repository.archived ? 'Archived' : 'Discovered', `project-state ${repository.archived ? 'archive' : 'building'}`);
  card.append(meta);

  addText(card, 'h3', repository.display_name);
  addText(card, 'p', repository.description || 'A newly discovered public repository. Project-specific positioning remains intentionally neutral until its evidence is reviewed.');

  const tags = document.createElement('ul');
  tags.className = 'tags';
  tags.setAttribute('aria-label', 'Repository topics');
  const topics = repository.topics?.length ? repository.topics : [repository.family || 'unclassified'];
  for (const topic of topics.slice(0, 4)) addText(tags, 'li', topic);
  card.append(tags);

  const actions = document.createElement('div');
  actions.className = 'project-actions';
  const pageURL = safeLink(repository.page_url);
  if (pageURL) {
    const pageLink = addText(actions, 'a', 'Visit project page ↗', 'text-link');
    pageLink.href = pageURL;
  }
  const sourceURL = safeLink(repository.source_url);
  if (sourceURL) {
    const sourceLink = addText(actions, 'a', repository.visibility === 'private' ? 'View private source ↗' : 'View source ↗', 'source-project-link');
    sourceLink.href = sourceURL;
  }
  card.append(actions);
  return card;
}

async function syncRepositoryFacts() {
  if (!projectGrid) return;

  try {
    const response = await fetch('data/repositories.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Repository feed returned ${response.status}`);
    const payload = await response.json();
    if (payload.schema_version !== 1 || !Array.isArray(payload.repositories)) {
      throw new Error('Repository feed has an unsupported shape');
    }

    const repositories = new Map(payload.repositories.map((item) => [item.repo, item]));
    for (const card of projectGrid.querySelectorAll('[data-repo]')) {
      if (!repositories.has(card.dataset.repo)) card.remove();
    }

    const existing = new Set([...projectGrid.querySelectorAll('[data-repo]')].map((card) => card.dataset.repo));
    let nextIndex = projectGrid.querySelectorAll('[data-repo]').length + 1;
    for (const repository of payload.repositories) {
      if (existing.has(repository.repo)) continue;
      projectGrid.append(createDiscoveredCard(repository, nextIndex));
      nextIndex += 1;
    }

    const count = document.querySelector('[data-repo-count]');
    if (count) count.textContent = String(payload.inventory.project_repositories_listed);
    const auditDate = document.querySelector('[data-repo-audit-date]');
    if (auditDate) auditDate.textContent = new Date(payload.generated_at).toLocaleDateString('en-CA');
    const totalCopy = document.querySelector('[data-repo-total-copy]');
    if (totalCopy) {
      const seen = payload.inventory.repositories_seen;
      const listed = payload.inventory.project_repositories_listed;
      totalCopy.textContent = `The GitHub account contains ${seen} repositories. ${listed} project and support repositories are shown above. The public portfolio repository and the private Portal automation repository are infrastructure, so neither is repeated as a project card.`;
    }

    const activeFilter = filterButtons.find((button) => button.getAttribute('aria-pressed') === 'true');
    applyFilter(activeFilter?.dataset.filter || 'all');
  } catch (error) {
    console.warn('Keeping the evidence-reviewed portfolio because the repository feed could not be applied.', error);
  }
}

for (const year of document.querySelectorAll('[data-year]')) year.textContent = new Date().getFullYear();
syncRepositoryFacts();
