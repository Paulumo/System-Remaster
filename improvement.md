Improvements — 2025-08-08

This document lists high-impact improvements with clear, practical solutions.

- Leaflet load race causes map init failures
  - Impact: `MapManager` uses global `L` but `index.html` loads Leaflet with `async`, so modules may execute before Leaflet is available.
  - Suggested solution: Remove `async` from Leaflet, use `defer`, and ensure Leaflet loads before `main.js`. Alternatively, in `main.js`/`MapManager`, gate initialization until `window.L` is defined (polling or `onload` handler).

- Service worker scope brittle at non-root paths
  - Impact: `navigator.serviceWorker.register('/sw.js', { scope: '/' })` fails when app is served from a sub-path.
  - Suggested solution: Register with a relative path and default scope: `navigator.serviceWorker.register('./sw.js')`. Avoid forcing `/` scope.

- Tile host mismatch between HTML, config, and SW
  - Impact: `CONFIG.MAP.TILE_URL` uses `basemaps.cartocdn.com` but SW `CACHE_FIRST` points to `fastly.net` and HTML prefetches `fastly.net`. Caching/prefetch may not cover actual tiles.
  - Suggested solution: Align all to `https://{s}.basemaps.cartocdn.com/*` or switch everything to the `fastly` host consistently. Update DNS-prefetch/CACHE_FIRST accordingly.

- KML path mismatch (offline and fetch)
  - Impact: SW caches `/waypoints.kml` which doesn’t exist; project stores `./src/Waypoint List Rev4.kml`.
  - Suggested solution: Either copy/export a normalized `waypoints.kml` to web root during build, or update SW/static references to the actual KML path. Avoid spaces in filenames or URL-encode them.

- Tests import wrong modules and have API mismatches
  - Impact: `tests/unit/security.test.js` imports `validateInput` from `security.js` (not exported there) and expects `escapeHTML` to encode `'` as `&#x27;` while code returns `&#39;`. Tests also use `allowBasicHTML` while implementation uses `allowHTML`.
  - Suggested solution: Fix test imports to use `utils/validation.js` for `validateInput`, and import `sanitizeInput`/`escapeHTML` from `security.js`. Standardize option name to `allowHTML` (update tests), or update implementation to accept both. Align single-quote escape to `&#x27;` or change expectation.

- Skip link targets don’t exist
  - Impact: `UIManager.addSkipLinks()` references `#waypoint-search`, but the search input in `index.html` lacks this id.
  - Suggested solution: Add `id="waypoint-search"` to the search input, or update the skip link to match the actual element.

- Development-only validation lets errors pass
  - Impact: `UIManager.validateFlightInfo()` shows an error when no flight method is selected but still returns `true`.
  - Suggested solution: In production, return `false` to block progression, gated behind an env/config flag. Add proper per-field validation using `utils/validation.js`.

- External CDNs required for offline/PWA
  - Impact: Tailwind CDN and Leaflet CDN may be unavailable offline; SW caches opaque responses inconsistently.
  - Suggested solution: Vendor Leaflet CSS/JS locally and pin versions; consider building CSS locally (Tailwind CLI) to eliminate CDN dependency. Cache local assets in SW.

- SW static cache addAll with cross-origin URLs
  - Impact: `cache.addAll` of third-party URLs produces opaque responses and may fail on some setups.
  - Suggested solution: Prefer local copies; if keeping remote, lazy-cache via runtime strategies instead of install-time addAll.

- Manifest portability/sanity
  - Impact: `start_url`/`scope` are `/`, breaking on sub-path deployments; screenshots referenced do not exist; features include `cross-origin-isolated` which requires headers not set.
  - Suggested solution: Use relative `"./"` for `start_url`/`scope`. Remove or implement required COOP/COEP headers before keeping `cross-origin-isolated`. Either add screenshots or remove entries.

- Service worker caching list drift
  - Impact: SW lists many module files; edits require SW updates to reflect new paths; missed files won’t be cached.
  - Suggested solution: Generate a precache manifest at build time (e.g., Workbox) or reduce static list and rely on runtime caching.

- Robustness: wait for Leaflet tile layer
  - Impact: Map initialization awaits tile load with a timeout; on slow networks it may resolve early.
  - Suggested solution: Keep the timeout, but also guard `this.map` usage elsewhere and surface a non-blocking warning. Optionally add a loading overlay specific to map until first `load`.

- Consistent logging levels
  - Impact: Extensive console logs ship to production.
  - Suggested solution: Add a simple logger with levels gated by environment (dev/prod) and disable verbose logs in production.

- Security hardening
  - Impact: Many UI elements are created with inline styles; CSP not configured.
  - Suggested solution: Move inline styles to CSS classes. If deploying with CSP, avoid inline styles/scripts or add nonces.

- State/UI coupling via CSS selectors
  - Impact: `UIManager` relies on brittle selectors like `.mb-6 .flex.gap-2 button`.
  - Suggested solution: Add stable ids/data-attributes for interactive controls to make selectors resilient.

- PWA: Background sync placeholders
  - Impact: Background sync functions are placeholders; feature logs as supported but does nothing.
  - Suggested solution: Implement IndexedDB storage for pending sync or disable the log/feature until implemented to avoid misleading users.

- File naming with spaces
  - Impact: `Waypoint List Rev4.kml` contains spaces; awkward for URLs/offline caching.
  - Suggested solution: Rename to `waypoints_rev4.kml` (and update references), or URL-encode everywhere consistently.

- Map tiles caching strategy
  - Impact: Cache-first for tiles is specified via host prefix matching which may not match subdomain patterns.
  - Suggested solution: Match on `basemaps.cartocdn.com` and use stale-while-revalidate to balance freshness/perf. Consider limiting tile caching quota.

- Manifest permissions list
  - Impact: Lists `periodic-background-sync`, which is origin trial/behind flags on some browsers.
  - Suggested solution: Keep optional; add feature detection and avoid claiming unsupported capabilities in docs/UX.

- Accessibility polish
  - Impact: Some ARIA roles/labels are present, but status updates rely on console and not always on live regions.
  - Suggested solution: Ensure critical state changes (route updates, calculation readiness) announce via live regions consistently. Verify focus management on modal open/close.


