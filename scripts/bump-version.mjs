#!/usr/bin/env node
// Pizzico — scripts/bump-version.mjs
// Riferimento: docs/audit/release-process.md
// Licenza: MIT OR Apache-2.0
//
// Allinea in un colpo solo tutte le copie della versione di release:
//   - package.json (root)
//   - apps/web/package.json
//   - apps/tauri/tauri.conf.json  (+ bundle.android.versionCode)
//   - Cargo.toml                  ([workspace.package])
//   - apps/tauri/Cargo.toml       ([package])
//   - CHANGELOG.md                (nuova sezione)
// e aggiorna i due Cargo.lock con `cargo update --workspace`.
//
// Uso:
//   node scripts/bump-version.mjs 0.1.2
//   node scripts/bump-version.mjs 0.1.2 --dry-run
//
// Il tag `v<versione>` è la fonte di verità della release: il workflow
// `.github/workflows/android-apk.yml` fallisce se non coincide con
// `apps/tauri/tauri.conf.json`.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const PATHS = {
  rootPackage: join(ROOT, "package.json"),
  webPackage: join(ROOT, "apps/web/package.json"),
  tauriConfig: join(ROOT, "apps/tauri/tauri.conf.json"),
  workspaceCargo: join(ROOT, "Cargo.toml"),
  tauriCargo: join(ROOT, "apps/tauri/Cargo.toml"),
  changelog: join(ROOT, "CHANGELOG.md"),
};

function fail(message) {
  console.error(`errore: ${message}`);
  process.exit(1);
}

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const version = argv.find((arg) => !arg.startsWith("--"));

if (!version) fail("uso: node scripts/bump-version.mjs <x.y.z> [--dry-run]");
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  fail(`versione non valida: "${version}" (atteso SemVer x.y.z, senza prefisso v)`);
}

const [major, minor, patch] = version.split(".").map(Number);
const versionCode = major * 1_000_000 + minor * 1_000 + patch;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function parseSemver(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value);
  if (!match) fail(`versione corrente non SemVer in un file del repo: "${value}"`);
  return match.slice(1).map(Number);
}

function compareSemver(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

// --- 1. Legge lo stato attuale e verifica che non ci sia già deriva -------

const config = readJson(PATHS.tauriConfig);
const rootPackage = readJson(PATHS.rootPackage);
const webPackage = readJson(PATHS.webPackage);

const current = config.version;
if (!/^\d+\.\d+\.\d+$/.test(current)) {
  fail(`apps/tauri/tauri.conf.json ha una versione non SemVer: "${current}"`);
}

const drifted = [
  ["package.json", rootPackage.version],
  ["apps/web/package.json", webPackage.version],
].filter(([, value]) => value !== current);

if (drifted.length > 0) {
  fail(
    `i file sono già disallineati rispetto a tauri.conf.json (${current}): ` +
      drifted.map(([file, value]) => `${file}=${value}`).join(", ") +
      ". Allineali a mano prima del bump.",
  );
}

if (compareSemver(parseSemver(version), parseSemver(current)) <= 0) {
  fail(`la nuova versione ${version} deve essere maggiore della corrente ${current}`);
}

// Un tag già esistente rende la release ambigua: rifiuta prima di scrivere.
let tagExists = false;
try {
  execFileSync("git", ["rev-parse", "--quiet", "--verify", `refs/tags/v${version}`], {
    cwd: ROOT,
    stdio: "ignore",
  });
  tagExists = true;
} catch (error) {
  // 1 = ref assente, 128 = non è un repository git: entrambi non bloccano.
  if (error.status !== 1 && error.status !== 128) throw error;
}
if (tagExists) fail(`il tag v${version} esiste già: scegli una versione nuova`);

// --- 2. Prepara le modifiche (nessuna scrittura in dry-run) ---------------

const nextConfig = {
  ...config,
  version,
  bundle: {
    ...config.bundle,
    android: {
      ...(config.bundle?.android ?? {}),
      versionCode,
    },
  },
};

function replaceCargoVersion(source, section, file) {
  const start = source.indexOf(section);
  if (start === -1) fail(`${file}: sezione ${section} non trovata`);

  const end = source.indexOf("\n[", start + section.length);
  const blockEnd = end === -1 ? source.length : end;
  const block = source.slice(start, blockEnd);
  const updated = block.replace(/^version = "[^"]+"/m, `version = "${version}"`);

  if (updated === block) fail(`${file}: riga "version = ..." non trovata in ${section}`);
  return source.slice(0, start) + updated + source.slice(blockEnd);
}

const workspaceCargo = readFileSync(PATHS.workspaceCargo, "utf8");
const tauriCargo = readFileSync(PATHS.tauriCargo, "utf8");

const nextWorkspaceCargo = replaceCargoVersion(
  workspaceCargo,
  "[workspace.package]",
  "Cargo.toml",
);
const nextTauriCargo = replaceCargoVersion(tauriCargo, "[package]", "apps/tauri/Cargo.toml");

const changelog = readFileSync(PATHS.changelog, "utf8");
const today = new Date().toISOString().slice(0, 10);
const sectionHeader = `## [${version}]`;

if (changelog.includes(sectionHeader)) {
  fail(`CHANGELOG.md contiene già ${sectionHeader}`);
}

const unreleased = changelog.indexOf("## [Unreleased]");
const firstVersionSection = changelog.indexOf("\n## [", unreleased + 1);
if (unreleased === -1 || firstVersionSection === -1) {
  fail("CHANGELOG.md: struttura inattesa (manca [Unreleased] o la sezione successiva)");
}

const newSection =
  `\n${sectionHeader} - ${today}\n\n### Changed\n\n` +
  "- (descrivi qui le modifiche della release prima di creare il tag)\n\n";

const nextChangelog =
  changelog.slice(0, firstVersionSection) + newSection + changelog.slice(firstVersionSection + 1);

// --- 3. Riepilogo ----------------------------------------------------------

console.log(`versione: ${current} -> ${version}`);
console.log(`versionCode: ${config.bundle?.android?.versionCode ?? "derivato"} -> ${versionCode}`);
console.log("file aggiornati:");
for (const file of [
  "package.json",
  "apps/web/package.json",
  "apps/tauri/tauri.conf.json",
  "Cargo.toml",
  "apps/tauri/Cargo.toml",
  "CHANGELOG.md",
]) {
  console.log(`  - ${file}`);
}

if (dryRun) {
  console.log("\ndry-run: nessun file scritto, nessun Cargo.lock aggiornato");
  process.exit(0);
}

// --- 4. Scrive e riallinea i lockfile --------------------------------------

writeJson(PATHS.rootPackage, { ...rootPackage, version });
writeJson(PATHS.webPackage, { ...webPackage, version });
writeJson(PATHS.tauriConfig, nextConfig);
writeFileSync(PATHS.workspaceCargo, nextWorkspaceCargo, "utf8");
writeFileSync(PATHS.tauriCargo, nextTauriCargo, "utf8");
writeFileSync(PATHS.changelog, nextChangelog, "utf8");

function refreshLockfile(cwd, label) {
  try {
    execFileSync("cargo", ["update", "--workspace"], { cwd, stdio: "inherit" });
  } catch (error) {
    if (error.code === "ENOENT") {
      console.warn(
        `attenzione: cargo non trovato, ${label} non aggiornato. Esegui "cargo check" prima del commit.`,
      );
      return;
    }
    throw error;
  }
}

refreshLockfile(ROOT, "Cargo.lock");
refreshLockfile(join(ROOT, "apps/tauri"), "apps/tauri/Cargo.lock");

console.log(`\nfatto. Prossimi passi:
  git add -A && git commit -m "chore(release): ${version}"
  git tag -a v${version} -m "Pizzico ${version}"
  git push origin master --follow-tags`);
