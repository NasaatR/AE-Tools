# AE Tools

A dockable After Effects toolbox for Windows. Place anchors, build controllers, trim layers, wrap footage at source resolution, organize project items and retime a text reveal directly on the timeline.

## Install the foundation preview

Get **AE-Tools-1.0-Setup.exe** from [Releases](https://github.com/NasaatR/AE-Tools/releases). Close After Effects, run the installer, restart AE and open **Window → Extensions → AE Tools**. Dock the panel beside your timeline. Windows 11 and AE 25.x–27.x are the intended targets. The package is a signed CEP extension. The preview EXE is unsigned for Windows Authenticode. A Windows/AE in-host acceptance session is still required.

The installer installs for the current user, offline, without admin rights or a development environment. It stages the new signed files before switching the extension folder. For updates, close AE and use the next version's installer. The bundle ID and appearance storage key stay stable. To uninstall, close AE and remove only the marked folder at `%APPDATA%\Adobe\CEP\extensions\com.nasaat.aetools.panel`. An interrupted update may retain the previous copy at `%APPDATA%\Nasaat\AE Tools\install-work\previous`. Restore it while AE is closed if the target is missing. The optional ZXP uses the Adobe installation channel; avoid installing both routes simultaneously.

## Start with text

Create and select a three-second text layer. Click **Marker text reveal**, then drag **AE Tools · IN END**. Characters appear from the layer's in point and finish at the marker. The default intro lasts 12 composition frames. In tool options choose **Reverse reveal** before applying to add **OUT START** and **OUT END**. On the last exit marker the text is fully hidden. The default end is the last visible layer frame. Source Text, formatting and layer Transform Opacity remain editable. To replace this rig, Undo the application or remove its named animator and its owned markers before reapplying.

The first preset is built in. A future FFX/AEP is reviewed per asset for styling, original easing and dependencies. Arbitrary presets are not automatically converted in this version.

## Tools in 1.0

| Tool | First-release behavior |
|---|---|
| Move anchor | Press one of nine points to reposition static 2D anchors with scale/rotation compensation. The main button repeats the last position. Uses source bounds. |
| Parent to null | One controller at the mean of the selected anchor positions or one per layer. Static 2D layers without parents. |
| Trim to keys | Select keyed properties on each target layer. Includes the frame containing its final key. |
| Trim to layer below | Intersects the selected layers with the original spans of their immediate lower neighbors. |
| Set work area | Uses the union of the selected layers, clipped to the composition. |
| Sequence layers | Places layers end-to-end in timeline order, anchored to the first. Refuses an overlong sequence. |
| Source precomp | Wraps one moving-footage layer using interpreted source dimensions, pixel aspect, frame rate and duration. The original outer layer retains its transforms and effects. |
| Trim comp to work area | Runs AE's native English menu command, affecting this comp wherever used. Unresolved labels and unsupported locales stop safely. |
| Create project folders | Creates or reuses Comps, Footage, Graphics and Audio at project root. |
| Sort selected items | Moves selected Project footage and comps into type folders. Leaves unselected items in place. |
| Marker text reveal | Native opacity animator and range selector, ending on a named layer marker. Optional exit with independent endpoints. |

Search by action or category. Star a tool in its options and use the star beside search to see favorites. **Customize layout** provides drag/arrow reordering within categories, visibility and full-width tiles. Settings preview and autosave appearance changes. Diagnostics includes host/build, command parameters and bounded local error details, available as copy or TXT. An error after an edit begins can leave partial work; inspect the timeline before retrying and use the associated Undo entry.

## Development

Node 22+, npm, Chrome. Run `npm ci`, `npm test`, then `npm run test:ui`. Use CHROME_PATH to choose another Chromium executable. Open build/panel/index.html for the browser-only UI. For Windows packaging see installer/package.ps1. It requires Adobe ZXPSignCmd, a signing certificate, AETOOLS_CERT_PASSWORD and NSIS 3. Normal execution of the panel needs none of these. No runtime downloads or telemetry.

- [Current state and real-host acceptance](PROJECT_STATE.md)
- [Prioritized roadmap](docs/ROADMAP.md)
- [Research, limitations and preset intake](docs/RESEARCH.md)
- [Agent guide](AGENTS.md)

Icon geometry from Lucide. Its [license and notices](panel/icons/LICENSE.txt) are shipped in the package.
