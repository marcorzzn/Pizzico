#!/usr/bin/env node
// Pizzico — scripts/verify-apk.mjs
// Riferimento: docs/audit/release-process.md
// Licenza: MIT OR Apache-2.0
//
// Smoke test di un APK, senza toolchain Android: legge lo ZIP con Node,
// decodifica l'AndroidManifest.xml binario e confronta i metadati con
// tauri.conf.json. Verifica anche che il bundle web incorporato nella
// libreria nativa corrisponda a quello appena buildato in apps/web/dist.
//
// Uso:
//   node scripts/verify-apk.mjs <apk> [--config <tauri.conf.json>]
//       [--dist apps/web/dist] [--skip-bundle]
//       [--expect-version X.Y.Z] [--expect-package <id>]

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { inflateRawSync } from "node:zlib";

function fail(message) {
  console.error(`errore: ${message}`);
  process.exit(1);
}

// --- argomenti -------------------------------------------------------------

const args = process.argv.slice(2);
const options = {
  apk: undefined,
  config: "apps/tauri/tauri.conf.json",
  dist: "apps/web/dist",
  skipBundle: false,
  expectVersion: undefined,
  expectPackage: undefined,
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  switch (arg) {
    case "--config":
      options.config = args[++i];
      break;
    case "--dist":
      options.dist = args[++i];
      break;
    case "--skip-bundle":
      options.skipBundle = true;
      break;
    case "--expect-version":
      options.expectVersion = args[++i];
      break;
    case "--expect-package":
      options.expectPackage = args[++i];
      break;
    default:
      if (arg.startsWith("--")) fail(`opzione sconosciuta: ${arg}`);
      if (options.apk) fail("specifica un solo APK");
      options.apk = arg;
  }
}

if (!options.apk) {
  fail("uso: node scripts/verify-apk.mjs <apk> [--config ...] [--dist ...] [--skip-bundle]");
}

// --- lettura ZIP -----------------------------------------------------------
// Implementazione minimale: central directory + inflate. Gli APK di Pizzico
// stanno sotto i 4 GiB e sotto i 65535 entry, quindi niente ZIP64.

function readZip(buf) {
  let eocd = -1;
  const stop = Math.max(0, buf.length - 66_000);
  for (let i = buf.length - 22; i >= stop; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) fail("APK non è uno ZIP valido: EOCD non trovato");

  const entryCount = buf.readUInt16LE(eocd + 10);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  if (cdOffset === 0xffffffff) fail("APK ZIP64 non supportato da questo smoke test");

  const entries = new Map();
  let p = cdOffset;
  for (let i = 0; i < entryCount; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) fail(`central directory corrotta all'entry ${i}`);
    const method = buf.readUInt16LE(p + 10);
    const compressedSize = buf.readUInt32LE(p + 20);
    const uncompressedSize = buf.readUInt32LE(p + 24);
    const nameLength = buf.readUInt16LE(p + 28);
    const extraLength = buf.readUInt16LE(p + 30);
    const commentLength = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLength);
    entries.set(name, { method, compressedSize, uncompressedSize, localOffset });
    p += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function readEntry(buf, entry) {
  const local = entry.localOffset;
  if (buf.readUInt32LE(local) !== 0x04034b50) fail("local header ZIP corrotto");
  const nameLength = buf.readUInt16LE(local + 26);
  const extraLength = buf.readUInt16LE(local + 28);
  const start = local + 30 + nameLength + extraLength;
  const raw = buf.subarray(start, start + entry.compressedSize);

  if (entry.method === 0) return raw;
  if (entry.method === 8) {
    try {
      return inflateRawSync(raw);
    } catch (error) {
      fail(`decompressione fallita: ${error.message}`);
    }
  }
  fail(`metodo di compressione non supportato: ${entry.method}`);
}

// --- AndroidManifest.xml (binario) ----------------------------------------

function parseStringPool(buf, pos) {
  const headerSize = buf.readUInt16LE(pos + 2);
  const stringCount = buf.readUInt32LE(pos + 8);
  const flags = buf.readUInt32LE(pos + 16);
  const stringsStart = buf.readUInt32LE(pos + 20);
  const utf8 = (flags & 0x100) !== 0;

  const offsets = [];
  for (let i = 0; i < stringCount; i++) offsets.push(buf.readUInt32LE(pos + headerSize + i * 4));

  return offsets.map((offset) => {
    let p = pos + stringsStart + offset;
    if (utf8) {
      let length = buf[p];
      if (length & 0x80) {
        length = ((length & 0x7f) << 8) | buf[p + 1];
        p += 2;
      } else {
        p += 1;
      }
      return buf.toString("utf8", p, p + length);
    }
    const length = buf.readUInt16LE(p);
    p += 2;
    return buf.toString("utf16le", p, p + length * 2);
  });
}

function parseAxml(buf) {
  if (buf.readUInt32LE(0) !== 0x00080003) fail("AndroidManifest.xml non è AXML");

  let strings = [];
  let resMap = [];
  const elements = [];
  let pos = 8;

  while (pos + 8 <= buf.length) {
    const type = buf.readUInt16LE(pos);
    const headerSize = buf.readUInt16LE(pos + 2);
    const size = buf.readUInt32LE(pos + 4);
    if (size === 0) break;

    if (type === 0x0001) {
      strings = parseStringPool(buf, pos);
    } else if (type === 0x0180) {
      const count = (size - headerSize) / 4;
      resMap = [];
      for (let i = 0; i < count; i++) resMap.push(buf.readUInt32LE(pos + headerSize + i * 4));
    } else if (type === 0x0102) {
      const ext = pos + headerSize;
      const nameIndex = buf.readUInt32LE(ext + 4);
      const attrStart = buf.readUInt16LE(ext + 8);
      const attrSize = buf.readUInt16LE(ext + 10);
      const attrCount = buf.readUInt16LE(ext + 12);

      const attrs = [];
      for (let i = 0; i < attrCount; i++) {
        const p = ext + attrStart + i * attrSize;
        const nameIdx = buf.readUInt32LE(p + 4);
        const rawValue = buf.readUInt32LE(p + 8);
        const dataType = buf[p + 15];
        const data = buf.readUInt32LE(p + 16);
        attrs.push({
          name: strings[nameIdx],
          raw: rawValue,
          dataType,
          data,
          resourceId: nameIdx < resMap.length ? resMap[nameIdx] : 0,
        });
      }
      elements.push({ name: strings[nameIndex], attrs });
    }
    pos += size;
  }
  return { elements, strings };
}

function stringValue(strings, attr) {
  if (!attr) return undefined;
  if (attr.dataType === 0x03) return strings[attr.data];
  if (attr.dataType === 0x10) return attr.data;
  if (attr.dataType === 0x12) return attr.data !== 0;
  return undefined;
}

// --- versionCode -----------------------------------------------------------

function versionCodeFromVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) fail(`versione non SemVer: "${version}"`);
  const [, major, minor, patch] = match.map(Number);
  return major * 1_000_000 + minor * 1_000 + patch;
}

// --- main ------------------------------------------------------------------

const apkPath = resolve(options.apk);
const configPath = resolve(options.config);
const distPath = resolve(options.dist);

const apk = readFileSync(apkPath);
const entries = readZip(apk);

const config = JSON.parse(readFileSync(configPath, "utf8"));
const expected = {
  version: options.expectVersion ?? config.version,
  package: options.expectPackage ?? config.identifier,
  versionCode: config.bundle?.android?.versionCode ?? versionCodeFromVersion(config.version),
};

const manifestEntry = entries.get("AndroidManifest.xml");
if (!manifestEntry) fail("AndroidManifest.xml assente nell'APK");

const manifestBuf = readEntry(apk, manifestEntry);
const { elements, strings } = parseAxml(manifestBuf);
const manifest = elements.find((element) => element.name === "manifest");
if (!manifest) fail("elemento <manifest> non trovato");

const attr = (element, name) => element.attrs.find((candidate) => candidate.name === name);
const manifestPackage = stringValue(strings, attr(manifest, "package"));
const manifestVersionName = stringValue(strings, attr(manifest, "versionName"));
const manifestVersionCode = stringValue(strings, attr(manifest, "versionCode"));

console.log(`APK: ${apkPath}`);
console.log(`  package:     ${manifestPackage}`);
console.log(`  versionName: ${manifestVersionName}`);
console.log(`  versionCode: ${manifestVersionCode}`);
console.log(`atteso: package=${expected.package} version=${expected.version} versionCode=${expected.versionCode}`);

const problems = [];
if (manifestPackage !== expected.package) {
  problems.push(`package "${manifestPackage}" != "${expected.package}"`);
}
if (String(manifestVersionName) !== String(expected.version)) {
  problems.push(`versionName "${manifestVersionName}" != "${expected.version}"`);
}
if (Number(manifestVersionCode) !== Number(expected.versionCode)) {
  problems.push(`versionCode ${manifestVersionCode} != ${expected.versionCode}`);
}

// assets/tauri.conf.json: seconda copia dei metadati, scritta da Tauri.
const embeddedConfigEntry = entries.get("assets/tauri.conf.json");
if (embeddedConfigEntry) {
  const embedded = JSON.parse(readEntry(apk, embeddedConfigEntry).toString("utf8"));
  if (embedded.version !== expected.version) {
    problems.push(`assets/tauri.conf.json version "${embedded.version}" != "${expected.version}"`);
  }
  if (embedded.identifier !== expected.package) {
    problems.push(
      `assets/tauri.conf.json identifier "${embedded.identifier}" != "${expected.package}"`,
    );
  }
} else {
  problems.push("assets/tauri.conf.json assente nell'APK");
}

// Bundle web incorporato nella libreria nativa.
if (!options.skipBundle) {
  const distAssetsPath = join(distPath, "assets");
  let distFiles;
  try {
    if (!statSync(distAssetsPath).isDirectory()) throw new Error("non è una directory");
    distFiles = readdirSync(distAssetsPath).filter((name) => /\.(js|css|wasm)$/.test(name));
  } catch {
    fail(`dist non trovato: ${distAssetsPath} (esegui prima la build del frontend)`);
  }

  const soName = [...entries.keys()].find((name) => /^lib\/[^/]+\/libpizzico_tauri\.so$/.test(name));
  if (!soName) fail("libpizzico_tauri.so assente nell'APK");

  const soText = readEntry(apk, entries.get(soName)).toString("latin1");
  const embeddedAssets = new Set();
  for (const match of soText.matchAll(/assets\/([A-Za-z0-9_.-]+\.(?:js|css|wasm))/g)) {
    embeddedAssets.add(match[1]);
  }

  const distSet = new Set(distFiles);
  const missing = [...distSet].filter((name) => !embeddedAssets.has(name));
  const extra = [...embeddedAssets].filter((name) => !distSet.has(name));

  console.log(`bundle (${soName}):`);
  console.log(`  dist:     ${[...distSet].sort().join(", ") || "(vuoto)"}`);
  console.log(`  nell'APK: ${[...embeddedAssets].sort().join(", ") || "(vuoto)"}`);

  if (missing.length > 0) problems.push(`asset mancanti nell'APK: ${missing.join(", ")}`);
  if (extra.length > 0) problems.push(`asset inattesi nell'APK: ${extra.join(", ")}`);
  if (distSet.size === 0) problems.push("dist/assets non contiene js/css/wasm");
}

if (problems.length > 0) {
  console.error("\nSMOKE TEST FALLITO:");
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log("\nSMOKE TEST SUPERATO");
