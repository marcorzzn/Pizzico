// P0-F: verifica il round-trip .pizzico e le firme PNG/JPEG direttamente nel
// WASM, senza browser. Se questo test è rosso, il problema è nel motore; se è
// verde, il problema è nella UI di salvataggio/caricamento.
//
// Uso: node tests/wasm-roundtrip.mjs

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import init, {
  add_raster_layer,
  begin_stroke,
  brush_stroke,
  create_document,
  end_stroke,
  export_as_jpeg,
  export_as_png,
  get_composite_buffer,
  get_document_metadata,
  get_layer_count,
  get_layers_metadata,
  load_project,
  load_psd_bytes,
  save_project,
} from "../packages/worker-core/pkg/pizzico_wasm_bindings.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const wasmBytes = await readFile(
  join(root, "packages/worker-core/pkg/pizzico_wasm_bindings_bg.wasm"),
);
await init({ module_or_path: wasmBytes });

function fail(message) {
  console.error(`\nROUND-TRIP .pizzico FALLITO: ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

const W = 64;
const H = 48;

create_document(W, H);
add_raster_layer("sfondo", W, H, new Uint8Array([255, 255, 255, 255]));
add_raster_layer("tratto", W, H, new Uint8Array([0, 0, 0, 0]));

begin_stroke();
brush_stroke(10, 10, 50, 35, 5, 0.8, new Uint8Array([255, 0, 0, 255]), 1.0);
end_stroke();

const before = new Uint8Array(get_composite_buffer());
const project = new Uint8Array(save_project());

assert(project.length > 0, "save_project() ha restituito 0 byte");
assert(before.length === W * H * 4, `composite inatteso: ${before.length} byte`);

// Ricrea un documento diverso, poi ricarica il progetto: deve tornare
// esattamente il documento originale, layer e pixel compresi.
create_document(8, 8);
load_project(project);

const meta = get_document_metadata();
const after = new Uint8Array(get_composite_buffer());

assert(meta?.width === W && meta?.height === H, `dimensioni dopo load: ${meta?.width}x${meta?.height}`);
assert(get_layer_count() === 2, `layer dopo load: ${get_layer_count()}, attesi 2`);
assert(before.length === after.length, `composite dopo load: ${after.length} byte`);

let diff = 0;
for (let i = 0; i < before.length; i += 1) {
  if (before[i] !== after[i]) diff += 1;
}
assert(diff === 0, `${diff} byte del composite diversi dopo il round-trip`);

const png = new Uint8Array(export_as_png());
const jpeg = new Uint8Array(export_as_jpeg(90));
const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
assert(
  png.length > 8 && pngSignature.every((byte, index) => png[index] === byte),
  "export_as_png() non restituisce un PNG valido",
);
assert(
  jpeg.length > 3 && jpeg[0] === 0xff && jpeg[1] === 0xd8 && jpeg[2] === 0xff,
  "export_as_jpeg() non restituisce un JPEG valido",
);

// Regressione P0-G: PSD import + layer aggiunto + save, poi ripristino del
// progetto + un altro layer. Il secondo add partiva da ID 1 e collideva con
// il primo layer del PSD (Duplicate filename: layers/layer_1.bin).
const samplePsd = new Uint8Array(await readFile(join(root, "apps/web/public/sample-01.psd")));
load_psd_bytes(samplePsd);

function assertUniqueLayerIds(label) {
  const layers = get_layers_metadata();
  const seen = new Set();
  for (const layer of layers) {
    assert(!seen.has(layer.id), `${label}: ID layer duplicato ${layer.id}`);
    seen.add(layer.id);
  }
  return seen;
}

const psdIds = assertUniqueLayerIds("dopo import PSD");
const rectangleId = Number(add_raster_layer("Rettangolo Rosso", 800, 600, new Uint8Array([239, 68, 68, 255])));
assert(!psdIds.has(rectangleId), `ID ${rectangleId} collide con un layer del PSD`);

const withRectangle = new Uint8Array(save_project());
assert(withRectangle.length > 0, "save dopo PSD + layer ha restituito 0 byte");

create_document(8, 8);
load_project(withRectangle);
const restoredIds = assertUniqueLayerIds("dopo load_project");

const afterRestoreId = Number(add_raster_layer("Dopo ripristino", 800, 600, new Uint8Array([0, 0, 255, 255])));
assert(!restoredIds.has(afterRestoreId), `ID ${afterRestoreId} collide dopo il ripristino`);

const afterRestore = new Uint8Array(save_project());
assert(afterRestore.length > 0, "save dopo ripristino + layer ha restituito 0 byte");

console.log("ROUND-TRIP .pizzico OK");
console.log(`  documento: ${W}x${H}, layer: ${get_layer_count()}`);
console.log(`  progetto:  ${project.length} byte, composite: ${diff} byte diversi`);
console.log(`  export:    PNG ${png.length} byte, JPEG ${jpeg.length} byte`);
