const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { checkES3 } = require("../tools/build");
const host = fs.readFileSync("build/panel/host.jsx", "utf8");
function group(allowed, properties = {}) {
  const children = [];
  const g = {
    get numProperties() {
      return children.length;
    },
    property(k) {
      return typeof k === "number"
        ? children[k - 1] || properties[k]
        : properties[k] || children.find((p) => p.name === k);
    },
    canAddProperty(k) {
      return Object.hasOwn(allowed, k);
    },
    addProperty(k) {
      assert.ok(g.canAddProperty(k), k);
      const p = allowed[k]();
      children.push(p);
      p.propertyIndex = children.length;
      p.remove = () => children.splice(children.indexOf(p), 1);
      return p;
    },
  };
  return g;
}
function prop() {
  return {
    canSetExpression: true,
    expressionEnabled: true,
    setValue(v) {
      this.value = v;
    },
  };
}
function layer(fd, start = 0) {
  const effects = group({
    "ADBE Slider Control": () => group({}, { 1: prop() }),
  });
  const anim = () =>
    group(
      {},
      {
        "ADBE Text Animator Properties": group({
          "ADBE Text Opacity": prop,
          "ADBE Text Position 3D": prop,
        }),
        "ADBE Text Selectors": group({
          "ADBE Text Expressible Selector": () =>
            group(
              {},
              {
                "ADBE Text Range Type2": prop(),
                "ADBE Text Expressible Amount": prop(),
              },
            ),
        }),
      },
    );
  const anims = group({ "ADBE Text Animator": anim });
  const keys = [];
  const marks = {
    keys,
    get numKeys() {
      return keys.length;
    },
    keyTime(i) {
      return keys[i - 1].time;
    },
    keyValue(i) {
      return keys[i - 1];
    },
    setValueAtTime(time, v) {
      keys.push({ time, comment: v.comment });
      keys.sort((a, b) => a.time - b.time);
    },
    key(name) {
      const k = keys.find((x) => x.comment === name);
      if (!k) throw Error("missing");
      return k;
    },
  };
  const types = {
    "ADBE Text Properties": group({}, { "ADBE Text Animators": anims }),
    "ADBE Marker": marks,
    "ADBE Effect Parade": effects,
  };
  return {
    inPoint: start,
    outPoint: start + fd * 120,
    stretch: 100,
    property(k) {
      assert.ok(Object.hasOwn(types, k), "Unexpected property: " + k);
      return types[k];
    },
    anims,
    marks,
    effects,
  };
}
function session(fd, layers) {
  class CompItem {}
  let opened = 0,
    closed = 0;
  const comp = Object.assign(new CompItem(), {
    frameDuration: fd,
    selectedLayers: layers,
  });
  const app = {
    project: { activeItem: comp },
    beginUndoGroup() {
      opened++;
    },
    endUndoGroup() {
      closed++;
    },
  };
  const api = vm.runInNewContext(host + "\nAETools;", {
    CompItem,
    app,
    MarkerValue: class {
      constructor(comment) {
        this.comment = comment;
      }
    },
  });
  return {
    run(id, args) {
      return api.run(id, args).split("|").map(decodeURIComponent);
    },
    counts() {
      return [opened, closed];
    },
  };
}
function rig(l, phase) {
  const a = l.anims.property("AE Tools · Move " + phase);
  const s = a.property("ADBE Text Selectors").property(1);
  return {
    based: s.property("ADBE Text Range Type2").value,
    expr: s.property("ADBE Text Expressible Amount").expression,
    position: a.property("ADBE Text Animator Properties").property(2)
      .expression,
  };
}
function weight(r, l, fd, t, i = 1, n = 1) {
  const w = vm.runInNewContext(r.expr, {
    time: t,
    inPoint: l.inPoint,
    outPoint: l.outPoint,
    thisLayer: { marker: l.marks },
    thisComp: { frameDuration: fd },
    textIndex: i,
    textTotal: n,
  });
  assert.equal(w.length, 3);
  assert.equal(w[0], w[2]);
  return w[0];
}
test("four directional reference variants: order, travel, unit, opacity window and independently editable distance", () => {
  for (const isExit of [false, true])
    for (const second of [0, 1]) {
      const fd = 1 / 25,
        l = layer(fd, 2),
        st = session(fd, [l]),
        phase = isExit ? "OUT" : "IN";
      assert.equal(
        st.run(
          isExit ? "textMoveOut" : "textMoveIn",
          [second, second, 24, 30, 10].join(","),
        )[0],
        "ok",
      );
      const r = rig(l, phase);
      assert.equal(r.based, second ? 3 : 4);
      checkES3(r.expr, "selector expression");
      checkES3(r.position, "position expression");
      const effect = l.effects
        .property("AE Tools · Move " + phase + " travel (px)")
        .property(1);
      const position = () =>
        vm.runInNewContext(r.position, {
          value: [0, 0, 0],
          thisLayer: { effect: () => () => effect.value },
        });
      assert.equal(position()[1], second ? -24 : 24);
      effect.setValue(7);
      assert.equal(position()[1], second ? -7 : 7);
      const begin = isExit ? l.marks.keys[0].time : l.inPoint,
        end = l.marks.keys.at(-1).time;
      for (const i of [1, 2, 3]) {
        assert.ok(
          Math.abs(weight(r, l, fd, begin, i, 3) - (isExit ? 0 : 100)) < 1e-8,
        );
        assert.ok(
          Math.abs(weight(r, l, fd, end, i, 3) - (isExit ? 100 : 0)) < 1e-8,
        );
      }
      const mid = (begin + end) / 2;
      // Sample ordering reverses with variant and the mirrored exit.
      assert.equal(
        weight(r, l, fd, mid, 1, 3) < weight(r, l, fd, mid, 3, 3),
        !second,
      );
      assert.deepEqual(st.counts(), [1, 1]);
    }
});
test("measured interior Bezier samples and mirrored exit survive marker retiming at fractional FPS", () => {
  // Parametric cubic at t=.5 -> x=.27125 and y=.75875 (independent analytic fixture).
  const x = (3 * 0.23 + 3 * 0.16 + 1) / 8,
    y = (3 * 0.69 + 3 * 1 + 1) / 8;
  for (const fps of [24000 / 1001, 25, 30000 / 1001, 60]) {
    const fd = 1 / fps,
      l = layer(fd, -0.25),
      st = session(fd, [l]);
    st.run("textMoveIn", "0,0,0,30,10");
    st.run("textMoveOut", "1,1,0,30,10");
    const ri = rig(l, "IN"),
      ro = rig(l, "OUT");
    const end = l.marks.key("AE Tools · Move IN END");
    end.time += 7.5 * fd;
    assert.ok(
      Math.abs(
        weight(ri, l, fd, l.inPoint + (end.time - l.inPoint) * x) -
          100 * (1 - y),
      ) < 0.001,
    );
    const a = l.marks.key("AE Tools · Move OUT START").time,
      b = l.marks.key("AE Tools · Move OUT END").time;
    assert.ok(
      Math.abs(weight(ro, l, fd, a + (b - a) * (1 - x)) - 100 * (1 - y)) <
        0.001,
    );
    end.time = 0;
    assert.equal(weight(ri, l, fd, 0), 0);
    l.marks.keys.splice(l.marks.keys.indexOf(end), 1);
    assert.equal(weight(ri, l, fd, l.inPoint + 30 * fd), 0);
  }
});
test("no partial batch for marker collision, overlapping phases, duplicate rig or short layer", () => {
  const f = 1 / 25,
    l = layer(f),
    b = layer(f),
    s = session(f, [l, b]);
  b.marks.setValueAtTime(30 * f, { comment: "editorial" });
  assert.equal(s.run("textMoveIn", "0,0,24,30,10")[0], "error");
  assert.deepEqual(s.counts(), [0, 0]);
  assert.equal(l.effects.numProperties, 0);
  b.marks.keys.pop();
  assert.equal(s.run("textMoveIn", "0,0,24,30,10")[0], "ok");
  assert.equal(s.run("textMoveIn", "0,0,24,30,10")[0], "error");
  assert.equal(s.run("textMoveOut", "0,0,24,110,10")[0], "error");
  assert.equal(s.run("textMoveOut", "0,0,24,600,10")[0], "error");
  assert.deepEqual(s.counts(), [1, 1]);
  assert.equal(b.marks.numKeys, 1);
});
