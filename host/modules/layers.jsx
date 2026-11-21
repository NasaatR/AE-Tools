register("anchor", function (args) {
    var comp = activeComp(), layers = selection(comp, true), steps = [];
    var point = args[0];
    function plan(layer) {
        var t = ordinary2D(layer), anchor = t.property("ADBE Anchor Point"), position = t.property("ADBE Position");
        var old = anchor.value, pos = position.value, scale = t.property("ADBE Scale").value;
        var rect = layer.sourceRectAtTime(comp.time, false), rad = t.property("ADBE Rotate Z").value * Math.PI / 180;
        var x = rect.left + rect.width * (point % 3) / 2, y = rect.top + rect.height * Math.floor(point / 3) / 2;
        var dx = (x - old[0]) * scale[0] / 100, dy = (y - old[1]) * scale[1] / 100;
        if (!isFinite(x + y + dx + dy + rad)) { fail("Invalid layer bounds."); }
        if (x === old[0] && y === old[1]) { return; }
        steps.push(function () {
            anchor.setValue([x, y]);
            position.setValue([pos[0] + dx * Math.cos(rad) - dy * Math.sin(rad), pos[1] + dx * Math.sin(rad) + dy * Math.cos(rad)]);
        });
    }
    var i; for (i = 0; i < layers.length; i++) { plan(layers[i]); }
    return steps;
});
register("parent", function (args) {
    var comp = activeComp(), layers = selection(comp, true), groups = [], steps = [], i;
    for (i = 0; i < layers.length; i++) {
        ordinary2D(layers[i]);
        if (layers[i].parent) { fail("Select layers without an existing parent."); }
        if (args[0] === 1) { groups.push([layers[i]]); }
    }
    if (!groups.length) { groups.push(layers); }
    function plan(group) {
        var x = 0, y = 0, j, pos;
        for (j = 0; j < group.length; j++) {
            pos = group[j].property("ADBE Transform Group").property("ADBE Position").value;
            x += pos[0]; y += pos[1];
        }
        return function () {
            var control = comp.layers.addNull(comp.duration), k;
            control.name = group.length === 1 ? group[0].name + " · Control" : "Selection · Control";
            control.property("ADBE Transform Group").property("ADBE Position").setValue([x / group.length, y / group.length]);
            for (k = 0; k < group.length; k++) { group[k].parent = control; }
        };
    }
    for (i = 0; i < groups.length; i++) { steps.push(plan(groups[i])); }
    return steps;
});
