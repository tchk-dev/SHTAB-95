# SHTAB-95 — branch and feature baseline audit (2026-10-26)

## Canonical branch and recovery

`main` is the release baseline. New work must branch from `main` **only after** verifying that the expected feature modules and scripts are present.

Audit found `main` missing the game-clock and notification modules and their HTML script tags. The implementation remains on `feature/real-time-projectiles`, which also contains the weather and in-flight artillery changes. GitHub comparison showed that branch was 47 commits ahead and 7 behind `main`; the reverse comparison showed the only net file unique to `main` was `.github/workflows/pages-previews.yml`. This restoration branch starts from the newer implementation and targets `main` via PR, so the workflow file should be preserved during merge.

Closed experimental branches `feature/bvk-95-workstation` (PR #23) and `feature/doors95-window-manager` (PR #24) are **not** included in this restoration. They must be rebuilt or cherry-picked in isolated follow-up PRs after the baseline is verified.

## Runtime loading and boundaries

Entry point: `SHTAB-95/index.html`, loading scripts in dependency order.

| Subsystem | Current files | Runtime responsibilities |
|---|---|---|
| Mission and artillery | `js/artillery-map.js` | Ballistics, mission generation, crew labels, map rendering, projectile flight, weather effects |
| Simulation time | `js/game-clock.js` | Single game clock, time skipping, skip locks, listeners |
| Radio | `js/radio.js` | Radio tuning, signal and audio processing |
| Radio recording | `js/recorder.js`, `js/filesystem.js` | Recorder, decoding and persistent recordings |
| UI and localization | `js/interface.js`, `js/i18n.js`, `locales/*.js` | Menus, dialogs, language |
| DoorsNet | `js/browser.js`, `js/browser-sites.js` | In-game browser |
| Notifications | `js/notifications.js` | Toasts and archive |
| Other tools | `js/calculator.js`, `js/manual-morse.js`, `js/minigames.js`, `js/taskbar.js` | Tools, games, section navigation |

## Known architectural risks

1. The artillery/map module mixes simulation state and DOM updates. Moving its DOM elements must not reset simulation state.
2. Cross-module communication uses `window.*` globals, implicit element IDs and custom events. Document each public API before refactoring.
3. `index.html` defines script order manually. A missing script can silently remove a feature; use smoke tests for all critical modules.
4. The taskbar currently navigates to sections; it is **not** a general-purpose window manager.
5. `localStorage` and IndexedDB are both used; preserve storage keys and formats when migrating modules.
6. Existing static tests do not substitute for browser integration tests.

## Pre-PR checklist

- [ ] Compare candidate base with `main` and inspect ahead/behind counts.
- [ ] Confirm `index.html` includes `js/game-clock.js` and `js/notifications.js`.
- [ ] Verify GameClock, weather, flight timing, crew callsigns, radio, browser, localization and recordings.
- [ ] Run `node --check` on every `SHTAB-95/js/*.js`.
- [ ] Run `node --test tests/*.test.mjs`.
- [ ] Browser smoke-test map/radio interactions, time skip locks, active projectiles and tab/window visibility.
- [ ] Confirm PR file list has no unintended deletions and `.github/workflows/pages-previews.yml` remains intact.
- [ ] Merge only after checks pass, then pull the updated `main` before creating the next branch.

## Recommended refactoring order

1. Restore the complete gameplay baseline (this PR).
2. Add runtime smoke tests and an explicit feature inventory.
3. Extract ballistics and clock integration from `artillery-map.js` without changing behavior.
4. Introduce a common app/window lifecycle with persistent simulation services.
5. Port map, radio and BVK-95 into separate windows one at a time.

Do not combine a restoration PR with an OS redesign or ballistic tuning.
