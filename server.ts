import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));

// Health check endpoint (offline-first status)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'offline-first',
    engine: 'Client-Side Canvas 2D + WebGPU/WASM (L0/L1/L2)',
    version: '2.0.0-offline',
  });
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n✓ Creative Suite (Offline-First Studio) running at http://0.0.0.0:${PORT}`);
    console.log(`  Tutte le funzioni grafiche e AI girano nel browser (WASM/WebGPU/Canvas 2D).`);
    console.log(`  Nessuna dipendenza da server esterni.\n`);
  });
}

startServer();
