function trimStep(layer, a, b) {
    return function () { layer.inPoint = a; layer.outPoint = b; };
}
register("trimBelow", function () {
    var comp = activeComp(), layers = selection(comp, true), steps = [], i, l, below, a, b;
    for (i = 0; i < layers.length; i++) {
        l = layers[i]; if (l.index >= comp.numLayers) { fail("The bottom layer has no neighbor below it."); }
        below = comp.layer(l.index + 1);
        a = Math.max(l.inPoint, below.inPoint); b = Math.min(l.outPoint, below.outPoint); span(a,b,comp.frameDuration);
        if (a !== l.inPoint || b !== l.outPoint) { steps.push(trimStep(l,a,b)); }
    }
    return steps;
});
register("trimKeys", function () {
    var comp = activeComp(), layers = selection(comp, true), fd = comp.frameDuration, steps = [], i, j, l, props, p, a, b;
    for (i = 0; i < layers.length; i++) {
        l = layers[i]; props = l.selectedProperties; a = Infinity; b = -Infinity;
        for (j = 0; j < props.length; j++) {
            p = props[j];
            if (p.propertyType === PropertyType.PROPERTY && p.matchName !== "ADBE Marker" && p.numKeys > 0) {
                a = Math.min(a, p.keyTime(1)); b = Math.max(b, p.keyTime(p.numKeys));
            }
        }
        if (a === Infinity) { fail("Select a keyed property on every target layer."); }
        if (a < l.inPoint - 0.000001 || b >= l.outPoint) { fail("A selected property has keys outside its visible layer."); }
        a = Math.max(l.inPoint, Math.floor(a / fd + 0.000001) * fd);
        b = Math.min(l.outPoint, (Math.floor(b / fd + 0.000001) + 1) * fd);
        span(a,b,fd); if (a !== l.inPoint || b !== l.outPoint) { steps.push(trimStep(l,a,b)); }
    }
    return steps;
});
register("workArea", function () {
    var comp = activeComp(), ls = selection(comp, false), a = comp.duration, b = 0, i;
    for (i = 0; i < ls.length; i++) { a = Math.min(a,ls[i].inPoint); b = Math.max(b,ls[i].outPoint); }
    a = Math.max(0,a); b = Math.min(comp.duration,b); span(a,b,comp.frameDuration);
    if (Math.abs(comp.workAreaStart-a)<0.000001 && Math.abs(comp.workAreaDuration-b+a)<0.000001) { return []; }
    return [function () { comp.workAreaStart = 0; comp.workAreaDuration = b-a; comp.workAreaStart = a; }];
});
register("sequence", function () {
    var comp = activeComp(), ls = selection(comp, true), steps = [], i, cursor, start, delta;
    if (ls.length < 2) { fail("Select at least two layers."); }
    ls.sort(function (a,b) { return a.index-b.index; }); cursor = ls[0].outPoint;
    function move(l, t) { return function () { l.startTime = t; }; }
    for (i = 1; i < ls.length; i++) {
        delta = cursor - ls[i].inPoint; start = ls[i].startTime + delta; cursor += ls[i].outPoint-ls[i].inPoint;
        if (cursor > comp.duration + 0.000001 || Math.abs(start) > 10800) { fail("Sequence would exceed the composition or timeline bounds."); }
        if (Math.abs(delta) > 0.000001) { steps.push(move(ls[i],start)); }
    }
    return steps;
});
register("trimComp", function () {
    var comp = activeComp(), cmd;
    if (app.isoLanguage !== "en_US" && app.isoLanguage !== "en_GB") { fail("This native command currently requires English After Effects."); }
    if (comp.workAreaStart === 0 && Math.abs(comp.workAreaDuration-comp.duration)<0.000001) { return []; }
    cmd = app.findMenuCommandId("Trim Comp to Work Area");
    if (!cmd) { fail("AE did not expose Trim Comp to Work Area on this build."); }
    return [function () {
        var viewer = comp.openInViewer(), duration = comp.workAreaDuration;
        if (!viewer || !viewer.setActive() || app.project.activeItem !== comp) { fail("Could not activate the target composition."); }
        app.executeCommand(cmd);
        if (Math.abs(duration-comp.duration)>0.000001) { fail("AE did not confirm the requested duration. Inspect the composition."); }
    }];
});
