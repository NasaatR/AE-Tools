register("textReveal", function (args) {
    var comp = activeComp(), ls = selection(comp,true), fd = comp.frameDuration, steps = [];
    var animatorName = "AE Tools · Marker Reveal", names = ["AE Tools · IN END","AE Tools · OUT START","AE Tools · OUT END"];
    function plan(l) {
        var text = l.property("ADBE Text Properties"), anims = text && text.property("ADBE Text Animators");
        var markers = l.property("ADBE Marker"), i, j, sec, times, entry, last, exitStart;
        if (!anims || !markers || !anims.canAddProperty("ADBE Text Animator")) { fail("Select editable text layers only."); }
        if (l.stretch !== 100) { fail("Use unstretched text layers for this preset."); }
        for (i = 1; i <= anims.numProperties; i++) {
            if (anims.property(i).name === animatorName) { fail("A Marker Reveal already exists. Move its markers to edit timing."); }
        }
        entry = l.inPoint + args[0]*fd; last = l.outPoint - fd; exitStart = last - args[2]*fd;
        if (entry > last + 0.000001 || (args[1] && exitStart <= entry + 0.000001)) {
            fail("The layer is too short for these frame counts. Reduce them in Tool options.");
        }
        times = args[1] ? [entry,exitStart,last] : [entry];
        for (i = 1; i <= markers.numKeys; i++) {
            sec = markers.keyTime(i);
            for (j = 0; j < names.length; j++) {
                if (markers.keyValue(i).comment === names[j] || (j < times.length && Math.abs(times[j]-sec)<0.00001)) {
                    fail("An existing marker conflicts with this rig. Move or rename it first.");
                }
            }
        }
        return function () {
            var anim = anims.addProperty("ADBE Text Animator"), idx = anim.propertyIndex, k, selectors, selector, start;
            anim.name = animatorName;
            anim.property("ADBE Text Animator Properties").addProperty("ADBE Text Opacity").setValue(0);
            selectors = anims.property(idx).property("ADBE Text Selectors");
            selector = selectors.numProperties ? selectors.property(1) : selectors.addProperty("ADBE Text Selector");
            start = selector.property("ADBE Text Percent Start");
            if (!start || !start.canSetExpression) { fail("AE did not expose a percentage selector."); }
            for (k = 0; k < times.length; k++) { markers.setValueAtTime(times[k],new MarkerValue(names[k])); }
            start.expression = "var introFrames = " + args[0] + ", withExit = " + args[1] + ", exitFrames = " + args[2] + ";\n" + revealExpression;
            if (start.expressionError || !start.expressionEnabled) { fail(start.expressionError || "AE did not enable the selector expression."); }
        };
    }
    var i; for (i = 0; i < ls.length; i++) { steps.push(plan(ls[i])); }
    return steps;
});
