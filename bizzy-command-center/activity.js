const activityWindow = document.querySelector('[data-public-activity]');

function setActivityText(selector, value) {
  const element = activityWindow?.querySelector(selector);
  if (element) element.textContent = value;
}

function friendlyState(state) {
  if (state === 'making') return 'MAKING NOW';
  if (state === 'ready') return 'READY FOR WORK';
  if (state === 'offline') return 'WINDOW QUIET';
  return 'WINDOW PREPARING';
}

function relativeFreshness(value) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'Snapshot time unavailable.';
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 2) return 'Privacy-filtered snapshot updated just now.';
  if (minutes < 60) return `Privacy-filtered snapshot updated ${minutes} minutes ago.`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `Privacy-filtered snapshot updated ${hours} hours ago.`;
  return 'The last public snapshot is stale; live fleet state is not being claimed.';
}

function showUnavailableActivity(state, message) {
  activityWindow.dataset.state = state;
  setActivityText('[data-activity-state]', state === 'archived' ? 'HISTORICAL SNAPSHOT' : state === 'stale' ? 'STALE SNAPSHOT' : 'STATUS UNAVAILABLE');
  for (const selector of ['[data-activity-fleet]', '[data-activity-pressure]', '[data-activity-coding]']) setActivityText(selector, '—');
  setActivityText('[data-activity-freshness]', message);
  const list = activityWindow.querySelector('[data-activity-engines]');
  if (list) list.replaceChildren();
}

async function loadPublicActivity() {
  if (!activityWindow) return;
  if (activityWindow.dataset.archived === 'true') {
    showUnavailableActivity('archived', 'The former dashboard is retired. Live fleet state is not reported.');
    return;
  }
  try {
    const response = await fetch('../data/bizzy-activity.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Activity feed returned ${response.status}`);
    const payload = await response.json();
    if (payload.schema_version !== 1 || !payload.fleet || !payload.capacity || !payload.work || !Array.isArray(payload.engines)) {
      throw new Error('Unsupported activity feed');
    }
    const count = (value) => Number.isInteger(value) && value >= 0;
    if (!['making', 'ready', 'offline'].includes(payload.activity) ||
        !count(payload.fleet.online) || !count(payload.fleet.total) || payload.fleet.online > payload.fleet.total ||
        !['open', 'moderate', 'high', 'critical'].includes(payload.capacity.memory_pressure) ||
        !['active', 'quiet'].includes(payload.work.coding) ||
        payload.engines.some((engine) => !engine || typeof engine.name !== 'string' ||
          !count(engine.instances) || !count(engine.running) || engine.running > engine.instances)) {
      throw new Error('Invalid activity values');
    }
    const timestamp = Date.parse(payload.generated_at);
    if (!Number.isFinite(timestamp) || timestamp > Date.now()) throw new Error('Invalid snapshot time');
    if (Date.now() - timestamp >= 48 * 60 * 60 * 1000) {
      showUnavailableActivity('stale', 'The last public snapshot is stale; live fleet state is not being claimed.');
      return;
    }

    activityWindow.dataset.state = payload.activity;
    setActivityText('[data-activity-state]', friendlyState(payload.activity));
    setActivityText('[data-activity-fleet]', `${payload.fleet.online}/${payload.fleet.total}`);
    setActivityText('[data-activity-pressure]', payload.capacity.memory_pressure);
    setActivityText('[data-activity-coding]', payload.work.coding === 'active' ? 'ACTIVE' : 'QUIET');
    setActivityText('[data-activity-freshness]', relativeFreshness(payload.generated_at));

    const list = activityWindow.querySelector('[data-activity-engines]');
    if (list) {
      list.replaceChildren();
      const engines = payload.engines.filter((engine) => engine.instances > 0);
      if (!engines.length) {
        const item = document.createElement('li');
        const name = document.createElement('span');
        name.textContent = 'No allowlisted engines reporting';
        const status = document.createElement('strong');
        status.textContent = 'QUIET';
        item.append(name, status);
        list.append(item);
      }
      for (const engine of engines) {
        const item = document.createElement('li');
        const name = document.createElement('span');
        name.textContent = engine.name;
        const status = document.createElement('strong');
        status.textContent = `${engine.running}/${engine.instances} RUNNING`;
        item.append(name, status);
        list.append(item);
      }
    }
  } catch (error) {
    showUnavailableActivity('unavailable', 'The public snapshot is unavailable. Live fleet state is not being claimed.');
    console.warn('Public activity window is unavailable.', error);
  }
}

loadPublicActivity();
