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

import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
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
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

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
