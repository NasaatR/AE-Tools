register("sourceComp", function () {
    var comp = activeComp(), ls = selection(comp,true), l = ls[0], s = l.source;
    if (ls.length !== 1 || !(l instanceof AVLayer) || !(s instanceof FootageItem) || !s.hasVideo ||
        !s.mainSource || s.mainSource.isStill || s.footageMissing || s.useProxy || l.timeRemapEnabled ||
        l.collapseTransformation || s.frameRate < 1 || s.frameRate > 99 || s.duration <= 0) {
        fail("Select one online moving-footage layer without a proxy, collapse or time remap.");
    }
    var name = l.name, parent = s.parentFolder;
    return [function () {
        var inner = app.project.items.addComp(s.name + " · Source",s.width,s.height,s.pixelAspect,s.duration,s.frameRate);
        inner.parentFolder = parent; inner.preserveNestedFrameRate = true;
        var footage = inner.layers.add(s);
        footage.startTime = 0; footage.inPoint = 0; footage.outPoint = s.duration;
        l.replaceSource(inner,false); l.name = name;
    }];
});
function folderPlan(types, items) {
    var root = app.project.rootFolder, found = {}, steps = [], i, j, item;
    function create(name) {
        return function () { found[name] = root.items.addFolder(name); };
    }
    function move(entry, name) { return function () { entry.parentFolder = found[name]; }; }
    for (i = 0; i < types.length; i++) {
        for (j = 1; j <= root.numItems; j++) {
            item = root.item(j);
            if (item.name === types[i]) {
                if (found[types[i]] || !(item instanceof FolderItem)) { fail("A destination folder name is ambiguous at the project root."); }
                found[types[i]] = item;
            }
        }
        if (!found[types[i]]) { steps.push(create(types[i])); }
    }
    for (i = 0; i < items.length; i++) {
        if (items[i][0].parentFolder !== found[items[i][1]]) { steps.push(move(items[i][0],items[i][1])); }
    }
    return steps;
}
register("folders", function () {
    if (!app.project) { fail("Open a project first."); }
    return folderPlan(["Comps","Footage","Graphics","Audio"],[]);
});
register("sortItems", function () {
    var sel = app.project && app.project.selection, types = [], items = [], seen = {}, i, item, type;
    if (!sel || !sel.length) { fail("Select items in the Project panel."); }
    for (i = 0; i < sel.length; i++) {
        item = sel[i];
        if (item instanceof CompItem) { type = "Comps"; }
        else if (item instanceof FootageItem) {
            if (!item.hasVideo && item.hasAudio) { type = "Audio"; }
            else if (item.mainSource && item.mainSource.isStill) { type = "Graphics"; }
            else { type = "Footage"; }
        } else { fail("Select footage or compositions only."); }
        if (!seen[type]) { seen[type] = true; types.push(type); }
        items.push([item,type]);
    }
    return folderPlan(types,items);
});
