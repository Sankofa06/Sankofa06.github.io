# Sankofa06 portfolio

Static portfolio site for `https://sankofa06.github.io/`.

The site intentionally describes the work without requiring each source repository to be public. It has no build step, external dependencies, analytics, cookies, or runtime configuration.

The homepage is editorially curated: released and approaching-release products lead, active builds follow, and supporting or historical repositories remain available in a collapsed Labs & Archive section. Repository-feed discovery adds new public projects to that collapsed section so it cannot silently reorder the priority lineup.

Repository-local case studies live under `projects/`. The Perfect Agent case study links to its public MIT-licensed source repository.

## Local preview

Open `index.html` directly or serve the directory with any static HTTP server.

## Publishing

Publish this repository as `Sankofa06/Sankofa06.github.io` with GitHub Pages serving the `main` branch root.

## Feed regression checks

Run `node --test tests/feeds.test.cjs` (Node.js 18 or newer). The dependency-free
DOM mocks cover incomplete, stale, invalid and failed feeds, repeat discovery,
curated-card preservation, and private/infrastructure repository exclusion.

Repository discovery supplements curated cards; feed omissions do not retire
reviewed projects. Snapshot dates older than seven days are labeled stale.
Bizzy Command Center is a historical case study, with live activity disabled.
Any reuse of its activity renderer rejects snapshots older than 48 hours.
