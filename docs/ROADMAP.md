# AE Tools · delivery map

Windows 11, After Effects. The first milestone is a usable vertical slice. Every tool listed in the live catalog must have an implementation. Research date: 2026-11-21. A stage advances on its exit criteria; order reflects dependencies, not promised dates.

| Priority / stage | Depends on | Deliverable and exit test |
|---|---|---|
| P0 — panel foundation | Host and distribution research | Dockable CEP panel, command registry, selection-first plans, guarded dispatch and local diagnostics. From a clean Windows profile install, open under Window, search, pin, adjust density, restart and retain settings. Distinguish browser/mock evidence from this host gate. |
| P0 — daily actions and first rig | Foundation | Anchor grid, parent controller, trim bounds, footage wrapper, organize project and marker text reveal. One Undo per successful mutation. Unsupported batches stop before their first write. Run the host matrix before broad production use. |
| P1 — timeline depth | Host proof on current AE | Freeze Last Frame, key trimming modes, alignment to selection/comp, edge/center distribution, sequencing with overlap, stagger and reverse keyframes. At 23.976/25/29.97/60 compare first and final visible frames and original tangents; verify mixed FPS, holds and trimmed footage. |
| P1 — organization | Foundation and stable item identity | Custom nested folder templates, previewable batch rename/numbering, project search by type/missing media, sort rules and conflict previews. Applying a folder template twice is a no-op. Rename preview enumerates every old/new name; references and shared sources get an explicit warning. |
| P1 — text preset library | Marker fixture and host proof | Intake a supplied FFX/AEP/expression in a disposable project, produce a dependency report and typed adapter. Ship a dedicated tile, icon, parameters and reference frames. Verify mixed-style copy, changed text length, endpoints, trimming, remaining expressions and save/reopen. |
| P2 — compositions | Timeline fixtures and graph inspection | Unprecomp for a defined reversible subset, dependency-aware duplicate tree, dry-run cleanup. Compare before/after on matching frames, preserve stack, matte/parent links, markers and undo. Refuse unsupported combinations before deleting anything. |
| P2 — effects, rigs and sets | Intake + graph/ownership checks | Saved effect stacks, curated animation recipes, controller rigs and whole layer sets. Preserve references between instances; two applications have independent controls. Track external assets/licenses and version migrations. |
| P2 — layouts and macros | Stable command schemas | Named workspaces, keyboard modifiers, portable appearance/layout export, declarative ordered steps. One shared preflight/undo boundary for compatible recipes. Uncertain partial effects are inspected before retry. |
| P3 — UXP adapter | Stable AE UXP + real feature parity | Port the adapter behind the same catalog. Measure cold start, AE DOM coverage, file tokens, docking, performance and Windows updates; compare outputs against CEP fixtures. Keep CEP distribution available during migration. |

## Design

Panel first. Search and layout controls share a compact rail. The catalog groups commands by workflow; choose Favorites for a short working set. Anchor placement uses a real 3×3 target. Text has editable frame counts, a named endpoint and an optional exit. All regular actions execute an explicit button press. Editing the layout or appearance never executes a command. Use scoped settings for theme, accent, density, grid size, labels, icon size, typography, corner radius and motion. Use official Lucide geometry. At narrow widths let controls wrap and scroll inside one panel. Use keyboard alternatives for reordering. No permanent duplicate toolbar.

## Practical additions

1. **Work area from selection** — mark the union of visible layer spans for a preview/render; low risk and useful in every project.
2. **Preflight inspector** — report missing footage, external fonts/effects, expressions and shared precomps before handoff, without collecting source text or paths.
3. **Capture preset timing** — report named cue times, FPS and normalized author key positions from a selected property; use it to compare a converted rig with the original.
4. **Reveal dependencies** — start at a comp and locate shared sources and consumers before cleanup or duplication.

The first acceptance run on Windows and the next engineering step are tracked in PROJECT_STATE.md.
