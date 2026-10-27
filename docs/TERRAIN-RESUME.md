# SHTAB-95 terrain experiment — exact continuation checkpoint

Updated 2026-10-27 (America/Winnipeg). Do not merge to main without explicit user authorization. Synced `sources/` in the parent ChatGPT project are read-only.

## Preserved work

- Checkout: `shtab95/` under the SHTAB-95 ChatGPT project.
- Original base: `fix/varied-macrorelief-faults`, 85eebda369ef5be4b74937369667622bcb0e03ed, draft #39; depends on #38 … #32 and earlier ancestors.
- Stage 1: `experiment/terrain-processes-v2`, remote commit dec56bdd8c26ac6d5b74608e8979e530cf47a946, draft https://github.com/tchk-dev/SHTAB-95/pull/40 (base #39).
- Stage 2: `experiment/terrain-climate-cartography-v2`, draft https://github.com/tchk-dev/SHTAB-95/pull/41 (base #40). Code-and-tests commit 98c2b0805f3db01eb683f376d06a4301cbf03aa6; a following documentation commit updates this checkpoint and links. Use the branch tip for the complete result.
- Local original commits b39f026, 4ae3b46 and 53a6220 are preserved in local backup branches if the checkout has been aligned to the connector-created remote history. The API commits have identical source trees but different authors/commit IDs. Planned backup names: `local-backup/terrain-processes-v2` and `local-backup/terrain-climate-cartography-v2`; inspect `git branch -vv` before any further branch operations.
- No reset or deletion of local work is needed. If interrupted during alignment, run `git status --short --branch`, `git branch -vv`, and compare tree IDs before switching. Do not force-push.

## Completed validation

- 44 project tests + 7 i18n tests pass on Node v26.12.1. Both detailed (`--test-isolation=none`) and default test commands ran successfully.
- Syntax checks: all 28 runtime/localization JS files. `git diff --check` clean.
- 24 full-resolution generations: four regions × seeds 0, 42, 4294967295 × two exact repeats. Finite fields, all-array repeat hashes, neighbouring acyclic edge drainage, water/sediment budgets, <=6 m deposition, buffer detachment, regional relief ordering, and generated-terrain ballistic intersections pass.
- Final terrain-source SHA-256: 50710acb20cd397b086a2801af8ff40e79e0897d2de2035cea696640c8f97054. Full data: `docs/terrain-validation/seed-matrix.json`.
- Browser: actual Worker loading/generation in all four regions at seed 42, three crews, menu interaction while generating, eight layers, zoom/marker controls; Popovac seed 0 with No Wind. Snapshots and browser JSON: `../terrain-review/`. Native invalid-seed alert interrupted automation; the input rejection/state preservation is covered by unit tests, not a completed browser alert check.
- No full radio-to-fire UI playthrough, mobile test, cross-browser run or geological calibration was performed.
- `docs/TERRAIN-REPORT.md` contains the full Russian report, commands, limitations and checking instructions.

## Publication and remaining state

- GitHub write actions are explicitly authorized except merging to main. Initial HTTPS Git push lacked credentials; the connected GitHub API successfully published both draft PRs. No additional permission is currently required for publication.
- Both PRs must remain drafts. The new JavaScript workflow runs on stacked PRs and includes the full seed matrix. Inspect Checks for the latest PR #41 revision; do not claim CI success until it is observed.
- Main has not been merged or changed by this work.
- Core implementation and requested local validation are complete. Remaining scientific/visual limits are documented, especially D8 angular bias and excessive potential lake basins (up to 17.4% in Mckhetovac/4294967295), simplified W/E annual climate, and no groundwater/karst/meanders or calibrated geological timescale. These are follow-up improvements, not passing claims.
- If resuming after an interruption, first verify PR #41 branch head/checks and the clean local state; finish any pending publication/check/report step without regenerating the already validated matrix unless terrain code changes.

## Reproduce

```sh
node --test tests/*.test.mjs
node --test SHTAB-95/tests/i18n.test.js
node tests/terrain-worker-matrix.mjs docs/terrain-validation/seed-matrix.json
python3 tests/serve-local.py
```

Open http://127.0.0.1:8766/. Choose region and terrain seed, click New Mission, inspect layers. Seed reproduces terrain/climate fields; mission origin, crews, callsigns and tactical weather remain separately random.
