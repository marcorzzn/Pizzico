// Pizzico — packages/worker-core/src/index.ts
// Riferimento manifesto: §3.1, §4
// Licenza: MIT OR Apache-2.0

export * from './worker';

export class WorkerClient {
  private worker: Worker | null = null;
  private messageId = 0;
  private pending = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();

  constructor(workerScriptUrl?: string) {
    if (typeof window !== 'undefined' && workerScriptUrl) {
      this.worker = new Worker(workerScriptUrl, { type: 'module' });
      this.worker.onmessage = this.handleMessage;
    }
  }

  private handleMessage = (e: MessageEvent) => {
    const { id, success, result, error } = e.data;
    if (this.pending.has(id)) {
      const { resolve, reject } = this.pending.get(id)!;
      this.pending.delete(id);
      if (success) resolve(result);
      else reject(new Error(error));
    }
  };

  public post(type: 'init' | 'compute' | 'render', payload?: any): Promise<any> {
    if (!this.worker) {
      return Promise.resolve({ simulated: true });
    }
    const id = ++this.messageId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker!.postMessage({ id, type, payload });
    });
  }

  public terminate() {
    this.worker?.terminate();
    this.worker = null;
  }
}
