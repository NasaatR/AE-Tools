# AE Tools · text motion preview 1.1

Canonical source: NasaatR/AE-Tools, main. Initial base 31800df, research milestone 26e367a. Manifest com.nasaat.aetools.panel. Windows 11, AEFT 25–27, CEP 12 and ExtendScript. UI and metadata are English. Full feature and acceptance priorities: docs/ROADMAP.md.

## Current implementation

13 registered tools, including Text move in and Text move out. panel/catalog.json owns the metadata, host/core.jsx owns dispatch/preflight/Undo, host/modules contains isolated commands, host/expressions contains the authorable timing driver. tools/build.js emits a complete panel into build/panel, including host.jsx. The browser calls only fixed command IDs with integer parameters. Settings use a versioned local namespace; control previews and saved parameters make no scene edits. In a partial failure, stop and inspect the scope before Undo/retry.

## Evidence and pending work

npm test checks the actual emitted host ES3 with Acorn 8.15.0, script, allowReserved=never and negative controls. Contract tests exercise preflight, late invalid targets, Undo errors, source matching, endpoint timing and reruns. Browser tests cover narrow settings, search, favorites, layout and persisted zero/false. The Windows package workflow verifies the ZXP and matches installed bytes after both fresh install and same-version reinstall. Check the exact commit's Actions jobs for execution status. Browser evidence is separate from AE behavior.

## Previous verified foundation release

The [1.0 prerelease](https://github.com/NasaatR/AE-Tools/releases/tag/v1.0) was built from [aa1ae76](https://github.com/NasaatR/AE-Tools/commit/aa1ae76c35b3ec54b2af29c17d091839e7b8ff54). [Windows validation](https://github.com/NasaatR/AE-Tools/actions/runs/44944547909) passed 13 automated checks and browser interactions. [Packaging](https://github.com/NasaatR/AE-Tools/actions/runs/44944547905) signed and verified the ZXP, built the EXE and exercised fresh install and reinstall on a Windows runner. The published ZXP payload matched the tested panel file-by-file. Release assets carry SHA256SUMS.txt. Host JSX SHA-256: `9357ed2909f6af94ca4d3589c214ae1decc1168d487fd69858f3c0bc49c2f2a7`.

The first browser pass exposed missing external SVG masks under local-file loading. Glyphs are now embedded from the editable SVGs during build. Keep the offline browser test with failed-resource assertions. The one-time preview certificate is self-signed and specific to this preview. Provide a retained publisher signing identity through a secure signing environment for future production distribution.

## First Windows / AE acceptance session

Use an unsaved disposable project, then save/reopen your fixture as a new file. Record AE build, language, project expression engine, scaling, and command. Start with a cold installation, docking and resizing at 100/150/200%. Look for clipped settings, stale selection, keyboard focus and restart persistence.

1. At 23.976, 25, 29.97 and 60 fps create a 3 s mixed-style Cyrillic/Latin layer, including emoji and a line break. Apply Marker text reveal. Check hidden at layer start, fully visible exactly at IN END and unchanged Source Text/style. Move end to twice its time, check midpoint and endpoint. Repeat with an exit and compare its final visible frame. Delete/move/cross markers. Missing cues use frame-count defaults; clamped collapsed spans step at the boundary. Duplicate or colliding cues at application must stop before mutation. Test both AE expression engines.
2. On rotated, negatively scaled, static 2D footage/shape/text layers compare anchor outcomes at all nine points. Inspect current image and children; test a keyed/separated transform and a locked late target. A rejected batch leaves every layer intact.
3. Parent group/individually; verify the picture and one Undo. Trim adjacent layers, one-key properties, subframes, bottommost targets and sequences extending beyond the comp. Trim a nonzero work area in an English build; verify retained frame and displayed start in nested consumers.
4. Wrap a trimmed 1080×1920 23.976 clip inside a 1920×1080 25 fps comp. Verify native PAR/duration, source frame zero, final frame, timing, outer effects, alpha/audio and one Undo. Include footage with nonzero start timecode; reject or document any unsupported case.
5. Run folder template twice, mime/interpretation sort with image sequence, and a folder-name collision. Check the Project panel and Undo. Test failed/partial action reporting in a disposable project. Confirm output survives close/reopen.
6. Install the next version over a customized layout. Verify preference identity, prior project rigs and manual recovery. Repeat on the second AE version. Record passes/failures by actual host build before claiming compatibility.

Next engineering slice: compare the new motion against the four reference FFX inside AE, then continue the prioritized roadmap. See docs/TEXT_MOTION.md for the test matrix and independent motion implementation. For offline work on B, see docs/CONTINUE.md. Unprecomp, arbitrary asset conversion, effect/layer-set libraries, folder-template authoring, batch rename and user macros remain on the roadmap.
