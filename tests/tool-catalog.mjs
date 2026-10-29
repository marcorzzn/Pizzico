// Gate 2 — parità del catalogo strumenti nel WASM reale.
//
// Non testa le funzioni Rust "pure": istanzia il modulo compilato e chiama le
// due esportazioni wasm-bindgen. Se questo test è verde, il ponte JS esiste
// davvero, con i nomi e i tipi attesi.
//
// Uso: node tests/tool-catalog.mjs

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import init, {
  get_tool_catalog_json,
  get_tool_schema_json,
} from "../packages/worker-core/pkg/pizzico_wasm_bindings.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const wasmBytes = await readFile(
  join(root, "packages/worker-core/pkg/pizzico_wasm_bindings_bg.wasm"),
);
await init({ module_or_path: wasmBytes });

function fallita(messaggio) {
  console.error(`\nCATALOGO STRUMENTI: ${messaggio}`);
  process.exit(1);
}

function assert(condizione, messaggio) {
  if (!condizione) fallita(messaggio);
}

const catalogo = JSON.parse(get_tool_catalog_json());

assert(catalogo.schemaVersion === 1, `schemaVersion inattesa: ${catalogo.schemaVersion}`);
assert(Array.isArray(catalogo.tools), "tools non è un array");

const ids = catalogo.tools.map((tool) => tool.id);
assert(
  JSON.stringify(ids) === JSON.stringify(["brush", "eraser", "marquee", "move"]),
  `id inattesi: ${JSON.stringify(ids)}`,
);

const pennello = catalogo.tools.find((tool) => tool.id === "brush");
assert(pennello !== undefined, "pennello assente");
assert(pennello.label === "Pennello", `etichetta pennello: ${pennello.label}`);
assert(pennello.params.length === 4, `parametri pennello: ${pennello.params.length}`);

const tipi = pennello.params.map((param) => param.kind);
assert(
  JSON.stringify(tipi) === JSON.stringify(["integer", "integer", "integer", "color"]),
  `tipi dei parametri: ${JSON.stringify(tipi)}`,
);

const raggio = pennello.params[0];
assert(raggio.id === "size", `primo parametro: ${raggio.id}`);
assert(raggio.min === 1 && raggio.max === 100, "limiti del raggio");
assert(raggio.default === 20, `default del raggio: ${raggio.default}`);
assert(raggio.unit === "px", `unità del raggio: ${raggio.unit}`);

const gomma = catalogo.tools.find((tool) => tool.id === "eraser");
assert(gomma !== undefined, "gomma assente");
assert(
  gomma.params.every((param) => param.kind !== "color"),
  "la gomma non deve dichiarare il colore",
);

const schemaPennello = JSON.parse(get_tool_schema_json("brush"));
assert(schemaPennello.id === "brush", `schema singolo: ${schemaPennello.id}`);

assert(
  get_tool_schema_json("vignette") === undefined,
  "un id sconosciuto deve restituire undefined",
);
assert(
  get_tool_schema_json("BRUSH") === undefined,
  "un id non valido deve restituire undefined, non lanciare",
);

console.log(
  `Catalogo OK: ${catalogo.tools.length} strumenti, ${pennello.params.length} parametri del pennello, schemaVersion ${catalogo.schemaVersion}.`,
);
