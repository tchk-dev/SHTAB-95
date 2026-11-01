# Water correction — continuation checkpoint

Active branch: `fix/connected-water-mask`, stacked on draft PR #41 at 2adc7e72b4e90f033a7932113f00ecce680361bd. Never merge to main without explicit permission.

The initial mask-only fix was insufficient. The user's Donja Bukovica seed 501738173 exposed two causes: shallow-water threshold seams and artificial emergent sediment-routing dams. The sediment algorithm added channel deposition room to lake filling room, allowing deposits to overtop the spill surface. It now limits ponded deposition to that surface and transports the remainder downstream. Bedrock erosion and ballistics formulas are unchanged; final deposited heights/drainage can legitimately change.

The new Uint8 waterMask grows shallow shelves from substantive lake seeds. Two staged symmetric passes generalize narrow low silt bars between water at the same level. Display tolerance is 40 cm; higher dams/islands, broad islands and different lake levels remain separate. Raw analysis depth is not rewritten by the mask. Rendering and normal crew/target placement share the footprint.

Local tests: 52 project tests + 7 localization tests passed. The reported lake, grid bounds x=294..363/y=194..250, had 150 enclosed dry pixels in PR #41 and 0 after the correction. A before/after rendering from generated data is saved in ../terrain-review/water-mask-before-after.png. The final 26-generation matrix passed; do not use the preliminary mask-only matrix as final evidence. Results: docs/terrain-validation/water-mask-fixed-seeds.json. Detailed report: docs/WATER-MASK-REPORT.md.

Continue/check this command:

`node tests/terrain-worker-matrix.mjs docs/terrain-validation/water-mask-fixed-seeds.json docs/terrain-validation/seed-matrix.json`

It checks 13 combinations (four regions × three standard seeds plus the user's seed), twice each = 26 generations. The optional baseline asserts unchanged upstream eroded volume, not unchanged final sediment fields. The extra regression asserts zero enclosed dry holes in the reported basin. Final source hash must match current terrain modules before claiming completion.

Browser: the server had stopped after an interruption; restarted with `python3 tests/serve-local.py`, serving 127.0.0.1:8766. The game loaded. In a separate test tab, all four regions/seed 42 plus Donja/501738173 completed with three crews. The user's active tab is left usable. Browser JSON/screenshots are in ../terrain-review/.

Continuation: first inspect whether a draft PR already exists for fix/connected-water-mask. Publish one against experiment/terrain-climate-cartography-v2 only if missing, using the connected GitHub API; ensure it is attached to this chat and report its checks. Implementation and local validation are complete. No main merge. Git push lacks HTTPS credentials; connector publication is explicitly authorized and worked for #40/#41. Preserve original local commits if aligning API-created history.

Final terrain source hash: b08e93478af27942e7cc0de7a81d59bb309550fe7847dcc039bf72dfa7f6c7ed
