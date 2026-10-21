// Pizzico — packages/worker-core/pkg/pizzico_wasm_bindings.d.ts
// Riferimento manifesto: §3.1, §11 Step 8
// Licenza: MIT OR Apache-2.0

export function add(a: number, b: number): number;
export function pizzico_version(): number;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly add: (a: number, b: number) => number;
  readonly pizzico_version: () => number;
}

export default function init(input?: InitInput | Promise<InitInput>): Promise<InitOutput>;
export function initSync(module: { module: WebAssembly.Module } | WebAssembly.Module): InitOutput;
