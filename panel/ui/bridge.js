/* Only an allowlisted command ID and validated integers cross into JSX. */
window.AEBridge = (() => {
  const runtime = window.__adobe_cep__;
  const ids = new Set(["ping", ...window.CATALOG.map((t) => t.id)]);
  async function run(id, args = []) {
    if (!runtime)
      throw Error("Open AE Tools in After Effects to run this command.");
    if (!ids.has(id) || !args.every((x) => Number.isSafeInteger(x) && x >= 0))
      throw Error("Invalid command or parameter.");
    const payload = "AETools.run('" + id + "','" + args.join(",") + "')";
    return new Promise((resolve, reject) => {
      runtime.evalScript(payload, (raw) => {
        try {
          const fields = String(raw).split("|").map(decodeURIComponent);
          if (fields[0] === "ok") return resolve(fields.slice(1));
          if (fields[0] !== "error")
            throw Error(
              "Host acknowledgement unavailable. Inspect the project before retrying.",
            );
          const [message, line, file, attempt, cleanup] = fields.slice(1);
          const where =
            file || line ? " [" + (file || "host.jsx") + ":" + line + "]" : "";
          throw Error(
            message +
              where +
              (+attempt ? " Inspect changes; one Undo group was opened." : "") +
              (cleanup ? " Undo cleanup: " + cleanup : ""),
          );
        } catch (e) {
          reject(e);
        }
      });
    });
  }
  return { available: !!runtime, run };
})();
