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
let browser;
try {
  browser = await chromium.launch({ headless: true });
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
