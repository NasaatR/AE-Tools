// Scalar percentage on Range Selector > Start. Comp seconds, including subframe samples.
function cue(name, fallback) {
    try { return thisLayer.marker.key(name).time; } catch (missing) { return fallback; }
}
function unit(t, a, b) {
    if (b <= a) { return t >= b ? 1 : 0; }
    return Math.max(0, Math.min(1, (t - a) / (b - a)));
}
var last = Math.max(inPoint, outPoint - thisComp.frameDuration);
var entryEnd = Math.max(inPoint, Math.min(last, cue("AE Tools · IN END", inPoint + introFrames * thisComp.frameDuration)));
var exitEnd = Math.min(last, Math.max(entryEnd, cue("AE Tools · OUT END", last)));
var exitStart = Math.max(entryEnd, Math.min(exitEnd, cue("AE Tools · OUT START", exitEnd - exitFrames * thisComp.frameDuration)));
100 * unit(time, inPoint, entryEnd) * (withExit ? 1 - unit(time, exitStart, exitEnd) : 1);
