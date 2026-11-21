const { chromium } = require("playwright-core");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
(async () => {
  const browser = await chromium.launch(
    process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : { channel: "chrome" },
  );
  try {
    const p = await browser.newPage({ viewport: { width: 380, height: 560 } }),
      errors = [];
    p.on("pageerror", (e) => errors.push(String(e)));
    p.on("requestfailed", (r) => errors.push(r.url()));
    await p.goto(pathToFileURL(path.resolve("build/panel/index.html")).href);
    assert.equal(await p.locator("article").count(), 11);
    await p.screenshot({ path: "build/panel-dark.png" });
    await p
      .getByRole("button", { name: "Options for Marker text reveal" })
      .click();
    await p.getByRole("checkbox", { name: "Favorite" }).check();
    await p
      .getByRole("spinbutton", { name: "Intro duration (frames) exact value" })
      .fill("18");
    await p.keyboard.press("Escape");
    await p.getByRole("button", { name: "Show favorites" }).click();
    assert.equal(await p.locator("article").count(), 1);
    await p
      .getByRole("button", { name: "Marker text reveal", exact: true })
      .click();
    assert.match(
      await p.locator("textarea").inputValue(),
      /Open AE Tools in After Effects/,
    );
    await p.keyboard.press("Escape");
    await p.getByRole("button", { name: "Settings", exact: true }).click();
    await p.getByRole("button", { name: "Light", exact: true }).click();
    await p
      .getByRole("spinbutton", { name: "Grid gap (px) exact value" })
      .fill("0");
    await p.getByRole("checkbox", { name: "Show button labels" }).uncheck();
    await p.reload();
    assert.equal(await p.locator("body.light.no-labels").count(), 1);
    assert.equal(
      await p.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--gap"),
      ),
      "0px",
    );
    await p.getByRole("button", { name: "Customize layout" }).click();
    await p.getByRole("button", { name: "Hide · Sequence layers" }).click();
    await p
      .getByRole("button", { name: "Earlier · Trim to layer below" })
      .click();
    await p.keyboard.press("Escape");
    assert.equal(await p.locator('[data-id="sequence"]').count(), 0);
    assert.equal(
      await p
        .locator(".group")
        .filter({ has: p.getByRole("heading", { name: "Timeline" }) })
        .locator("article")
        .first()
        .getAttribute("data-id"),
      "trimBelow",
    );
    await p.getByRole("searchbox").fill("source");
    assert.ok(await p.locator("[data-id=sourceComp]").isVisible());
    await p.setViewportSize({ width: 210, height: 260 });
    await p.getByRole("button", { name: "Settings", exact: true }).click();
    await p.getByRole("button", { name: "Reset appearance" }).click();
    await p.locator("#sheetBody").evaluate((n) => (n.scrollTop = 0));
    await p.screenshot({ path: "build/panel-settings-narrow.png" });
    assert.equal(
      await p.evaluate(
        () =>
          document.body.scrollWidth > innerWidth ||
          document.getElementById("sheetBody").scrollWidth > innerWidth,
      ),
      false,
    );
    await p.keyboard.press("Escape");
    await p.evaluate(() => localStorage.clear());
    await p.reload();
    await p
      .getByRole("button", { name: "Options for Marker text reveal" })
      .click();
    await p.getByRole("button", { name: "Reverse reveal" }).click();
    assert.equal(
      await p
        .getByRole("button", { name: "Reverse reveal" })
        .getAttribute("aria-pressed"),
      "true",
    );
    assert.deepEqual(errors, []);
    console.log("Browser interactions passed at 380px and 210px.");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
