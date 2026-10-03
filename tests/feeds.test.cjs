const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Element {
  constructor() { this.dataset = {}; this.children = []; this.textContent = ''; }
  append(...items) { this.children.push(...items); }
  replaceChildren(...items) { this.children = items; }
  removeAttribute(key) { delete this[key]; }
  remove() { this.removed = true; }
}
const fresh = () => new Date(Date.now() - 60000).toISOString();
const repo = (name, extra = {}) => ({ repo: name, display_name: name, visibility: 'public', ...extra });
async function portfolio(payload, options = {}) {
  const grid = new Element(), date = new Element(), count = new Element();
  const cards = ['ForzAdvisor', 'the-perfect-agent'].map(name => Object.assign(new Element(), { dataset: { repo: name } }));
  const document = {
    createElement: () => new Element(),
    querySelector: s => ({ '.labs-grid': grid, '[data-repo-audit-date]': date, '[data-labs-count]': count })[s],
    querySelectorAll: s => s === '[data-repo]' ? [...cards, ...grid.children] : s === '.project-card a[href]' ? [{ href: 'https://github.com/Sankofa06/legacy-card' }] : [],
  };
  const context = vm.createContext({ document, URL, Date, console: { warn() {} }, fetch: async () => {
    if (options.reject) throw new Error('offline');
    return { ok: !options.status, status: options.status, json: async () => payload };
  } });
  vm.runInContext(fs.readFileSync('app.js', 'utf8'), context);
  await new Promise(resolve => setImmediate(resolve));
  return { grid, date, count, cards, context };
}

test('incomplete feed never removes curated cards', async () => {
  const result = await portfolio({ schema_version: 1, generated_at: fresh(), repositories: [] });
  assert.ok(result.cards.every(card => !card.removed));
});
test('discovery deduplicates curated IDs, legacy source links, feed duplicates and repeated sync', async () => {
  const result = await portfolio({ schema_version: 1, generated_at: fresh(), repositories: [repo('The-Perfect-Agent'), repo('legacy-card'), repo('new'), repo('NEW')] });
  await vm.runInContext('syncRepositoryFacts()', result.context);
  assert.equal(result.grid.children.length, 1);
  assert.equal(result.grid.children[0].dataset.repo, 'new');
});
test('discovery excludes private and infrastructure repositories and invalid entries', async () => {
  const result = await portfolio({ schema_version: 1, generated_at: fresh(), repositories: [null, {}, repo('private', { visibility: 'private', description: 'secret' }), repo('Portal'), repo('Sankofa06.github.io'), repo('valid', { categories: 'invalid' })] });
  assert.equal(result.grid.children.length, 1);
  assert.equal(result.grid.children[0].dataset.repo, 'valid');
});
test('missing, failed and malformed feeds preserve curated cards', async () => {
  for (const [payload, options] of [[{}, {}], [null, {}], [{}, { reject: true }], [{}, { status: 404 }]]) {
    const result = await portfolio(payload, options);
    assert.ok(result.cards.every(card => !card.removed));
    assert.equal(result.grid.children.length, 0);
  }
});
test('stale and invalid feed dates are labeled honestly', async () => {
  for (const [generated_at, expected] of [['2020-01-01T00:00:00Z', '2020-01-01 (stale snapshot)'], ['bad', 'Date unavailable'], ['2999-01-01T00:00:00Z', 'Date unavailable']]) {
    const result = await portfolio({ schema_version: 1, generated_at, repositories: [] });
    assert.equal(result.date.textContent, expected);
  }
});

const snapshot = () => ({ schema_version: 1, generated_at: fresh(), activity: 'making', fleet: { online: 2, total: 3 }, capacity: { memory_pressure: 'open' }, work: { coding: 'active' }, engines: [{ name: 'Engine', instances: 1, running: 1 }] });
async function activity(payload, options = {}) {
  const elements = Object.fromEntries(['state', 'fleet', 'pressure', 'coding', 'freshness', 'engines'].map(key => [`[data-activity-${key}]`, new Element()]));
  const root = new Element();
  if (options.archived) root.dataset.archived = 'true';
  root.querySelector = s => elements[s];
  let requests = 0;
  const context = vm.createContext({ Date, console: { warn() {} }, document: { querySelector: () => root, createElement: () => new Element() }, fetch: async () => {
    requests++;
    if (options.reject) throw new Error('offline');
    return { ok: !options.status, status: options.status, json: async () => payload };
  } });
  vm.runInContext(fs.readFileSync('bizzy-command-center/activity.js', 'utf8'), context);
  await new Promise(resolve => setImmediate(resolve));
  return { root, elements, requests };
}
test('archived dashboard never fetches or claims live activity', async () => {
  const r = await activity(snapshot(), { archived: true });
  assert.equal(r.requests, 0);
  assert.equal(r.elements['[data-activity-state]'].textContent, 'HISTORICAL SNAPSHOT');
  assert.equal(r.elements['[data-activity-fleet]'].textContent, '—');
});
test('stale activity hides online, coding and engine claims', async () => {
  const r = await activity({ ...snapshot(), generated_at: '2020-01-01T00:00:00Z' });
  assert.equal(r.root.dataset.state, 'stale');
  for (const key of ['fleet', 'pressure', 'coding']) assert.equal(r.elements[`[data-activity-${key}]`].textContent, '—');
  assert.equal(r.elements['[data-activity-engines]'].children.length, 0);
});
test('missing, malformed, invalid-date and HTTP-error activity is unavailable', async () => {
  for (const [payload, options] of [[{}, {}], [null, {}], [{ ...snapshot(), fleet: {}, capacity: {}, work: {}, engines: [] }, {}], [{ ...snapshot(), generated_at: 'bad' }, {}], [{ ...snapshot(), generated_at: '2999-01-01' }, {}], [snapshot(), { reject: true }], [snapshot(), { status: 404 }]]) {
    const r = await activity(payload, options);
    assert.equal(r.root.dataset.state, 'unavailable');
    assert.equal(r.elements['[data-activity-fleet]'].textContent, '—');
  }
});
test('fresh valid activity retains intended rendering outside archived pages', async () => {
  const r = await activity(snapshot());
  assert.equal(r.root.dataset.state, 'making');
  assert.equal(r.elements['[data-activity-state]'].textContent, 'MAKING NOW');
  assert.equal(r.elements['[data-activity-fleet]'].textContent, '2/3');
});
