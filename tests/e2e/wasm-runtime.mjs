#!/usr/bin/env node
// Pizzico — tests/e2e/wasm-runtime.mjs
// Riferimento: docs/audit/release-process.md
// Licenza: MIT OR Apache-2.0
//
// Gate runtime: carica l'app web buildata con la STESSA CSP che Tauri inietta
// nella WebView Android, aspetta l'inizializzazione del WASM e fallisce se
// l'engine non parte. Non sostituisce il test su device: verifica che il
// binario compili ed esegua sotto la policy reale, cosa che il controllo degli
// hash non può fare.
//
// Richiede Playwright (installato dal workflow in una directory isolata) e un
// Chromium headless. Uso:
//   PLAYWRIGHT_MODULE=/path/to/node_modules/playwright node tests/e2e/wasm-runtime.mjs
//
// Per una verifica locale con un browser di sistema (senza scaricare Chromium):
//   PLAYWRIGHT_MODULE=/path/to/playwright-core PLAYWRIGHT_CHANNEL=chrome node tests/e2e/wasm-runtime.mjs

import { copyFile, mkdtemp, readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const DIST = join(ROOT, "apps/web/dist");
const CONFIG = join(ROOT, "apps/tauri/tauri.conf.json");
const require = createRequire(import.meta.url);

function fail(message) {
  console.error(`\nerrore: ${message}`);
  process.exit(1);
}

const config = JSON.parse(await readFile(CONFIG, "utf8"));
const csp = config.app?.security?.csp;

if (!csp) {
  fail("apps/tauri/tauri.conf.json non definisce app.security.csp");
}
if (!csp.includes("'wasm-unsafe-eval'")) {
  fail(
    "la CSP di Tauri non contiene 'wasm-unsafe-eval': WebAssembly verrebbe " +
      "bloccato nella WebView Android (è il bug di v0.1.2).",
  );
}

try {
  await stat(join(DIST, "index.html"));
} catch {
  fail(`dist mancante in ${DIST}: esegui prima la build del frontend`);
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".wasm": "application/wasm",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".psd": "application/octet-stream",
  ".map": "application/json",
  ".webmanifest": "application/manifest+json",
};

function contentType(path) {
  return MIME[extname(path).toLowerCase()] ?? "application/octet-stream";
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith("/")) pathname += "index.html";

    let file = resolve(join(DIST, `.${pathname}`));
    if (file !== DIST && !file.startsWith(DIST + sep)) {
      response.writeHead(403);
      response.end("forbidden");
      return;
    }

    try {
      await stat(file);
    } catch {
      // SPA fallback: percorsi sconosciuti tornano index.html.
      file = join(DIST, "index.html");
    }

    const body = await readFile(file);
    response.writeHead(200, {
      "Content-Type": contentType(file),
      "Content-Security-Policy": csp,
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cache-Control": "no-store",
      "Content-Length": body.length,
    });
    response.end(body);
  } catch (error) {
    response.writeHead(500, { "Content-Type": "text/plain" });
    response.end(String(error));
  }
});

await new Promise((ready) => server.listen(0, "127.0.0.1", ready));
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}/`;

let playwright;
try {
  playwright = require(process.env.PLAYWRIGHT_MODULE || "playwright");
} catch (error) {
  fail(
    `Playwright non trovato (${error.message}). In CI viene installato in ` +
      "una directory isolata e passato con PLAYWRIGHT_MODULE.",
  );
}

const { chromium } = playwright;
const launchOptions = { headless: true };
if (process.env.PLAYWRIGHT_CHANNEL) {
  launchOptions.channel = process.env.PLAYWRIGHT_CHANNEL;
}
let browser;
try {
  browser = await chromium.launch(launchOptions);
} catch (error) {
  fail(`avvio di Chromium fallito: ${error.message}`);
}

const problems = [];
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
});
const page = await context.newPage();

page.on("console", (message) => {
  if (message.type() === "error") {
    problems.push(`console.error: ${message.text()}`);
  }
});
page.on("pageerror", (error) => {
  problems.push(`pageerror: ${error.message}`);
});
page.on("requestfailed", (request) => {
  if (/\.wasm(\?|$)/.test(request.url())) {
    problems.push(`requestfailed: ${request.url()} — ${request.failure()?.errorText ?? ""}`);
  }
});

try {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });

  await page.waitForFunction(
    () => {
      const badge = document.getElementById("wasm-result");
      return (
        !!badge &&
        (badge.textContent.includes("WASM Rust v") ||
          badge.textContent.includes("Errore caricamento WASM"))
      );
    },
    null,
    { timeout: 60_000 },
  );

  const badge = ((await page.textContent("#wasm-result")) ?? "").trim();
  if (badge.includes("Errore caricamento WASM")) {
    throw new Error(`l'app riporta "${badge}"`);
  }

  const canvas = await page.evaluate(() => {
    const element = document.querySelector("#pizzico-canvas");
    if (!element) return null;
    const box = element.getBoundingClientRect();
    return { width: box.width, height: box.height };
  });
  if (!canvas || canvas.width <= 0 || canvas.height <= 0) {
    throw new Error("canvas #pizzico-canvas assente o senza dimensioni");
  }

  // ── Gate 3: pannello parametri generato dal catalogo degli strumenti ─────
  // Legge il DOM generato e confronta numero e tipo di controlli con lo schema:
  // tre slider per la gomma (senza colore), tre slider più il colore per il
  // pennello. Non guarda gli slider "a occhio".
  const readToolPanel = () =>
    page.$eval("#tool-param-panel", (panel) => ({
      toolId: panel.dataset.toolId ?? null,
      kinds: [...panel.querySelectorAll("[data-param-kind]")].map(
        (element) => element.dataset.paramKind,
      ),
      ranges: [...panel.querySelectorAll('input[type="range"]')].map((input) => input.value),
      colors: panel.querySelectorAll('input[type="color"]').length,
    }));

  await page.keyboard.press("b");
  await page.waitForFunction(
    () => document.querySelector("#tool-param-panel")?.dataset.toolId === "brush",
    null,
    { timeout: 15_000 },
  );
  const brushPanel = await readToolPanel();
  if (JSON.stringify(brushPanel.kinds) !== JSON.stringify(["integer", "integer", "integer", "color"])) {
    throw new Error(`pennello: tipi dei parametri inattesi ${JSON.stringify(brushPanel.kinds)}`);
  }
  if (brushPanel.colors !== 1) {
    throw new Error(`pennello: ${brushPanel.colors} color picker, atteso 1`);
  }
  if (JSON.stringify(brushPanel.ranges) !== JSON.stringify(["20", "80", "100"])) {
    throw new Error(`pennello: valori iniziali ${JSON.stringify(brushPanel.ranges)}`);
  }

  await page.keyboard.press("e");
  await page.waitForFunction(
    () => document.querySelector("#tool-param-panel")?.dataset.toolId === "eraser",
    null,
    { timeout: 15_000 },
  );
  const eraserPanel = await readToolPanel();
  if (eraserPanel.kinds.length !== 3 || eraserPanel.kinds.some((kind) => kind !== "integer")) {
    throw new Error(`gomma: tipi dei parametri inattesi ${JSON.stringify(eraserPanel.kinds)}`);
  }
  if (eraserPanel.colors !== 0) {
    throw new Error(`gomma: ${eraserPanel.colors} color picker, atteso 0`);
  }
  if (eraserPanel.ranges.length !== 3) {
    throw new Error(`gomma: ${eraserPanel.ranges.length} slider, attesi 3`);
  }

  console.log(
    `  pannello pennello: ${brushPanel.kinds.length} controlli (${brushPanel.ranges.join(", ")}), ${brushPanel.colors} color picker`,
  );
  console.log(
    `  pannello gomma:    ${eraserPanel.kinds.length} controlli, ${eraserPanel.colors} color picker`,
  );

  // I valori sono per strumento: il raggio impostato sul pennello deve
  // sopravvivere a un giro pennello → gomma → pennello.
  await page.keyboard.press("b");
  await page.waitForFunction(
    () => document.querySelector("#tool-param-panel")?.dataset.toolId === "brush",
    null,
    { timeout: 15_000 },
  );
  await page.$eval("#tool-param-size", (input) => {
    input.value = "42";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  await page.keyboard.press("e");
  await page.waitForFunction(
    () => document.querySelector("#tool-param-panel")?.dataset.toolId === "eraser",
    null,
    { timeout: 15_000 },
  );
  await page.keyboard.press("b");
  await page.waitForFunction(
    () => document.querySelector("#tool-param-panel")?.dataset.toolId === "brush",
    null,
    { timeout: 15_000 },
  );

  const persisted = await page.$eval("#tool-param-size", (input) => input.value);
  if (persisted !== "42") {
    throw new Error(`pennello: raggio ${persisted} dopo il cambio strumento, atteso 42`);
  }

  // Riporta il raggio al default per il tratto touch che segue.
  await page.$eval("#tool-param-size", (input) => {
    input.value = "20";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  // Il tratto touch più sotto usa il pennello: ripristinalo.
  await page.keyboard.press("b");

  // ── Import PSD dalla UI: menu File → Apri PSD… → file chooser ────────────
  // Uso un nome distinto dal sample di boot per non confondere i toast.
  const fixtureDir = await mkdtemp(join(tmpdir(), "pizzico-e2e-"));
  const fixture = join(fixtureDir, "e2e-import.psd");
  await copyFile(join(ROOT, "apps/web/public/sample-01.psd"), fixture);

  const chooserPromise = page.waitForEvent("filechooser", { timeout: 15_000 });
  await page.tap('.pz-menu-btn:has-text("File")');
  await page.tap("#open-psd-btn");
  const chooser = await chooserPromise;
  await chooser.setFiles(fixture);

  await page.waitForFunction(
    (name) =>
      [...document.querySelectorAll(".pz-toast")].some((toast) =>
        (toast.textContent ?? "").includes(name),
      ),
    "e2e-import.psd",
    { timeout: 45_000 },
  );

  // ── Tratto touch sul canvas (CDP: touchStart/Move/End reali) ────────────
  const touchAction = await page.$eval("#pizzico-canvas", (element) =>
    getComputedStyle(element).touchAction,
  );
  if (touchAction !== "none") {
    throw new Error(`canvas touch-action = "${touchAction}", atteso "none"`);
  }

  const canvasHandle = await page.$("#pizzico-canvas");
  const box = await canvasHandle.boundingBox();
  if (!box) throw new Error("canvas senza bounding box");

  const viewport = page.viewportSize();
  const centerX = Math.min(viewport.width - 40, Math.max(40, box.x + box.width / 2));
  const centerY = Math.min(viewport.height - 40, Math.max(40, box.y + box.height / 2));
  const startX = centerX - 30;
  const endX = centerX + 30;

  const cdp = await page.context().newCDPSession(page);
  const point = (x) => [{ x, y: centerY, id: 1, radiusX: 4, radiusY: 4, force: 1 }];

  const undoBefore = await page.$eval("#undo-btn", (button) => button.disabled);
  if (!undoBefore) {
    throw new Error("undo già abilitato prima del tratto: il test non può attribuirlo al touch");
  }

  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: point(startX) });
  for (let step = 1; step <= 5; step++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: point(startX + ((endX - startX) * step) / 5),
    });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

  await page.waitForTimeout(500);
  const undoAfter = await page.$eval("#undo-btn", (button) => button.disabled);
  if (undoAfter) {
    throw new Error("il tratto touch non ha prodotto storia (undo ancora disabilitato)");
  }

  // Lascia emergere eventuali errori asincroni di boot (autosave, sample).
  await page.waitForTimeout(1_000);

  if (problems.length > 0) {
    throw new Error(`errori in console:\n  - ${problems.join("\n  - ")}`);
  }

  console.log(`SMOKE RUNTIME SUPERATO`);
  console.log(`  badge:  ${badge}`);
  console.log(`  canvas: ${canvas.width}x${canvas.height}`);
  console.log(`  CSP:    ${csp}`);
} catch (error) {
  console.error(`\nSMOKE RUNTIME FALLITO: ${error.message}`);
  if (problems.length > 0) {
    for (const problem of problems) console.error(`  - ${problem}`);
  }
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
