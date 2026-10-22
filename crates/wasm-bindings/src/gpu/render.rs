// Pizzico — crates/wasm-bindings/src/gpu/render.rs
// Riferimento manifesto: §6.2, §11 Step 8
// Licenza: MIT OR Apache-2.0

//! # Pizzico WebGPU Renderer (Rust-side)
//!
//! Inizializza la pipeline WebGPU tramite web-sys e avvia il render loop.
//! Il frame disegna un rettangolo a gradiente con la palette brand Pizzico,
//! usando shader WGSL compilati ed eseguiti interamente su GPU.
//!
//! ## Pipeline (§6.2 — Kilgard & Bolz 2012)
//! 1. Richiesta Adapter → Device → Queue via `navigator.gpu`
//! 2. Configurazione del Surface (`GPUCanvasContext`) sul `<canvas>` HTML
//! 3. Compilazione dello shader WGSL (vertex + fragment)
//! 4. Creazione della RenderPipeline con blend alpha
//! 5. Loop di rendering via `requestAnimationFrame` ricorsivo

use js_sys::{Function, Object, Reflect};
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;
use web_sys::window;

// ──────────────────────────────────────────────────────────────────────────────
// Shader WGSL (§6.2)
// ──────────────────────────────────────────────────────────────────────────────

const WGSL_SHADER: &str = r#"
// Pizzico — crates/wasm-bindings/src/gpu/render.rs (inline WGSL)
// Riferimento manifesto: §6.2 (Kilgard & Bolz 2012)

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0)        color:    vec4<f32>,
};

// 6 vertici hardcoded per due triangoli che formano il rettangolo (NDC).
// Nessun vertex buffer — vertex pulling diretto da vertex_index.
@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> VertexOutput {
  var pos = array<vec2<f32>, 6>(
    vec2<f32>(-0.62, -0.45),  // tri 0 - a
    vec2<f32>( 0.62, -0.45),  // tri 0 - b
    vec2<f32>( 0.62,  0.45),  // tri 0 - c
    vec2<f32>(-0.62, -0.45),  // tri 1 - a
    vec2<f32>( 0.62,  0.45),  // tri 1 - b
    vec2<f32>(-0.62,  0.45),  // tri 1 - c
  );

  // Palette brand Pizzico (tutte con alpha = 1)
  var col = array<vec4<f32>, 6>(
    vec4<f32>(0.310, 0.275, 0.898, 1.0),  // #4f46e5  Indigo
    vec4<f32>(0.024, 0.714, 0.831, 1.0),  // #06b6d4  Cyan
    vec4<f32>(0.957, 0.267, 0.369, 1.0),  // #f43f5e  Rose
    vec4<f32>(0.310, 0.275, 0.898, 1.0),  // #4f46e5
    vec4<f32>(0.957, 0.267, 0.369, 1.0),  // #f43f5e
    vec4<f32>(0.576, 0.200, 0.918, 1.0),  // #9333ea  Purple
  );

  var out: VertexOutput;
  out.position = vec4<f32>(pos[vi], 0.0, 1.0);
  out.color    = col[vi];
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  return in.color;
}
"#;

// ──────────────────────────────────────────────────────────────────────────────
// Helper — call JS method by name via Reflect
// ──────────────────────────────────────────────────────────────────────────────

fn js_call(obj: &JsValue, method: &str, args: &[JsValue]) -> Result<JsValue, JsValue> {
    let method_fn: Function = Reflect::get(obj, &JsValue::from_str(method))?
        .dyn_into()
        .map_err(|_| JsValue::from_str(&format!("method '{}' not a function", method)))?;
    method_fn.apply(obj, &js_sys::Array::from_iter(args.iter().cloned()))
}

fn js_get(obj: &JsValue, key: &str) -> Result<JsValue, JsValue> {
    Reflect::get(obj, &JsValue::from_str(key))
}

fn js_set(obj: &JsValue, key: &str, val: &JsValue) -> Result<bool, JsValue> {
    Reflect::set(obj, &JsValue::from_str(key), val)
}

fn js_obj() -> Object {
    Object::new()
}

// ──────────────────────────────────────────────────────────────────────────────
// Inizializzazione principale
// ──────────────────────────────────────────────────────────────────────────────

/// Punto di entrata asincrono esposto a TypeScript tramite `#[wasm_bindgen]`.
/// Prende l'ID del `<canvas>` HTML e avvia il render loop WebGPU.
pub async fn init_webgpu_canvas(canvas_id: &str) -> Result<(), JsValue> {
    let window = window().ok_or_else(|| JsValue::from_str("window non disponibile"))?;
    let document = window
        .document()
        .ok_or_else(|| JsValue::from_str("document non disponibile"))?;

    // ── 1. Recupera il <canvas> HTML ──────────────────────────────────────────
    let canvas = document
        .get_element_by_id(canvas_id)
        .ok_or_else(|| JsValue::from_str(&format!("Canvas '{}' non trovato nel DOM", canvas_id)))?;

    let canvas_js: JsValue = canvas.clone().into();

    // ── 2. Richiedi Adapter WebGPU ────────────────────────────────────────────
    let navigator: JsValue = window.navigator().into();
    let gpu = js_get(&navigator, "gpu").map_err(|_| {
        JsValue::from_str("navigator.gpu non disponibile — WebGPU non supportata in questo browser")
    })?;

    if gpu.is_undefined() || gpu.is_null() {
        return Err(JsValue::from_str(
            "WebGPU non disponibile. Assicurati di usare Chrome 113+, Edge 113+ o Firefox Nightly con dom.webgpu.enabled=true",
        ));
    }

    // Opzioni adapter: preferiamo la GPU ad alte prestazioni (§6.2)
    let adapter_opts = js_obj();
    js_set(&adapter_opts, "powerPreference", &JsValue::from_str("high-performance"))?;

    let adapter = JsFuture::from(
        js_call(&gpu, "requestAdapter", &[adapter_opts.into()])?
            .dyn_into::<js_sys::Promise>()
            .map_err(|_| JsValue::from_str("requestAdapter non ha restituito una Promise"))?,
    )
    .await?;

    if adapter.is_null() || adapter.is_undefined() {
        return Err(JsValue::from_str(
            "Nessun adapter WebGPU trovato — hardware non supportato",
        ));
    }

    // ── 3. Richiedi Device e Queue ────────────────────────────────────────────
    let device_desc = js_obj();
    js_set(&device_desc, "label", &JsValue::from_str("Pizzico GPU Device"))?;

    let device = JsFuture::from(
        js_call(&adapter, "requestDevice", &[device_desc.into()])?
            .dyn_into::<js_sys::Promise>()
            .map_err(|_| JsValue::from_str("requestDevice non ha restituito una Promise"))?,
    )
    .await?;

    let queue = js_get(&device, "queue")?;

    // ── 4. Configura il Surface (GPUCanvasContext) ────────────────────────────
    let context = js_call(&canvas_js, "getContext", &[JsValue::from_str("webgpu")])?;
    if context.is_null() || context.is_undefined() {
        return Err(JsValue::from_str(
            "Canvas.getContext('webgpu') ha restituito null — canvas già usato con un altro context?",
        ));
    }

    // Formato preferito dalla GPU dell'utente
    let preferred_format = js_call(&gpu, "getPreferredCanvasFormat", &[])?;

    let config = js_obj();
    js_set(&config, "device", &device)?;
    js_set(&config, "format", &preferred_format)?;
    js_set(&config, "alphaMode", &JsValue::from_str("premultiplied"))?;
    js_call(&context, "configure", &[config.into()])?;

    // ── 5. Compila lo shader WGSL ─────────────────────────────────────────────
    let shader_desc = js_obj();
    js_set(&shader_desc, "label", &JsValue::from_str("Pizzico Rectangle WGSL"))?;
    js_set(&shader_desc, "code", &JsValue::from_str(WGSL_SHADER))?;
    let shader_module = js_call(&device, "createShaderModule", &[shader_desc.into()])?;

    // ── 6. Crea RenderPipeline ────────────────────────────────────────────────
    let pipeline = create_pipeline(&device, &shader_module, &preferred_format)?;

    // ── 7. Avvia il render loop via requestAnimationFrame ────────────────────
    // Il closure Rust deve essere `Rc<RefCell<Option<Closure<…>>>>` per la
    // ricorsione: il pattern standard per RAF in Rust/WASM.
    use std::cell::RefCell;
    use std::rc::Rc;
    use wasm_bindgen::JsCast;

    let raf_closure: Rc<RefCell<Option<Closure<dyn FnMut(f64)>>>> =
        Rc::new(RefCell::new(None));
    let raf_inner = raf_closure.clone();

    // Cloniamo i valori di cui abbiamo bisogno dentro il closure
    let device_c = device.clone();
    let queue_c = queue.clone();
    let context_c = context.clone();
    let pipeline_c = pipeline.clone();
    let canvas_c = canvas_js.clone();

    *raf_closure.borrow_mut() = Some(Closure::new(move |_timestamp: f64| {
        // Resize responsivo per HiDPI
        let _ = resize_canvas_to_display(&canvas_c, &context_c, &device_c, &preferred_format);

        // Render del frame corrente
        let _ = render_frame(&device_c, &queue_c, &context_c, &pipeline_c);

        // Schedula il prossimo frame
        if let Some(win) = web_sys::window() {
            let cb = raf_inner
                .borrow()
                .as_ref()
                .map(|c| c.as_ref().unchecked_ref::<Function>().clone());
            if let Some(cb) = cb {
                let _ = win.request_animation_frame(&cb);
            }
        }
    }));

    // Primo RAF
    let cb = raf_closure
        .borrow()
        .as_ref()
        .map(|c| c.as_ref().unchecked_ref::<Function>().clone())
        .ok_or_else(|| JsValue::from_str("Closure RAF non inizializzato"))?;

    window.request_animation_frame(&cb)?;

    // Mantieni il closure in vita: lo "dimentichiamo" con forget()
    // per evitare che Rust lo droppi alla fine della funzione.
    // ATTENZIONE: questo crea un leak controllato (≈ il closure vive
    // per l'intera durata della pagina, che è il comportamento corretto
    // per un render loop perpetuo).
    if let Some(closure) = raf_closure.borrow_mut().take() {
        closure.forget();
    }

    Ok(())
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers privati
// ──────────────────────────────────────────────────────────────────────────────

fn create_pipeline(
    device: &JsValue,
    shader_module: &JsValue,
    format: &JsValue,
) -> Result<JsValue, JsValue> {
    // Fragment targets
    let target = js_obj();
    js_set(&target, "format", format)?;

    let targets = js_sys::Array::new();
    targets.push(target.as_ref());

    // Fragment state
    let fragment = js_obj();
    js_set(&fragment, "module", shader_module)?;
    js_set(&fragment, "entryPoint", &JsValue::from_str("fs_main"))?;
    js_set(&fragment, "targets", targets.as_ref())?;

    // Vertex state
    let vertex = js_obj();
    js_set(&vertex, "module", shader_module)?;
    js_set(&vertex, "entryPoint", &JsValue::from_str("vs_main"))?;
    js_set(&vertex, "buffers", js_sys::Array::new().as_ref())?;

    // Primitive state
    let primitive = js_obj();
    js_set(&primitive, "topology", &JsValue::from_str("triangle-list"))?;

    // Pipeline descriptor
    let pipeline_desc = js_obj();
    js_set(&pipeline_desc, "label", &JsValue::from_str("Pizzico Rectangle Pipeline"))?;
    js_set(&pipeline_desc, "layout", &JsValue::from_str("auto"))?;
    js_set(&pipeline_desc, "vertex", &vertex.into())?;
    js_set(&pipeline_desc, "fragment", &fragment.into())?;
    js_set(&pipeline_desc, "primitive", &primitive.into())?;

    js_call(device, "createRenderPipeline", &[pipeline_desc.into()])
}

fn resize_canvas_to_display(
    canvas: &JsValue,
    context: &JsValue,
    device: &JsValue,
    format: &JsValue,
) -> Result<(), JsValue> {
    // Leggi le dimensioni CSS correnti del canvas
    let client_width = js_get(canvas, "clientWidth")?
        .as_f64()
        .unwrap_or(800.0) as u32;
    let client_height = js_get(canvas, "clientHeight")?
        .as_f64()
        .unwrap_or(600.0) as u32;

    let current_width = js_get(canvas, "width")?.as_f64().unwrap_or(0.0) as u32;
    let current_height = js_get(canvas, "height")?.as_f64().unwrap_or(0.0) as u32;

    let need_resize = client_width > 0
        && client_height > 0
        && (current_width != client_width || current_height != client_height);

    if need_resize {
        js_set(canvas, "width", &JsValue::from_f64(client_width as f64))?;
        js_set(canvas, "height", &JsValue::from_f64(client_height as f64))?;

        let config = js_obj();
        js_set(&config, "device", device)?;
        js_set(&config, "format", format)?;
        js_set(&config, "alphaMode", &JsValue::from_str("premultiplied"))?;
        js_call(context, "configure", &[config.into()])?;
    }

    Ok(())
}

fn render_frame(
    device: &JsValue,
    queue: &JsValue,
    context: &JsValue,
    pipeline: &JsValue,
) -> Result<(), JsValue> {
    let texture = js_call(context, "getCurrentTexture", &[])?;
    let texture_view = js_call(&texture, "createView", &[])?;

    // Color attachment con clear color scuro (background del canvas)
    let clear_color = js_obj();
    js_set(&clear_color, "r", &JsValue::from_f64(0.08))?;
    js_set(&clear_color, "g", &JsValue::from_f64(0.09))?;
    js_set(&clear_color, "b", &JsValue::from_f64(0.13))?;
    js_set(&clear_color, "a", &JsValue::from_f64(1.0))?;

    let attachment = js_obj();
    js_set(&attachment, "view", &texture_view)?;
    js_set(&attachment, "clearValue", &clear_color.into())?;
    js_set(&attachment, "loadOp", &JsValue::from_str("clear"))?;
    js_set(&attachment, "storeOp", &JsValue::from_str("store"))?;

    let attachments = js_sys::Array::new();
    attachments.push(attachment.as_ref());

    let render_pass_desc = js_obj();
    js_set(&render_pass_desc, "colorAttachments", attachments.as_ref())?;

    // Command encoder
    let encoder_desc = js_obj();
    js_set(&encoder_desc, "label", &JsValue::from_str("Pizzico Frame Encoder"))?;
    let encoder = js_call(device, "createCommandEncoder", &[encoder_desc.into()])?;

    // Render pass
    let render_pass = js_call(&encoder, "beginRenderPass", &[render_pass_desc.into()])?;
    js_call(&render_pass, "setPipeline", &[pipeline.clone()])?;
    // draw(vertexCount=6, instanceCount=1, firstVertex=0, firstInstance=0)
    js_call(
        &render_pass,
        "draw",
        &[
            JsValue::from_f64(6.0),
            JsValue::from_f64(1.0),
            JsValue::from_f64(0.0),
            JsValue::from_f64(0.0),
        ],
    )?;
    js_call(&render_pass, "end", &[])?;

    // Submit
    let command_buffer = js_call(&encoder, "finish", &[])?;
    let commands = js_sys::Array::new();
    commands.push(&command_buffer);
    js_call(queue, "submit", &[commands.into()])?;

    Ok(())
}
