window.ToolState = (() => {
  const key = "com.nasaat.aetools.preferences.v1";
  const defaults = {
    theme: "Dark",
    accent: "#e8bd84",
    tile: 132,
    height: 43,
    gap: 5,
    round: 6,
    font: 13,
    icon: 18,
    labels: true,
    motion: true,
    family: "System",
  };
  const bounds = {
    tile: [84, 250],
    height: [30, 76],
    gap: [0, 16],
    round: [0, 18],
    font: [11, 18],
    icon: [14, 28],
  };
  const initial = () => ({
    version: 1,
    appearance: { ...defaults },
    order: CATALOG.map((t) => t.id),
    hidden: [],
    wide: [],
    favorites: [],
    params: {},
    revision: 0,
  });
  let error = "",
    blocked = false;
  function read() {
    try {
      const s = initial(),
        raw = localStorage.getItem(key);
      if (!raw) return s;
      const x = JSON.parse(raw);
      if (x.version !== 1) throw Error("Unsupported settings version.");
      const ids = new Set(s.order),
        list = (a) => [
          ...new Set((Array.isArray(a) ? a : []).filter((id) => ids.has(id))),
        ];
      for (const k of ["hidden", "wide", "favorites"]) s[k] = list(x[k]);
      s.order = [...new Set([...list(x.order), ...s.order])];
      s.revision = Number.isSafeInteger(x.revision) ? x.revision : 0;
      const a = x.appearance || {};
      for (const k of Object.keys(bounds))
        if (Number.isInteger(a[k]))
          s.appearance[k] = Math.max(
            bounds[k][0],
            Math.min(bounds[k][1], a[k]),
          );
      for (const k of ["labels", "motion"])
        if (typeof a[k] === "boolean") s.appearance[k] = a[k];
      if (["Dark", "Light", "System"].includes(a.theme))
        s.appearance.theme = a.theme;
      if (["System", "Arial", "Mono"].includes(a.family))
        s.appearance.family = a.family;
      if (/^#[0-9a-f]{6}$/i.test(a.accent)) s.appearance.accent = a.accent;
      for (const t of CATALOG)
        for (const p of t.params || []) {
          const v = x.params?.[t.id]?.[p.key];
          if (valid(p, v)) (s.params[t.id] ||= {})[p.key] = v;
        }
      return s;
    } catch (e) {
      error = "Settings could not be loaded: " + e.message;
      blocked = true;
      return initial();
    }
  }
  function valid(p, v) {
    return (
      Number.isInteger(v) &&
      v >= (p.min ?? 0) &&
      v <= (p.max ?? p.choices.length - 1)
    );
  }
  const data = read();
  function save() {
    try {
      if (blocked)
        throw Error(
          "Stored settings need review. This session retains your edits.",
        );
      const raw = localStorage.getItem(key),
        previous = raw ? JSON.parse(raw) : null;
      if ((previous?.revision ?? 0) !== data.revision)
        throw Error("Settings changed in another panel. Reopen to load them.");
      const next = { ...data, revision: data.revision + 1 };
      localStorage.setItem(key, JSON.stringify(next));
      data.revision = next.revision;
      error = "";
    } catch (e) {
      error = e.message;
    }
    return error;
  }
  function param(t, p) {
    return data.params[t.id]?.[p.key] ?? p.default;
  }
  return {
    data,
    defaults,
    bounds,
    valid,
    save,
    param,
    get error() {
      return error;
    },
  };
})();
