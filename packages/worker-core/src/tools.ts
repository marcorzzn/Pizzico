// Pizzico — packages/worker-core/src/tools.ts
// Licenza: MIT OR Apache-2.0
//
// Wrapper tipizzato attorno alle due funzioni WASM del catalogo strumenti.
// Il parsing/validazione vive in `@pizzico/shared`; qui c'è solo il confine.

import {
  parseToolCatalog,
  parseToolSchema,
  type ToolCatalog,
  type ToolSchema,
} from '@pizzico/shared';

import {
  get_tool_catalog_json,
  get_tool_schema_json,
} from '../pkg/pizzico_wasm_bindings';

/**
 * Catalogo completo degli strumenti.
 *
 * Richiede che `initWasm()` sia già stato completato: le funzioni WASM non
 * esistono prima dell'istanziazione del modulo.
 */
export function getToolCatalog(): ToolCatalog {
  return parseToolCatalog(get_tool_catalog_json());
}

/**
 * Schema di uno strumento, oppure `null` se l'id non è registrato.
 *
 * Un id sconosciuto non è un errore: è semplicemente uno strumento che questa
 * build non contiene.
 */
export function getToolSchema(id: string): ToolSchema | null {
  const json = get_tool_schema_json(id);
  return json === undefined ? null : parseToolSchema(json);
}
