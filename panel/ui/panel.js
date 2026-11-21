"use strict";
const $ = (id) => document.getElementById(id);
const S = ToolState.data,
  A = S.appearance,
  byId = new Map(CATALOG.map((t) => [t.id, t]));
let favoritesOnly = false,
  busy = false,
  returnTo = null,
  statusMessage = "",
  host = "Browser preview",
  logs = [];
const categories = [
  ...new Set([
    "Layers",
    "Animation",
    "Timeline",
    "Compositions",
    "Project",
    ...CATALOG.map((tool) => tool.category),
  ]),
];
function el(tag, cls, txt) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt !== undefined) n.textContent = txt;
  return n;
}
function icon(name) {
  const n = el("span", "icon");
  n.setAttribute("aria-hidden", "true");
  n.style.setProperty("--glyph", 'url("' + window.GLYPHS[name] + '")');
  return n;
}
function glyphButton(name, label, fn) {
  const b = el("button", "mini");
  b.type = "button";
  b.title = label;
  b.setAttribute("aria-label", label);
  b.append(icon(name));
  b.onclick = fn;
  return b;
}
function button(label, fn, cls = "capsule") {
  const b = el("button", cls, label);
  b.type = "button";
  b.onclick = fn;
  return b;
}
function setStatus(msg, kind) {
  statusMessage = msg;
  $("status").textContent = msg;
  $("status").title = msg;
  $("dot").className = kind || "";
}
function persist() {
  const err = ToolState.save();
  if (err) setStatus(err, "error");
}
function toggle(list, id) {
  const i = list.indexOf(id);
  if (i < 0) list.push(id);
  else list.splice(i, 1);
}
function appearance() {
  const root = document.documentElement.style;
  Object.keys(ToolState.bounds).forEach((k) =>
    root.setProperty("--" + k, A[k] + "px"),
  );
  root.setProperty("--accent", A.accent);
  root.setProperty("--duration", A.motion ? "130ms" : "0ms");
  root.setProperty(
    "--family",
    A.family === "System"
      ? '"Segoe UI",Arial,sans-serif'
      : A.family === "Mono"
        ? "Consolas,monospace"
        : "Arial,sans-serif",
  );
  document.body.classList.toggle(
    "light",
    A.theme === "Light" ||
      (A.theme === "System" &&
        matchMedia("(prefers-color-scheme:light)").matches),
  );
  document.body.classList.toggle("no-labels", !A.labels);
}
function remember(id, p, v) {
  (S.params[id] ||= {})[p.key] = v;
  persist();
}
function ordered() {
  return S.order.map((id) => byId.get(id));
}
function card(t) {
  const tile = el("article", "tile");
  tile.dataset.id = t.id;
  const feature = t.id === "textReveal";
  const anchor = t.id === "anchor";
  if (feature || anchor || S.wide.includes(t.id)) tile.classList.add("wide");
  const row = feature ? el("div", "feature-main") : tile;
  if (feature) {
    tile.classList.add("feature");
    tile.append(row);
  }
  const run = button("", () => execute(t), "run");
  run.append(icon(t.icon), el("span", "lbl", t.title));
  run.title = t.help;
  run.setAttribute("aria-label", t.title);
  run.disabled = busy;
  row.append(run);
  if (anchor) {
    const grid = el("div", "anchor-block");
    const p = t.params[0];
    p.choices.forEach((label, i) => {
      const b = button(
        "",
        () => {
          remember(t.id, p, i);
          grid
            .querySelectorAll("button")
            .forEach((n, j) => n.setAttribute("aria-pressed", j === i));
          execute(t);
        },
        "",
      );
      b.title = "Move anchor · " + label;
      b.setAttribute("aria-label", b.title);
      b.setAttribute("aria-pressed", ToolState.param(t, p) === i);
      b.disabled = busy;
      grid.append(b);
    });
    row.append(grid);
  }
  row.append(
    glyphButton("sliders-horizontal", "Options for " + t.title, () =>
      options(t),
    ),
  );
  if (feature) {
    const strip = el("div", "timing");
    strip.append(
      el("span", "", "Layer in"),
      el("span", "line"),
      el("strong", "", "IN END · " + ToolState.param(t, t.params[0]) + "f"),
    );
    tile.append(strip);
  }
  return tile;
}
function render() {
  const target = $("groups");
  target.replaceChildren();
  const q = $("search").value.trim().toLowerCase();
  const tools = ordered().filter(
    (t) =>
      !S.hidden.includes(t.id) &&
      (!favoritesOnly || S.favorites.includes(t.id)) &&
      (!q ||
        (t.title + " " + t.category + " " + t.help).toLowerCase().includes(q)),
  );
  for (const cat of categories) {
    const group = tools.filter((t) => t.category === cat);
    if (!group.length) continue;
    const section = el("section", "group"),
      grid = el("div", "grid");
    section.append(el("h2", "", cat), grid);
    group.forEach((t) => grid.append(card(t)));
    target.append(section);
  }
  if (!tools.length)
    target.append(
      el(
        "p",
        "empty",
        q
          ? "No matching tools."
          : favoritesOnly
            ? "Star a tool in its options to add it here."
            : "Show tools in Customize layout.",
      ),
    );
  $("favorites").setAttribute("aria-pressed", favoritesOnly);
}
async function execute(t) {
  if (busy) return;
  busy = true;
  const buttons = document.querySelectorAll(".run,.anchor-block button");
  buttons.forEach((b) => (b.disabled = true));
  setStatus("Running " + t.title + "…");
  const params = (t.params || []).map((p) => ToolState.param(t, p));
  try {
    const [msg] = await AEBridge.run(t.id, params);
    setStatus(msg, "online");
    addLog(t.id, params, msg);
  } catch (e) {
    setStatus(e.message, "error");
    addLog(t.id, params, e.message);
    diagnostics(true);
  } finally {
    busy = false;
    buttons.forEach((b) => (b.disabled = false));
  }
}
function addLog(id, args, msg) {
  // Report only a bounded excerpt; file names/line numbers are supplied separately by JSX.
  const excerpt = String(msg)
    .replace(/(?:[A-Za-z]:[\\/]|\\\\)[^\r\n"<>|]+/g, "[local path]")
    .replace(/(?:file:\/\/\/|https?:\/\/)[^\s"'<>]+/gi, "[location]")
    .slice(0, 700);
  logs.push(
    [new Date().toISOString(), id, JSON.stringify(args), excerpt].join("  "),
  );
  logs = logs.slice(-12);
}
function openSheet(title) {
  if ($("sheet").hidden) returnTo = document.activeElement;
  $("sheetTitle").textContent = title;
  $("sheetBody").replaceChildren();
  $("sheet").hidden = false;
  for (const n of document.querySelectorAll(
    "body>header,body>main,body>footer",
  ))
    n.inert = true;
  $("close").focus();
  return $("sheetBody");
}
function closeSheet() {
  if ($("sheet").hidden) return;
  $("sheet").hidden = true;
  for (const n of document.querySelectorAll(
    "body>header,body>main,body>footer",
  ))
    n.inert = false;
  if (returnTo?.isConnected) returnTo.focus();
  else $("search").focus();
}
function choices(parent, label, items, value, onChange) {
  const wrap = el("div", "control");
  wrap.append(el("div", "sub", label));
  const group = el("div", "choice");
  items.forEach((name, i) => {
    const b = button(
      name,
      () => {
        group
          .querySelectorAll("button")
          .forEach((n, j) => n.setAttribute("aria-pressed", i === j));
        onChange(i);
      },
      "",
    );
    b.setAttribute("aria-pressed", i === value);
    group.append(b);
  });
  wrap.append(group);
  parent.append(wrap);
}
function slider(parent, label, min, max, value, change) {
  const wrap = el("div", "control"),
    row = el("div", "pair"),
    r = el("input"),
    n = el("input", "field");
  r.type = "range";
  n.type = "number";
  for (const i of [r, n]) {
    i.min = min;
    i.max = max;
    i.step = 1;
    i.value = value;
    i.setAttribute("aria-label", label + (i === n ? " exact value" : ""));
  }
  let current = value;
  function commit(v) {
    if (Number.isInteger(v) && v >= min && v <= max) {
      current = v;
      r.value = n.value = v;
      change(v);
    }
  }
  r.oninput = () => commit(r.valueAsNumber);
  n.oninput = () => commit(n.valueAsNumber);
  n.onblur = () => {
    n.value = current;
  };
  wrap.append(el("div", "sub", label), row);
  row.append(r, n);
  parent.append(wrap);
}
function checkbox(parent, label, checked, fn) {
  const row = el("label", "row");
  const c = el("input", "check");
  c.type = "checkbox";
  c.checked = checked;
  c.onchange = () => fn(c.checked);
  row.append(el("span", "", label), c);
  parent.append(row);
}
function options(t) {
  const body = openSheet(t.title);
  body.append(el("p", "hint", t.help));
  for (const p of t.params || []) {
    const change = (v) => {
      remember(t.id, p, v);
      render();
    };
    if (p.choices)
      choices(body, p.title, p.choices, ToolState.param(t, p), change);
    else slider(body, p.title, p.min, p.max, ToolState.param(t, p), change);
  }
  checkbox(body, "Favorite", S.favorites.includes(t.id), () => {
    toggle(S.favorites, t.id);
    persist();
    render();
  });
  const bar = el("div", "actions-bar");
  bar.append(
    button(
      "Run tool",
      () => {
        closeSheet();
        execute(t);
      },
      "primary",
    ),
  );
  body.append(bar);
}
function settings() {
  const body = openSheet("Settings");
  const preview = el("div", "preview"),
    sample = el("div", "tile"),
    face = el("div", "run");
  face.append(icon("key-round"), el("span", "lbl", "Trim to keys"));
  sample.append(face);
  preview.append(sample);
  body.append(preview);
  function change(k, v) {
    A[k] = v;
    appearance();
    persist();
  }
  choices(
    body,
    "Theme",
    ["Dark", "Light", "System"],
    ["Dark", "Light", "System"].indexOf(A.theme),
    (i) => change("theme", ["Dark", "Light", "System"][i]),
  );
  const modes = el("div", "actions-bar");
  for (const [name, values] of [
    ["Compact", { tile: 105, height: 33, gap: 3 }],
    ["Comfortable", { tile: 146, height: 48, gap: 7 }],
  ])
    modes.append(
      button(name, () => {
        Object.assign(A, values);
        appearance();
        persist();
        settings();
      }),
    );
  body.append(modes);
  const labels = {
    tile: "Minimum tile width",
    height: "Button height",
    gap: "Grid gap",
    round: "Corner radius",
    icon: "Icon size",
    font: "Text size",
  };
  for (const k of Object.keys(labels))
    slider(body, labels[k] + " (px)", ...ToolState.bounds[k], A[k], (v) =>
      change(k, v),
    );
  choices(
    body,
    "Typeface",
    ["System", "Arial", "Mono"],
    ["System", "Arial", "Mono"].indexOf(A.family),
    (i) => change("family", ["System", "Arial", "Mono"][i]),
  );
  const row = el("label", "row", "Accent color");
  const color = el("input");
  color.type = "color";
  color.value = A.accent;
  color.oninput = () => change("accent", color.value);
  row.append(color);
  body.append(row);
  checkbox(body, "Show button labels", A.labels, (v) => change("labels", v));
  checkbox(body, "Interface motion", A.motion, (v) => change("motion", v));
  const bar = el("div", "actions-bar");
  bar.append(
    button("Reset appearance", () => {
      Object.assign(A, ToolState.defaults);
      appearance();
      persist();
      settings();
    }),
    button("Diagnostics", () => diagnostics(false)),
  );
  body.append(
    bar,
    el("h3", "section-label", "About"),
    el("p", "about", "AE Tools 1.0 · Made by Nasaat"),
  );
}
function layout(focusId, focusAction) {
  const body = openSheet("Customize layout");
  let dragged = null;
  function move(id, target) {
    if (id === target || byId.get(id).category !== byId.get(target).category)
      return;
    const pos = S.order.indexOf(target);
    S.order.splice(S.order.indexOf(id), 1);
    S.order.splice(pos, 0, id);
    persist();
    render();
    layout(id, focusAction);
  }
  for (const category of categories) {
    const group = ordered().filter((t) => t.category === category);
    body.append(el("h3", "section-label", category));
    group.forEach((t, i) => {
      const row = el("div", "layout-row");
      row.draggable = true;
      row.ondragstart = () => {
        dragged = t.id;
        row.classList.add("dragging");
      };
      row.ondragend = () => row.classList.remove("dragging");
      row.ondragover = (e) => e.preventDefault();
      row.ondrop = (e) => {
        e.preventDefault();
        if (dragged) move(dragged, t.id);
      };
      const buttons = el("div", "actions");
      row.append(el("span", "", t.title), buttons);
      function control(action, glyph, fn, on, disabled = false) {
        const b = glyphButton(glyph, action + " · " + t.title, fn);
        b.dataset.action = action;
        b.dataset.tool = t.id;
        b.disabled = disabled;
        if (on !== undefined) b.setAttribute("aria-pressed", on);
        buttons.append(b);
      }
      for (const [action, glyph, key] of [
        ["Favorite", "star", "favorites"],
        ["Hide", "eye-off", "hidden"],
        ["Full width", "layout-grid", "wide"],
      ]) {
        if (key === "wide" && ["anchor", "textReveal"].includes(t.id)) continue;
        control(
          action,
          glyph,
          () => {
            toggle(S[key], t.id);
            persist();
            render();
            layout(t.id, action);
          },
          S[key].includes(t.id),
        );
      }
      control(
        "Earlier",
        "arrow-up",
        () => {
          focusAction = "Earlier";
          move(t.id, group[i - 1].id);
        },
        undefined,
        !i,
      );
      control(
        "Later",
        "arrow-down",
        () => {
          focusAction = "Later";
          move(t.id, group[i + 1].id);
        },
        undefined,
        i === group.length - 1,
      );
      body.append(row);
    });
  }
  if (focusId) {
    const b = [...body.querySelectorAll("button")].find(
      (n) =>
        n.dataset.tool === focusId &&
        n.dataset.action === focusAction &&
        !n.disabled,
    );
    if (b) b.focus();
  }
}
function diagnostics(error) {
  const body = openSheet(error ? "Command details" : "Diagnostics");
  if (error) body.append(el("p", "hint", statusMessage));
  const report =
    "AE Tools 1.0.0\n" +
    host +
    "\n" +
    (ToolState.error ? "Settings: " + ToolState.error + "\n" : "") +
    logs.join("\n");
  const field = el("textarea");
  field.readOnly = true;
  field.value = report;
  field.setAttribute("aria-label", "Diagnostic report");
  body.append(field);
  const ack = el("p", "sub");
  ack.setAttribute("role", "status");
  const bar = el("div", "actions-bar");
  bar.append(
    button("Copy report", () => {
      field.focus();
      field.select();
      ack.textContent = document.execCommand("copy")
        ? "Copied."
        : "Select and copy the report.";
    }),
    button("Save TXT", () => {
      try {
        const fs = window.cep?.fs;
        if (fs) {
          const file = fs.showSaveDialogEx(
            "Save diagnostic report",
            "",
            "txt".split(","),
            "AE-Tools-diagnostics.txt",
          );
          if (file.err || !file.data) return;
          const written = fs.writeFile(file.data, report);
          ack.textContent = written.err
            ? "Save failed (" + written.err + ")."
            : "Saved.";
        } else {
          const a = el("a");
          const url = URL.createObjectURL(
            new Blob([report], { type: "text/plain" }),
          );
          a.href = url;
          a.download = "AE-Tools-diagnostics.txt";
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          ack.textContent = "Download requested.";
        }
      } catch (e) {
        ack.textContent = e.message;
      }
    }),
  );
  body.append(bar, ack);
}
$("favorites").append(icon("star"));
$("favorites").onclick = () => {
  favoritesOnly = !favoritesOnly;
  render();
};
$("settings").append(icon("settings-2"));
$("settings").onclick = settings;
$("layout").append(icon("layout-grid"));
$("layout").onclick = () => layout();
$("close").append(icon("x"));
$("close").onclick = closeSheet;
$("search").oninput = render;
$("report").onclick = () => diagnostics(false);
document
  .querySelector("[data-icon=search]")
  .style.setProperty("--glyph", 'url("' + window.GLYPHS.search + '")');
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeSheet();
  if (e.key === "Tab" && !$("sheet").hidden) {
    const controls = [
      ...$("sheet").querySelectorAll("button:not(:disabled),input,textarea"),
    ];
    const first = controls[0],
      last = controls[controls.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});
matchMedia("(prefers-color-scheme:light)").addEventListener(
  "change",
  appearance,
);
appearance();
render();
if (!AEBridge.available) setStatus("Browser preview · After Effects offline");
else
  AEBridge.run("ping")
    .then((fields) => {
      host =
        "After Effects " +
        fields[1] +
        " · build " +
        fields[2] +
        " · " +
        fields[3];
      setStatus(ToolState.error || host, ToolState.error ? "error" : "online");
    })
    .catch((e) => {
      addLog("ping", [], e.message);
      setStatus(e.message, "error");
    });
