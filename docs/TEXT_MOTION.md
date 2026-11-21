# Text motion · 1.1

## Reference intake

Static inspection of four RIFX/FaFX presets identified one active expression selector per phase, a numbered custom control effect, and expression-driven animator properties including Position, Scale, Rotation, Opacity and Tracking. The saved selector unit is 4 (Lines), Animation Type is 3, Delay is 10. The two IN controls have opposite vertical offsets and opposite unit order. The OUT variants keep their corresponding offset signs and invert unit order. All use the same cubic curve; exit mirrors it in time. The FFX contain the motion data needed here. The accompanying JSXBIN is a compiled ExtendScript component. The ATOM is a separate container with embedded PNG data. Its full catalog/loader behavior has not been established. Neither is required by this implementation.

| Source family | Variant | Y offset during hidden state | First unit to move |
|---|---|---|---|
| IN | 01 / 02 | positive / negative | first / last |
| OUT | 01 / 02 | positive / negative | last / first |

Curve 3 has control points (0.23, 0.69) and (0.16, 1.00). Sample the cubic by **inverting x** at normalized time. If a unit's eased entry progress is E(u), its remaining hidden influence is 1−E(u); exit uses 1−E(1−u). As an independent interior check, at the parametric midpoint the normalized time is 0.27125 and eased progress is 0.75875. The 10% delay separates adjacent unit starts by one tenth of one unit’s duration, not one tenth of the entire layer. For N units a motion window spans 1 + (N−1) × delay unit durations.

## Implementation choices

Build a native opacity/vertical-position animator from scratch. The stored defaults of the references provide the curve, offset signs and ordering. AE Tools uses a shorter configurable pixel offset and a longer editable creation interval. It implements the selected reference look; the original tool's optional alternate curve, rotation, tracking, scale, randomization and other style modes are outside this release. Easing runs per native rendered line or word with constant-time rank lookup. The selector limits progress before curve evaluation; edits to Source Text, formatting and paragraph layout remain independent. Each phase uses one independent native Slider Control. Slider value can be keyed and remains editable after the panel closes. Keep its assigned name while the position expression uses it.

IN samples the live in point and its named end. The supplied OUT expressions used an OUT marker as a start and the layer out point as their ending. The new native rig supplies both an editable OUT start and an OUT end on the final visible frame by default. Missing markers fall back to creation frame counts at the current FPS. A collapsed span is a step. Scripting refuses collisions, an already-owned phase, locked layers, reversed/stretched layers and new overlapping entry/exit intervals. Moving existing markers into overlap deliberately superimposes the two animators. Source text is never rewritten. Reapplying a phase will direct you to its existing slider/markers.

## Host comparison for the receiving agent

Use a disposable project. Put three visibly distinct lines of mixed-style text in a five-second layer, duplicate it for each reference and its AE Tools counterpart. On the original use the licensed toolbox as usual (or apply the FFX and establish the effect/marker it expects). Set the same physical offset, marker intervals, unit order and 10% delay on both. For OUT, compare matching normalized phase endpoints since the reference uses an exclusive out point. Compare position and opacity at 0%, 25%, the analytic midpoint above, 50%, 75% and 100%. Repeat with one line, word mode, paragraph soft wraps, RTL, zero travel, a shifted in point, 23.976/25/29.97/60 fps and multiple selected layers. Move one marker, change travel after application, Undo, save/reopen and toggle the relevant effect/animator. Record host version, expression engine, the exact observed difference and reference frames before changing the curve. Synthetic contract tests do not establish pixel-identical host output.

[Adobe expression-selector example](https://helpx.adobe.com/after-effects/desktop/animating-text/text-animation-examples/examples-resources-text-animation.html) · [Text property match names](https://ae-scripting.docsforadobe.dev/matchnames/layer/textlayer/)
