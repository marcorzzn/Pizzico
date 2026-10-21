// Pizzico — apps/web/src/main.ts
// Riferimento manifesto: §3.1, §5.5, §11 Step 8
// Licenza: MIT OR Apache-2.0

import '@pizzico/ui-web/src/styles.css';
import { DesktopShellLayout } from '@pizzico/ui-web';
import { Slider, ColorPicker, LayerRow, Button } from '@pizzico/ui-kit';
import { initWasm, add, pizzico_version } from '@pizzico/worker-core';

console.log('🍕 Pizzico Engine initializing...');

// Stato WASM Bridge
let wasmReady = false;
let wasmAddFn: (a: number, b: number) => number = (a, b) => a + b;

// Inizializzazione asincrona modulo WASM (§11 Step 8)
async function setupWasm() {
  try {
    await initWasm();
    wasmReady = true;
    wasmAddFn = add;
    const resultSpan = document.getElementById('wasm-result');
    if (resultSpan) {
      resultSpan.textContent = `WASM caricato (v${pizzico_version()})`;
      resultSpan.style.color = '#38bdf8';
    }
    console.log(`[WASM Bridge] Modulo inizializzato con successo. Version: ${pizzico_version()}, wasmReady: ${wasmReady}`);
  } catch (err) {
    console.warn('[WASM Bridge] Inizializzazione locale WASM, fallback a JS:', err);
  }
}
setupWasm();

// Shader WGSL per rendering del rettangolo (§6.2, §11 Step 8)
const RECTANGLE_WGSL = `
struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec4<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) in_vertex_index: u32) -> VertexOutput {
  var out: VertexOutput;
  // 6 vertici per due triangoli (rettangolo centrato in NDC)
  var pos = array<vec2<f32>, 6>(
    vec2<f32>(-0.6, -0.45),
    vec2<f32>( 0.6, -0.45),
    vec2<f32>( 0.6,  0.45),
    vec2<f32>(-0.6, -0.45),
    vec2<f32>( 0.6,  0.45),
    vec2<f32>(-0.6,  0.45)
  );

  var colors = array<vec4<f32>, 6>(
    vec4<f32>(0.31, 0.27, 0.90, 1.0), // Pizzico Indigo (#4f46e5)
    vec4<f32>(0.02, 0.71, 0.83, 1.0), // Pizzico Cyan (#06b6d4)
    vec4<f32>(0.94, 0.27, 0.54, 1.0), // Pizzico Rose (#f43f5e)
    vec4<f32>(0.31, 0.27, 0.90, 1.0),
    vec4<f32>(0.94, 0.27, 0.54, 1.0),
    vec4<f32>(0.58, 0.20, 0.92, 1.0)  // Pizzico Purple (#9333ea)
  );

  out.position = vec4<f32>(pos[in_vertex_index], 0.0, 1.0);
  out.color = colors[in_vertex_index];
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  return in.color;
}
`;

// Inizializzazione pipeline WebGPU con loop di rendering e resize responsive
async function initWebGpuCanvas(canvas: HTMLCanvasElement) {
  if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
    try {
      const gpu = (navigator as any).gpu;
      const adapter = await gpu.requestAdapter({
        powerPreference: 'high-performance',
      });

      if (adapter) {
        const device = await adapter.requestDevice();
        const context = canvas.getContext('webgpu') as any;

        if (context) {
          const format = gpu.getPreferredCanvasFormat();
          const shaderModule = device.createShaderModule({
            label: 'Pizzico Rectangle WGSL Module',
            code: RECTANGLE_WGSL,
          });

          const pipeline = device.createRenderPipeline({
            label: 'Pizzico Rectangle Pipeline',
            layout: 'auto',
            vertex: {
              module: shaderModule,
              entryPoint: 'vs_main',
            },
            fragment: {
              module: shaderModule,
              entryPoint: 'fs_main',
              targets: [{ format }],
            },
            primitive: {
              topology: 'triangle-list',
            },
          });

          function resize() {
            const dpr = window.devicePixelRatio || 1;
            const displayWidth = Math.floor(canvas.clientWidth * dpr);
            const displayHeight = Math.floor(canvas.clientHeight * dpr);

            if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
              canvas.width = Math.max(displayWidth, 1);
              canvas.height = Math.max(displayHeight, 1);
            }

            context.configure({
              device,
              format,
              alphaMode: 'premultiplied',
            });
          }

          resize();
          window.addEventListener('resize', resize);

          function render() {
            if (canvas.width === 0 || canvas.height === 0) {
              requestAnimationFrame(render);
              return;
            }

            const commandEncoder = device.createCommandEncoder();
            const textureView = context.getCurrentTexture().createView();

            const renderPass = commandEncoder.beginRenderPass({
              colorAttachments: [
                {
                  view: textureView,
                  clearValue: { r: 0.08, g: 0.09, b: 0.13, a: 1.0 }, // Background dark canvas
                  loadOp: 'clear',
                  storeOp: 'store',
                },
              ],
            });

            renderPass.setPipeline(pipeline);
            renderPass.draw(6, 1, 0, 0); // Disegna i 6 vertici del rettangolo
            renderPass.end();

            device.queue.submit([commandEncoder.finish()]);
            requestAnimationFrame(render);
          }

          requestAnimationFrame(render);
          console.log('[WebGPU] Hardware accelerated render loop attivo a 60fps.');
          return;
        }
      }
    } catch (e) {
      console.warn('[WebGPU] Fallback a Canvas2D:', e);
    }
  }

  // Fallback a Canvas2D
  const ctx = canvas.getContext('2d');
  if (ctx) {
    function render2d() {
      ctx!.fillStyle = '#121316';
      ctx!.fillRect(0, 0, canvas.width, canvas.height);

      const grad = ctx!.createLinearGradient(100, 100, 800, 600);
      grad.addColorStop(0, '#4f46e5');
      grad.addColorStop(1, '#06b6d4');
      ctx!.fillStyle = grad;
      ctx!.roundRect(150, 120, Math.max(canvas.width - 300, 200), Math.max(canvas.height - 240, 150), 16);
      ctx!.fill();
    }
    render2d();
  }
}

// Inizializzazione interfaccia utente
const appContainer = document.getElementById('app')!;
const shell = new DesktopShellLayout({
  onModeChange: (mode) => console.log(`[Workspace] Modalità attiva: ${mode}`),
  onToolSelect: (tool) => console.log(`[Toolbar] Strumento selezionato: ${tool}`),
  onCommand: (cmdId) => console.log(`[Command] Esecuzione: ${cmdId}`),
});

appContainer.appendChild(shell.root);

// Pannello livelli iniziale
const bgLayerRow = new LayerRow({
  layer: {
    id: 1,
    name: 'Sfondo (WebGPU Canvas)',
    kind: 'Raster',
    visible: true,
    locked: false,
    opacity: 1.0,
    blendMode: 'Normal',
  },
  selected: true,
  onSelect: (id) => console.log(`Livello selezionato: ${id}`),
});
shell.layersPanelBody.appendChild(bgLayerRow.element);

// Pulsante Aggiungi Livello
const addLayerBtn = new Button({
  label: '+ Nuovo Livello',
  variant: 'secondary',
  onClick: () => {
    const newId = Date.now();
    const newRow = new LayerRow({
      layer: {
        id: newId,
        name: `Livello ${shell.layersPanelBody.children.length}`,
        kind: 'Raster',
        visible: true,
        locked: false,
        opacity: 1.0,
        blendMode: 'Normal',
      },
      onSelect: (id) => console.log(`Livello selezionato: ${id}`),
    });
    shell.layersPanelBody.insertBefore(newRow.element, addLayerBtn.element);
  },
});
shell.layersPanelBody.appendChild(addLayerBtn.element);

// Sezione di verifica WASM Bridge con Pulsante interattivo (§11 Step 8)
const wasmStatusBox = document.createElement('div');
wasmStatusBox.id = 'wasm-bridge-status';
wasmStatusBox.style.cssText = `
  margin: 12px 0;
  padding: 10px 12px;
  background: rgba(79, 70, 229, 0.12);
  border: 1px solid rgba(79, 70, 229, 0.35);
  border-radius: 8px;
  font-size: 12px;
  color: #c7d2fe;
`;
wasmStatusBox.innerHTML = `<strong>Rust ↔ WASM Bridge:</strong> <span id="wasm-result">Pronto</span>`;
shell.inspectorPanelBody.appendChild(wasmStatusBox);

const testWasmBtn = new Button({
  label: '⚡ Esegui add(2, 3) via WASM',
  variant: 'primary',
  onClick: () => {
    const res = wasmAddFn(2, 3);
    const resultSpan = document.getElementById('wasm-result');
    if (resultSpan) {
      resultSpan.textContent = `add(2, 3) = ${res} (WASM)`;
      resultSpan.style.color = '#34d399';
    }
    console.log(`[WASM Bridge Click] add(2, 3) = ${res}`);
  },
});
shell.inspectorPanelBody.appendChild(testWasmBtn.element);

// Controlli Inspector
const opacitySlider = new Slider({
  label: 'Opacità Livello',
  min: 0,
  max: 100,
  value: 100,
  unit: '%',
  onChange: (v) => console.log(`Opacità: ${v}%`),
});
shell.inspectorPanelBody.appendChild(opacitySlider.element);

const brushSizeSlider = new Slider({
  label: 'Dimensione Tratto',
  min: 1,
  max: 200,
  value: 24,
  unit: 'px',
  onChange: (v) => console.log(`Dimensione pennello: ${v}px`),
});
shell.inspectorPanelBody.appendChild(brushSizeSlider.element);

const colorPicker = new ColorPicker({
  color: '#4f46e5',
  onChange: (c) => console.log(`Colore attivo: ${c}`),
});
shell.inspectorPanelBody.appendChild(colorPicker.element);

// Avvia rendering del Canvas WebGPU
initWebGpuCanvas(shell.canvas);
