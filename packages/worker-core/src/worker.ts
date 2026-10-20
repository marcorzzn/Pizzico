// Pizzico — packages/worker-core/src/worker.ts
// Riferimento manifesto: §3.1, §3.2, §4
// Licenza: MIT OR Apache-2.0

export interface WorkerRequest {
  id: number;
  type: 'init' | 'compute' | 'render';
  payload?: any;
}

export interface WorkerResponse {
  id: number;
  success: boolean;
  result?: any;
  error?: string;
}

// Background Worker script logic
self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, type, payload } = e.data;
  try {
    switch (type) {
      case 'init': {
        // Simulazione o caricamento reale del modulo WASM
        self.postMessage({ id, success: true, result: { ready: true } } as WorkerResponse);
        break;
      }
      case 'compute': {
        // Elaborazione computazionale intensiva (es. PatchMatch o Poisson) in thread isolato
        self.postMessage({ id, success: true, result: payload } as WorkerResponse);
        break;
      }
      case 'render': {
        self.postMessage({ id, success: true, result: { frameRendered: true } } as WorkerResponse);
        break;
      }
      default:
        throw new Error(`Tipo messaggio worker non riconosciuto: ${type}`);
    }
  } catch (err: any) {
    self.postMessage({ id, success: false, error: err.message || String(err) } as WorkerResponse);
  }
};
