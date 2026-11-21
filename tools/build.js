const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const acorn = require("acorn");

const root = path.resolve(__dirname, "..");
const dest = path.join(root, "build/panel");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const hash = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

function checkES3(code, file) {
  try {
    acorn.parse(code, {
      ecmaVersion: 3,
      sourceType: "script",
      allowReserved: "never",
    });
  } catch (e) {
    throw new Error(file + ": " + e.message);
  }
}
function build() {
  const catalog = JSON.parse(read("panel/catalog.json"));
  const meta = {};
  for (const tool of catalog) {
    if (!/^[a-z][a-zA-Z0-9]*$/.test(tool.id) || Object.hasOwn(meta, tool.id))
      throw Error("Invalid ID " + tool.id);
    if (!fs.existsSync(path.join(root, "panel/icons", tool.icon + ".svg")))
      throw Error("Missing icon " + tool.icon);
    meta[tool.id] = {
      title: tool.title,
      params: (tool.params || []).map((p) =>
        p.choices ? [0, p.choices.length - 1] : [p.min, p.max],
      ),
    };
  }
  const modules = fs
    .readdirSync(path.join(root, "host/modules"))
    .filter((x) => x.endsWith(".jsx"))
    .sort()
    .map((name) => read("host/modules/" + name))
    .join("\n");
  const expr = read("host/expressions/reveal.js");
  const jsx = read("host/core.jsx")
    .replace(
      "/* GENERATED_CATALOG */",
      () =>
        "var catalog = " +
        JSON.stringify(meta) +
        ";\nvar revealExpression = " +
        JSON.stringify(expr) +
        ";",
    )
    .replace("/* REGISTER_MODULES */", () => modules);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(path.join(root, "panel"), dest, { recursive: true });
  fs.copyFileSync(path.join(root, "LICENSE"), path.join(dest, "LICENSE.txt"));
  fs.writeFileSync(path.join(dest, "host.jsx"), "\uFEFF" + jsx);
  // CSS mask images loaded from file:// are subject to Chromium CORS.
  // Keep original SVGs editable and embed their exact bytes in the offline build.
  const icons = {};
  for (const file of fs
    .readdirSync(path.join(root, "panel/icons"))
    .filter((x) => x.endsWith(".svg"))) {
    icons[path.basename(file, ".svg")] =
      "data:image/svg+xml;base64," +
      fs.readFileSync(path.join(root, "panel/icons", file)).toString("base64");
  }
  fs.writeFileSync(
    path.join(dest, "catalog.js"),
    "window.CATALOG = " +
      JSON.stringify(catalog) +
      ";\nwindow.GLYPHS = " +
      JSON.stringify(icons) +
      ";\n",
  );
  const shipped = fs.readFileSync(path.join(dest, "host.jsx"));
  checkES3(shipped.toString(), "build/panel/host.jsx");
  console.log(
    "Host ES3 · Acorn " +
      acorn.version +
      " · script / allowReserved=never · SHA256 " +
      hash(shipped),
  );
}
module.exports = { build, checkES3 };
if (require.main === module) build();
