// Built as one ES3 script. Modules register preflight functions in this closure.
var AETools = (function () {
    var handlers = {};
    function fail(message) { throw new Error(message); }
    function activeComp() {
        var item = app.project && app.project.activeItem;
        if (!(item instanceof CompItem)) { fail("Activate a composition first."); }
        return item;
    }
    function selection(comp, writable) {
        var layers = comp.selectedLayers, i;
        if (!layers.length) { fail("Select at least one timeline layer."); }
        for (i = 0; i < layers.length; i++) {
            if (writable && layers[i].locked) { fail("Unlock the selected layers first."); }
            if (layers[i].outPoint <= layers[i].inPoint || layers[i].stretch < 0) {
                fail("Reversed layers are unsupported for this command.");
            }
        }
        return layers;
    }
    function span(a, b, fd) {
        if (b - a < fd - 0.000001) { fail("The target must span at least one frame."); }
    }
    function ordinary2D(layer) {
        if (!(layer instanceof AVLayer) || layer.threeDLayer || layer.threeDPerChar ||
            layer.autoOrient !== AutoOrientType.NO_AUTO_ORIENT) { fail("Use ordinary 2D layers with auto-orient off."); }
        var transform = layer.property("ADBE Transform Group");
        var names = ["ADBE Position", "ADBE Anchor Point", "ADBE Scale", "ADBE Rotate Z"], i, p;
        for (i = 0; i < names.length; i++) {
            p = transform.property(names[i]);
            if (!p || p.isTimeVarying || p.expressionEnabled || (i === 0 && p.dimensionsSeparated)) {
                fail("Animated or separated transforms need a dedicated compensation mode.");
            }
        }
        return transform;
    }
    function register(id, fn) { handlers[id] = fn; }
    function reply(parts) {
        var out = [], i;
        for (i = 0; i < parts.length; i++) { out.push(encodeURIComponent(String(parts[i]))); }
        return out.join("|");
    }
    function dispatch(id, raw) {
        var steps, args = [], i, meta, bits, n, p, opened = false, attempted = 0, error = null, cleanup = "";
        try {
            if (id === "ping") { return reply(["ok", "Connected", app.version, app.buildNumber, $.os]); }
            if (!catalog.hasOwnProperty(id) || !handlers.hasOwnProperty(id)) { fail("Unknown command."); }
            meta = catalog[id]; bits = raw === "" ? [] : raw.split(",");
            if (bits.length !== meta.params.length) { fail("Invalid parameter count."); }
            for (i = 0; i < bits.length; i++) {
                n = Number(bits[i]); p = meta.params[i];
                if (!/^[0-9]+$/.test(bits[i]) || n < p[0] || n > p[1]) { fail("Parameter outside allowed range."); }
                args.push(n);
            }
            steps = handlers[id](args);
            if (!steps.length) { return reply(["ok", "Already up to date."]); }
            app.beginUndoGroup("AE Tools · " + meta.title); opened = true;
            for (i = 0; i < steps.length; i++) { attempted++; steps[i](); }
        } catch (e) { error = e; }
        finally {
            if (opened) {
                try { app.endUndoGroup(); } catch (endError) { cleanup = String(endError); }
            }
        }
        if (error || cleanup) {
            return reply(["error", error ? String(error) : "Could not close Undo group.", error ? (error.line || "") : "",
                error && error.fileName ? String(error.fileName).split(/[\\\/]/).pop() : "", attempted, cleanup]);
        }
        return reply(["ok", meta.title + " complete."]);
    }
    /* GENERATED_CATALOG */
    /* REGISTER_MODULES */
    return {run: dispatch};
}());
