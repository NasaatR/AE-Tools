const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { checkES3 } = require("../tools/build");
const catalog = require("../panel/catalog.json");
const code = fs.readFileSync("build/panel/host.jsx", "utf8"),
  expr = fs.readFileSync("host/expressions/reveal.js", "utf8");
class CompItem {}
class AVLayer {}
class FolderItem {}
function session(layers = []) {
  const comp = Object.assign(new CompItem(), {
    duration: 10,
    frameDuration: 1 / 25,
    selectedLayers: layers,
    numLayers: layers.length,
    layer: (i) => layers[i - 1],
  });
  const counts = { open: 0, close: 0 };
  const app = {
    project: { activeItem: comp },
    beginUndoGroup() {
      counts.open++;
    },
    endUndoGroup() {
      counts.close++;
    },
  };
  const api = vm.runInNewContext(code + "\nAETools;", {
    app,
    CompItem,
    AVLayer,
    FolderItem,
    FootageItem: class {},
    MarkerValue: class {},
    PropertyType: { PROPERTY: 1 },
    AutoOrientType: { NO_AUTO_ORIENT: 0 },
  });
  return {
    comp,
    app,
    counts,
    run: (id, args = "") =>
      api.run(id, args).split("|").map(decodeURIComponent),
  };
}
function layer(index, a, b) {
  return { index, inPoint: a, outPoint: b, startTime: a, stretch: 100 };
}
test("strict grammar rejects reserved identifiers and unquoted ES3 property forms", () => {
  for (const s of [
    "var protected = 1",
    "var a={default:1}",
    "a.class",
    "let x=3",
    "(x)=>x",
  ])
    assert.throws(() => checkES3(s, "test"));
  checkES3(
    "var protectedRegion = {'default': 1}; protectedRegion['default'];",
    "test",
  );
});
test("every catalog ID has a host handler and exported JS payload stays ES3", () => {
  const s = session();
  for (const t of catalog) {
    const args = (t.params || []).map((p) => p.default).join(",");
    checkES3("AETools.run('" + t.id + "','" + args + "')", "bridge");
    assert.doesNotMatch(
      s.run(t.id, args).join("|"),
      /Unknown command|Invalid parameter count/,
    );
  }
  assert.equal(s.run("constructor")[0], "error");
  assert.equal(s.run("anchor", "9")[0], "error");
  assert.equal(s.counts.open, 0);
});
test("batch preflights last target before its first write", () => {
  const ls = [layer(1, 0, 10), layer(2, 1, 9)];
  const s = session(ls);
  assert.equal(s.run("trimBelow")[0], "error");
  assert.equal(s.counts.open, 0);
  assert.equal(ls[0].inPoint, 0);
});
test("consecutive selected layers read original neighbor spans", () => {
  const ls = [layer(1, 0, 10), layer(2, 1, 8), layer(3, 2, 7)],
    s = session(ls);
  s.comp.selectedLayers = ls.slice(0, 2);
  assert.equal(s.run("trimBelow")[0], "ok");
  assert.deepEqual(
    ls.map((l) => [l.inPoint, l.outPoint]),
    [
      [1, 8],
      [2, 7],
      [2, 7],
    ],
  );
  assert.deepEqual(s.counts, { open: 1, close: 1 });
});
test("primary host error survives cleanup failure and reports attempted work", () => {
  const ls = [layer(1, 0, 8), layer(2, 2, 5)],
    s = session(ls);
  s.comp.selectedLayers = [ls[0]];
  Object.defineProperty(ls[0], "inPoint", {
    get: () => 0,
    set() {
      throw Error("write failed");
    },
  });
  s.app.endUndoGroup = () => {
    throw Error("cleanup failed");
  };
  const r = s.run("trimBelow");
  assert.match(r[1], /write failed/);
  assert.equal(r[4], "1");
  assert.match(r[5], /cleanup failed/);
});
test("trim to last visible key, including a single-key layer", () => {
  const l = layer(1, 0, 4),
    s = session([l]);
  l.selectedProperties = [
    {
      propertyType: 1,
      matchName: "ADBE Position",
      numKeys: 1,
      keyTime: () => 1.01,
    },
  ];
  assert.equal(s.run("trimKeys")[0], "ok");
  assert.equal(l.inPoint, 1);
  assert.equal(l.outPoint, 1.04);
});
test("work area clips to comp bounds, repeat is a no-op", () => {
  const s = session([layer(1, -1, 3), layer(2, 4, 8)]);
  s.run("workArea");
  s.run("workArea");
  assert.equal(s.comp.workAreaStart, 0);
  assert.equal(s.comp.workAreaDuration, 8);
  assert.equal(s.counts.open, 1);
});
test("source wrapper keeps outer layer and source metadata", () => {
  class FootageItem {}
  const src = Object.assign(new FootageItem(), {
    name: "video",
    width: 1080,
    height: 1920,
    pixelAspect: 1.5,
    duration: 3,
    frameRate: 24000 / 1001,
    hasVideo: true,
    mainSource: { isStill: false },
  });
  const l = Object.assign(new AVLayer(), layer(1, 1, 2), {
    name: "shot",
    source: src,
    replaceSource(x) {
      this.source = x;
    },
  });
  let dims;
  const inner = { layers: { add: () => ({}) } };
  const comp = Object.assign(new CompItem(), { selectedLayers: [l] });
  const app = {
    project: {
      activeItem: comp,
      items: {
        addComp: (...args) => {
          dims = args;
          return inner;
        },
      },
    },
    beginUndoGroup() {},
    endUndoGroup() {},
  };
  const api = vm.runInNewContext(code + "\nAETools;", {
    app,
    CompItem,
    AVLayer,
    FootageItem,
  });
  assert.equal(api.run("sourceComp", "").split("|")[0], "ok");
  assert.deepEqual(dims.slice(1), [1080, 1920, 1.5, 3, 24000 / 1001]);
  assert.equal(l.source, inner);
  assert.equal(l.inPoint, 1);
  assert.equal(l.outPoint, 2);
});
function sample(t, fd, m, exit, ip = 1, op = 4) {
  return vm.runInNewContext(expr, {
    time: t,
    thisComp: { frameDuration: fd },
    thisLayer: {
      marker: {
        key(n) {
          if (!(n in m)) throw Error("missing");
          return { time: m[n] };
        },
      },
    },
    introFrames: 12,
    withExit: exit,
    exitFrames: 8,
    inPoint: ip,
    outPoint: op,
  });
}
test("expression reaches exact named endpoints across FPS and shifted markers", () => {
  for (const fps of [24000 / 1001, 25, 30000 / 1001, 60]) {
    const fd = 1 / fps,
      m = {
        "AE Tools · IN END": 2,
        "AE Tools · OUT START": 3,
        "AE Tools · OUT END": 3.5,
      };
    for (const [t, v] of [
      [0, 0],
      [1, 0],
      [1.5, 50],
      [2, 100],
      [2.5, 100],
      [3, 100],
      [3.25, 50],
      [3.5, 0],
      [4, 0],
    ])
      assert.equal(sample(t, fd, m, 1), v);
    m["AE Tools · IN END"] = 1.5;
    assert.equal(sample(1.5, fd, m, 0), 100);
    assert.equal(sample(1 + 12 * fd, fd, {}, 0), 100);
    assert.equal(sample(4 - fd, fd, {}, 1), 0);
    m["AE Tools · OUT END"] = 1.1;
    assert.ok(Number.isFinite(sample(1.5, fd, m, 1)));
  }
});
test("marker collisions refuse entire command before animator creation", () => {
  const s = session();
  const l = Object.assign(layer(1, 0, 2), {
    property(name) {
      return name === "ADBE Marker"
        ? {
            numKeys: 1,
            keyTime: () => 12 / 25,
            keyValue: () => ({ comment: "Editorial beat" }),
          }
        : {
            property: () => ({ numProperties: 0, canAddProperty: () => true }),
          };
    },
  });
  s.comp.selectedLayers = [l];
  assert.match(s.run("textReveal", "12,0,12")[1], /conflicts/);
  assert.equal(s.counts.open, 0);
});
test("folder template is idempotent and ambiguous sibling names block it", () => {
  const s = session(),
    items = [];
  const root = {
    get numItems() {
      return items.length;
    },
    item: (i) => items[i - 1],
    items: {
      addFolder(name) {
        const f = Object.assign(new FolderItem(), { name });
        items.push(f);
        return f;
      },
    },
  };
  s.app.project.rootFolder = root;
  s.run("folders");
  s.run("folders");
  assert.equal(items.length, 4);
  assert.equal(s.counts.open, 1);
  items.push({ name: "Comps" });
  assert.match(s.run("folders")[1], /ambiguous/);
  assert.equal(s.counts.open, 1);
});
