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
  card.dataset.category = (Array.isArray(repository.categories) ? repository.categories : ['tools']).join(' ');

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

    // Feed discovery supplements the reviewed portfolio; absence is not retirement.
    const validRepositories = payload.repositories.filter((item) => item &&
      typeof item.repo === 'string' && /^[a-z0-9_.-]+$/i.test(item.repo) &&
      typeof item.display_name === 'string' && item.visibility === 'public' &&
      !['portal', 'sankofa06.github.io'].includes(item.repo.toLowerCase()));
    const existing = new Set([...document.querySelectorAll('[data-repo]')]
      .map((card) => card.dataset.repo.toLowerCase()));
    // Older curated cards may identify their repository only through a source link.
    for (const link of document.querySelectorAll('.project-card a[href]')) {
      try {
        const url = new URL(link.href);
        const parts = url.pathname.split('/').filter(Boolean);
        if (url.hostname === 'github.com' && parts[0]?.toLowerCase() === 'sankofa06' && parts[1]) {
          existing.add(parts[1].toLowerCase());
        }
      } catch { /* A relative or invalid link does not identify a repository. */ }
    }
    let nextIndex = existing.size + 1;
    for (const repository of validRepositories) {
      const key = repository.repo.toLowerCase();
      if (existing.has(key)) continue;
      labsGrid.append(createDiscoveredCard(repository, nextIndex));
      existing.add(key);
      nextIndex += 1;
    }

    const labsCount = document.querySelector('[data-labs-count]');
    if (labsCount) labsCount.textContent = String(labsGrid.children.length);
    const auditDate = document.querySelector('[data-repo-audit-date]');
    if (auditDate) {
      const timestamp = Date.parse(payload.generated_at);
      const valid = Number.isFinite(timestamp) && timestamp <= Date.now();
      const date = valid ? new Date(timestamp).toISOString().slice(0, 10) : null;
      const stale = valid && Date.now() - timestamp > 7 * 24 * 60 * 60 * 1000;
      auditDate.textContent = date ? `${date}${stale ? ' (stale snapshot)' : ''}` : 'Date unavailable';
      if (date) auditDate.dateTime = date;
      else auditDate.removeAttribute('datetime');
    }
  } catch (error) {
    console.warn('Keeping the evidence-reviewed portfolio because the repository feed could not be applied.', error);
  }
}

for (const year of document.querySelectorAll('[data-year]')) year.textContent = new Date().getFullYear();
syncRepositoryFacts();
