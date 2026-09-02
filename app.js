const labsGrid = document.querySelector('.labs-grid');

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
  card.className = 'project-card lab-card project-card--discovered';
  card.dataset.repo = repository.repo;
  card.dataset.category = (repository.categories || ['tools']).join(' ');

  const meta = document.createElement('div');
  meta.className = 'project-meta';
  addText(meta, 'span', `Repository · ${String(index).padStart(2, '0')}`, 'project-number');
  addText(meta, 'span', repository.archived ? 'Archived' : 'Discovered', `project-state ${repository.archived ? 'archive' : 'building'}`);
  card.append(meta);

  addText(card, 'h3', repository.display_name);
  addText(card, 'p', repository.description || 'A newly discovered public repository. Project-specific positioning remains intentionally neutral until its evidence is reviewed.');

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
  if (!labsGrid) return;

  try {
    const response = await fetch('data/repositories.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Repository feed returned ${response.status}`);
    const payload = await response.json();
    if (payload.schema_version !== 1 || !Array.isArray(payload.repositories)) {
      throw new Error('Repository feed has an unsupported shape');
    }

    const repositories = new Map(payload.repositories.map((item) => [item.repo, item]));
    for (const card of document.querySelectorAll('[data-repo]')) {
      if (!repositories.has(card.dataset.repo)) card.remove();
    }

    const existing = new Set([...document.querySelectorAll('[data-repo]')].map((card) => card.dataset.repo));
    let nextIndex = existing.size + 1;
    for (const repository of payload.repositories) {
      if (existing.has(repository.repo)) continue;
      labsGrid.append(createDiscoveredCard(repository, nextIndex));
      nextIndex += 1;
    }

    const labsCount = document.querySelector('[data-labs-count]');
    if (labsCount) labsCount.textContent = String(labsGrid.children.length);
    const auditDate = document.querySelector('[data-repo-audit-date]');
    if (auditDate) {
      const date = new Date(payload.generated_at).toLocaleDateString('en-CA');
      auditDate.textContent = date;
      auditDate.dateTime = date;
    }
  } catch (error) {
    console.warn('Keeping the evidence-reviewed portfolio because the repository feed could not be applied.', error);
  }
}

for (const year of document.querySelectorAll('[data-year]')) year.textContent = new Date().getFullYear();
syncRepositoryFacts();
