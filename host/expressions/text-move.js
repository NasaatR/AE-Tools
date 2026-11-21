// Per-unit selector amount. The host provides the phase, variant, duration and delay.
function markerTime(label, fallback) {
    try { return thisLayer.marker.key(label).time; } catch (missing) { return fallback; }
}
function bezierCoordinate(t, a, b) {
    var u = 1 - t;
    return 3 * u * t * (u * a + t * b) + t * t * t;
}
// Invert the x component before sampling y. The input is time, not the cubic parameter.
function movementCurve(x) {
    if (x <= 0 || x >= 1) { return x <= 0 ? 0 : 1; }
    var lo = 0, hi = 1, t = x, i, err, slope, candidate;
    for (i = 0; i < 12; i++) {
        err = bezierCoordinate(t, 0.23, 0.16) - x;
        if (Math.abs(err) < 0.000001) { break; }
        if (err < 0) { lo = t; } else { hi = t; }
        slope = 3 * (0.23 * (1-t)*(1-t) - 0.14 * (1-t)*t + 0.84*t*t);
        candidate = t - err / slope;
        t = candidate > lo && candidate < hi ? candidate : (lo + hi) / 2;
    }
    return bezierCoordinate(t, 0.69, 1);
}
var fd = thisComp.frameDuration, last = Math.max(inPoint, outPoint - fd);
var end = isExit ? markerTime("AE Tools · Move OUT END", last) :
    markerTime("AE Tools · Move IN END", inPoint + frames * fd);
end = Math.max(inPoint, Math.min(last, end));
var begin = isExit ? Math.max(inPoint, Math.min(end,
    markerTime("AE Tools · Move OUT START", end - frames * fd))) : inPoint;
var count = Math.max(1, textTotal);
var rank = reverseOrder ? count - textIndex : textIndex - 1;
var phase = end > begin ? (time - begin) / (end - begin) : (time >= end ? 1 : 0);
var local = Math.max(0, Math.min(1, phase * (1 + (count - 1) * stagger) - rank * stagger));
var weight = 100 * (1 - movementCurve(isExit ? 1 - local : local));
[weight, weight, weight];
