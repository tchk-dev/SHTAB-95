# Terrain experiment — continuation checkpoint

Do not merge anything into main. Synced project sources outside this checkout are read-only.

- Repository: tchk-dev/SHTAB-95, local checkout `shtab95/` in the ChatGPT project.
- Original base: `fix/varied-macrorelief-faults`, commit 85eebda (#39), stacked on #32–#38 and earlier work.
- `experiment/terrain-processes-v2`: b39f026, committed first stage (drainage, warped structural coordinates, hillslope diffusion, sediment transport, tests).
- Active branch: `experiment/terrain-climate-cartography-v2`, inherits first stage; climate, runoff forcing, biome and topographic UI edits are in progress.
- Previous Git push failed due to missing HTTPS credentials. GitHub connector created tree 0b599b5f46241806ef2973e4da5fa8391c66abae and commit dec56bdd8c26ac6d5b74608e8979e530cf47a946 for stage 1, but branch/PR creation was interrupted. Branch search on resumption returned no experiment branches.
- Publication through GitHub connector is authorized by the user; only merging into main is forbidden.
- Previous 39 project tests passed with Node 26 `--test-isolation=none`; rerun before reporting current results. Old i18n tests had missing English wind keys. Full-resolution matrix and browser testing are pending.
- Next: finish implementation, run tests and multiple seeds for all four regions, browser smoke test, publish separate draft PRs, attach them to chat, update this checkpoint with exact results and links.
