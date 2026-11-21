// Independent phases let artists combine IN 01 with OUT 02 on one layer.
function planTextMove(args, isExit) {
    var comp = activeComp(), layers = selection(comp, true), steps = [], fd = comp.frameDuration;
    var words = args[0] === 1, second = args[1] === 1, distance = args[2], frames = args[3], delay = args[4];
    var phase = isExit ? "OUT" : "IN";
    var title = "AE Tools · Move " + phase;
    var travelName = title + " travel (px)";
    var intro = "AE Tools · Move IN END", leave = "AE Tools · Move OUT START", finish = "AE Tools · Move OUT END";
    var selectorExpression = "var isExit = " + (isExit ? "true" : "false") +
        ", reverseOrder = " + ((isExit !== second) ? "true" : "false") +
        ", frames = " + frames + ", stagger = " + (delay / 100) + ";\n" + moveExpression;
    var positionExpression = "var d = thisLayer.effect(\"" + travelName + "\")(1) * " + (second ? "-1" : "1") +
        ";\nvalue.length === 3 ? [0,d,0] : [0,d];";
    function bind(prop, expression) {
        if (!prop || !prop.canSetExpression) { fail("AE did not expose the required text animator property."); }
        prop.expression = expression;
        if (!prop.expressionEnabled || prop.expressionError) { fail(prop.expressionError || "The expression did not activate."); }
    }
    function plan(layer) {
        var text = layer.property("ADBE Text Properties");
        var animators = text && text.property("ADBE Text Animators");
        var effects = layer.property("ADBE Effect Parade"), marks = layer.property("ADBE Marker");
        if (!animators || !animators.canAddProperty("ADBE Text Animator") || !effects ||
            !effects.canAddProperty("ADBE Slider Control") || !marks || layer.stretch !== 100) {
            fail("Select editable text with 100% layer stretch.");
        }
        if (animators.property(title) || effects.property(travelName)) {
            fail("This phase already exists. Edit its travel slider and timeline markers.");
        }
        var last = layer.outPoint-fd, endpoint = isExit ? last : layer.inPoint+frames*fd;
        var start = isExit ? endpoint-frames*fd : layer.inPoint, i, j, stamp, label;
        var times = isExit ? [start,endpoint] : [endpoint], labels = isExit ? [leave,finish] : [intro];
        if (start < layer.inPoint-0.000001 || endpoint > last+0.000001) {
            fail("Duration exceeds the visible layer. Choose fewer frames in tool options.");
        }
        for (i=1; i<=marks.numKeys; i++) {
            stamp = marks.keyTime(i); label = marks.keyValue(i).comment;
            if ((isExit && label===intro && stamp>start) || (!isExit && label===leave && stamp<endpoint)) {
                fail("IN and OUT intervals overlap. Shorten the duration or move the opposite marker.");
            }
            for (j=0; j<times.length; j++) {
                if (label===labels[j] || Math.abs(stamp-times[j])<0.00001) {
                    fail("A marker occupies a required name or time. Move it or adjust duration.");
                }
            }
        }
        return function () {
            var slider = effects.addProperty("ADBE Slider Control");
            slider.name = travelName; slider.property(1).setValue(distance);
            var anim = animators.addProperty("ADBE Text Animator"), idx = anim.propertyIndex;
            anim.name = title;
            var props = anim.property("ADBE Text Animator Properties");
            props.addProperty("ADBE Text Opacity").setValue(0);
            bind(animators.property(idx).property("ADBE Text Animator Properties").addProperty("ADBE Text Position 3D"), positionExpression);
            var selectors = animators.property(idx).property("ADBE Text Selectors");
            // Only this newly created animator can have a host-created default range.
            while (selectors.numProperties) { selectors.property(selectors.numProperties).remove(); }
            var selector = selectors.addProperty("ADBE Text Expressible Selector");
            selector.property("ADBE Text Range Type2").setValue(words ? 3 : 4);
            for (j=0;j<times.length;j++) { marks.setValueAtTime(times[j],new MarkerValue(labels[j])); }
            bind(selector.property("ADBE Text Expressible Amount"), selectorExpression);
        };
    }
    var i;
    for (i=0;i<layers.length;i++) { steps.push(plan(layers[i])); }
    return steps;
}
register("textMoveIn", function (args) { return planTextMove(args,false); });
register("textMoveOut", function (args) { return planTextMove(args,true); });
