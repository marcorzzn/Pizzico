// Pizzico — crates/wasm-bindings/src/gpu/render.rs
// Riferimento manifesto: §6.2, §11 Step 8
// Licenza: MIT OR Apache-2.0

//! # Pizzico WebGPU Renderer (Rust-side)
//!
//! Inizializza la pipeline WebGPU tramite web-sys e avvia il render loop.
//! Ad ogni frame carica la texture composita del Documento e la disegna a 60 FPS
//! tramite uno shader WGSL su GPU, eliminando ogni rettangolo statico hardcoded.
//!
//! ## Pipeline (§6.2 — Kilgard & Bolz 2012)
//! 1. Richiesta Adapter → Device → Queue via `navigator.gpu`
//! 2. Configurazione del Surface (`GPUCanvasContext`) sul `<canvas>` HTML
//! 3. Compilazione dello shader WGSL (vertex + fragment sampling texture)
//! 4. Creazione della RenderPipeline con layout auto
//! 5. Creazione Sampler + Texture 2D RGBA dinamica
//! 6. Loop di rendering via `requestAnimationFrame` ricorsivo con upload buffer

use js_sys::{Function, Object, Reflect};
use std::cell::RefCell;
use std::rc::Rc;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::JsFuture;
use web_sys::window;

// ──────────────────────────────────────────────────────────────────────────────
// Shader WGSL con Texture Sampling (§6.2)
// ──────────────────────────────────────────────────────────────────────────────

const WGSL_SHADER: &str = r#"
// Pizzico — crates/wasm-bindings/src/gpu/render.rs (WGSL Texture Sampler)
// Riferimento manifesto: §6.2 (Kilgard & Bolz 2012)

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0)       uv:       vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> VertexOutput {
  // 6 vertici per due triangoli a schermo intero (NDC)
  var pos = array<vec2<f32>, 6>(
    vec2<f32>(-1.0,  1.0),
    vec2<f32>( 1.0,  1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>(-1.0, -1.0),
  );

  // Coordinate texture UV: (0,0) in alto a sinistra, (1,1) in basso a destra
  var uv = array<vec2<f32>, 6>(
    vec2<f32>(0.0, 0.0),
    vec2<f32>(1.0, 0.0),
    vec2<f32>(1.0, 1.0),
    vec2<f32>(0.0, 0.0),
    vec2<f32>(1.0, 1.0),
    vec2<f32>(0.0, 1.0),
  );

  var out: VertexOutput;
  out.position = vec4<f32>(pos[vi], 0.0, 1.0);
  out.uv       = uv[vi];
  return out;
}

@group(0) @binding(0) var t_diffuse: texture_2d<f32>;
@group(0) @binding(1) var s_diffuse: sampler;

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  return textureSample(t_diffuse, s_diffuse, in.uv);
}
"#;

// ──────────────────────────────────────────────────────────────────────────────
// Helper — chiamate JS via Reflect
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
// Struttura di Stato Texture GPU
// ──────────────────────────────────────────────────────────────────────────────

struct TextureState {
    texture: JsValue,
    bind_group: JsValue,
    width: u32,
    height: u32,
}

// ──────────────────────────────────────────────────────────────────────────────
// Inizializzazione principale
// ──────────────────────────────────────────────────────────────────────────────

/// Punto di entrata asincrono esposto a TypeScript tramite `#[wasm_bindgen]`.
/// Prende l'ID del `<canvas>` HTML e avvia il render loop WebGPU.
pub async fn init_webgpu_canvas(canvas_id: &str) -> Result<(), JsValue> {
    let win = window().ok_or_else(|| JsValue::from_str("window non disponibile"))?;
    let doc = win
        .document()
        .ok_or_else(|| JsValue::from_str("document non disponibile"))?;

    // ── 1. Recupera il <canvas> HTML ──────────────────────────────────────────
    let canvas = doc
        .get_element_by_id(canvas_id)
        .ok_or_else(|| JsValue::from_str(&format!("Canvas '{}' non trovato nel DOM", canvas_id)))?;

    let canvas_js: JsValue = canvas.clone().into();

    // ── 2. Richiedi Adapter WebGPU ────────────────────────────────────────────
    let navigator: JsValue = win.navigator().into();
    let gpu = js_get(&navigator, "gpu").map_err(|_| {
        JsValue::from_str("navigator.gpu non disponibile — WebGPU non supportata in questo browser")
    })?;

    if gpu.is_undefined() || gpu.is_null() {
        return Err(JsValue::from_str(
            "WebGPU non disponibile. Assicurati di usare Chrome 113+, Edge 113+ o Firefox Nightly",
        ));
    }

    let adapter_opts = js_obj();
    js_set(&adapter_opts, "powerPreference", &JsValue::from_str("high-performance"))?;

    let adapter = JsFuture::from(
        js_call(&gpu, "requestAdapter", &[adapter_opts.into()])?
            .dyn_into::<js_sys::Promise>()
            .map_err(|_| JsValue::from_str("requestAdapter non ha restituito una Promise"))?,
    )
    .await?;

    if adapter.is_null() || adapter.is_undefined() {
        return Err(JsValue::from_str("Nessun adapter WebGPU trovato"));
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
            "Canvas.getContext('webgpu') ha restituito null",
        ));
    }

    let preferred_format = js_call(&gpu, "getPreferredCanvasFormat", &[])?;

    let config = js_obj();
    js_set(&config, "device", &device)?;
    js_set(&config, "format", &preferred_format)?;
    js_set(&config, "alphaMode", &JsValue::from_str("premultiplied"))?;
    js_call(&context, "configure", &[config.into()])?;

    // ── 5. Compila lo shader WGSL con campionatore texture ────────────────────
    let shader_desc = js_obj();
    js_set(&shader_desc, "label", &JsValue::from_str("Pizzico Texture WGSL"))?;
    js_set(&shader_desc, "code", &JsValue::from_str(WGSL_SHADER))?;
    let shader_module = js_call(&device, "createShaderModule", &[shader_desc.into()])?;

    // ── 6. Crea RenderPipeline con layout auto ────────────────────────────────
    let pipeline = create_pipeline(&device, &shader_module, &preferred_format)?;

    // ── 7. Crea Sampler bilineare ─────────────────────────────────────────────
    let sampler_desc = js_obj();
    js_set(&sampler_desc, "label", &JsValue::from_str("Pizzico Linear Sampler"))?;
    js_set(&sampler_desc, "magFilter", &JsValue::from_str("linear"))?;
    js_set(&sampler_desc, "minFilter", &JsValue::from_str("linear"))?;
    let sampler = js_call(&device, "createSampler", &[sampler_desc.into()])?;

    // ── 8. Stato della Texture dinamica condivisa ─────────────────────────────
    let texture_state: Rc<RefCell<Option<TextureState>>> = Rc::new(RefCell::new(None));

    // ── 9. Render loop perpetuo a 60 FPS via RAF ──────────────────────────────
    let raf_closure: Rc<RefCell<Option<Closure<dyn FnMut(f64)>>>> = Rc::new(RefCell::new(None));
    let raf_inner = raf_closure.clone();

    let device_c = device.clone();
    let queue_c = queue.clone();
    let context_c = context.clone();
    let pipeline_c = pipeline.clone();
    let canvas_c = canvas_js.clone();
    let sampler_c = sampler.clone();
    let texture_state_c = texture_state.clone();

    *raf_closure.borrow_mut() = Some(Closure::new(move |_timestamp: f64| {
        // Resize reattivo per HiDPI
        let _ = resize_canvas_to_display(&canvas_c, &context_c, &device_c, &preferred_format);

        // Render del frame corrente con campionamento texture dinamica
        let mut ts_borrow = texture_state_c.borrow_mut();
        if let Err(e) = render_frame(
            &device_c,
            &queue_c,
            &context_c,
            &pipeline_c,
            &sampler_c,
            &mut *ts_borrow,
        ) {
            web_sys::console::error_1(&e);
        }

        // Schedula frame successivo
        if let Some(w) = web_sys::window() {
            let cb = raf_inner
                .borrow()
                .as_ref()
                .map(|c| c.as_ref().unchecked_ref::<Function>().clone());
            if let Some(cb) = cb {
                let _ = w.request_animation_frame(&cb);
            }
        }
    }));

    // Primo frame di boot
    let cb = raf_closure
        .borrow()
        .as_ref()
        .map(|c| c.as_ref().unchecked_ref::<Function>().clone())
        .ok_or_else(|| JsValue::from_str("Closure RAF non inizializzato"))?;

    win.request_animation_frame(&cb)?;

    // Mantieni il closure attivo per l'intera durata della pagina
    if let Some(closure) = raf_closure.borrow_mut().take() {
        closure.forget();
    }

    Ok(())
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers privati di Rendering & Texture Upload
// ──────────────────────────────────────────────────────────────────────────────

fn create_pipeline(
    device: &JsValue,
    shader_module: &JsValue,
    format: &JsValue,
) -> Result<JsValue, JsValue> {
    let target = js_obj();
    js_set(&target, "format", format)?;

    let targets = js_sys::Array::new();
    targets.push(target.as_ref());

    let fragment = js_obj();
    js_set(&fragment, "module", shader_module)?;
    js_set(&fragment, "entryPoint", &JsValue::from_str("fs_main"))?;
    js_set(&fragment, "targets", targets.as_ref())?;

    let vertex = js_obj();
    js_set(&vertex, "module", shader_module)?;
    js_set(&vertex, "entryPoint", &JsValue::from_str("vs_main"))?;
    js_set(&vertex, "buffers", js_sys::Array::new().as_ref())?;

    let primitive = js_obj();
    js_set(&primitive, "topology", &JsValue::from_str("triangle-list"))?;

    let pipeline_desc = js_obj();
    js_set(&pipeline_desc, "label", &JsValue::from_str("Pizzico Texture Pipeline"))?;
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
    let client_width = js_get(canvas, "clientWidth")?
        .as_f64()
        .unwrap_or(800.0) as u32;
    let client_height = js_get(canvas, "clientHeight")?
        .as_f64()
        .unwrap_or(600.0) as u32;

    let current_width = js_get(canvas, "width")?.as_f64().unwrap_or(0.0) as u32;
    let current_height = js_get(canvas, "height")?.as_f64().unwrap_or(0.0) as u32;

    if client_width > 0 && client_height > 0 && (current_width != client_width || current_height != client_height) {
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

fn update_texture_if_dirty(
    device: &JsValue,
    queue: &JsValue,
    pipeline: &JsValue,
    sampler: &JsValue,
    texture_state: &mut Option<TextureState>,
) -> Result<Option<JsValue>, JsValue> {
    let dims = crate::get_document_dimensions();
    let doc_w = if dims.len() >= 2 && dims[0] > 0 { dims[0] } else { 800 };
    let doc_h = if dims.len() >= 2 && dims[1] > 0 { dims[1] } else { 600 };

    let is_dirty = crate::is_document_dirty();
    let need_recreate = match texture_state {
        Some(st) => st.width != doc_w || st.height != doc_h,
        None => true,
    };

    if need_recreate {
        let size = js_sys::Array::new();
        size.push(&JsValue::from_f64(doc_w as f64));
        size.push(&JsValue::from_f64(doc_h as f64));
        size.push(&JsValue::from_f64(1.0));

        let texture_desc = js_obj();
        js_set(&texture_desc, "label", &JsValue::from_str("Pizzico Composite Texture"))?;
        js_set(&texture_desc, "size", &size)?;
        js_set(&texture_desc, "format", &JsValue::from_str("rgba8unorm"))?;
        // GPUTextureUsage.TEXTURE_BINDING (4) | GPUTextureUsage.COPY_DST (2) = 6
        js_set(&texture_desc, "usage", &JsValue::from_f64(6.0))?;
        let texture = js_call(device, "createTexture", &[texture_desc.into()])?;
        let texture_view = js_call(&texture, "createView", &[])?;

        let bg_layout = js_call(pipeline, "getBindGroupLayout", &[JsValue::from_f64(0.0)])?;

        let entry0 = js_obj();
        js_set(&entry0, "binding", &JsValue::from_f64(0.0))?;
        js_set(&entry0, "resource", &texture_view)?;

        let entry1 = js_obj();
        js_set(&entry1, "binding", &JsValue::from_f64(1.0))?;
        js_set(&entry1, "resource", sampler)?;

        let entries = js_sys::Array::new();
        entries.push(&entry0);
        entries.push(&entry1);

        let bg_desc = js_obj();
        js_set(&bg_desc, "label", &JsValue::from_str("Pizzico Texture BindGroup"))?;
        js_set(&bg_desc, "layout", &bg_layout)?;
        js_set(&bg_desc, "entries", &entries)?;

        let bind_group = js_call(device, "createBindGroup", &[bg_desc.into()])?;

        *texture_state = Some(TextureState {
            texture,
            bind_group,
            width: doc_w,
            height: doc_h,
        });
    }

    if is_dirty || need_recreate {
        if let Some(ref st) = texture_state {
            let buffer = crate::get_composite_buffer();
            if !buffer.is_empty() {
                let uint8_arr = js_sys::Uint8Array::from(&buffer[..]);

                let dest = js_obj();
                js_set(&dest, "texture", &st.texture)?;

                let layout = js_obj();
                js_set(&layout, "bytesPerRow", &JsValue::from_f64((st.width * 4) as f64))?;
                js_set(&layout, "rowsPerImage", &JsValue::from_f64(st.height as f64))?;

                let size = js_sys::Array::new();
                size.push(&JsValue::from_f64(st.width as f64));
                size.push(&JsValue::from_f64(st.height as f64));
                size.push(&JsValue::from_f64(1.0));

                js_call(
                    queue,
                    "writeTexture",
                    &[dest.into(), uint8_arr.into(), layout.into(), size.into()],
                )?;
            }
        }
        crate::set_document_dirty(false);
    }

    Ok(texture_state.as_ref().map(|st| st.bind_group.clone()))
}

fn render_frame(
    device: &JsValue,
    queue: &JsValue,
    context: &JsValue,
    pipeline: &JsValue,
    sampler: &JsValue,
    texture_state: &mut Option<TextureState>,
) -> Result<(), JsValue> {
    let bind_group = update_texture_if_dirty(device, queue, pipeline, sampler, texture_state)?;

    let texture = js_call(context, "getCurrentTexture", &[])?;
    let texture_view = js_call(&texture, "createView", &[])?;

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

    let encoder_desc = js_obj();
    js_set(&encoder_desc, "label", &JsValue::from_str("Pizzico Frame Encoder"))?;
    let encoder = js_call(device, "createCommandEncoder", &[encoder_desc.into()])?;

    let render_pass = js_call(&encoder, "beginRenderPass", &[render_pass_desc.into()])?;
    js_call(&render_pass, "setPipeline", &[pipeline.clone()])?;

    if let Some(bg) = bind_group {
        js_call(
            &render_pass,
            "setBindGroup",
            &[JsValue::from_f64(0.0), bg],
        )?;
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
    }
    js_call(&render_pass, "end", &[])?;

    let command_buffer = js_call(&encoder, "finish", &[])?;
    let commands = js_sys::Array::new();
    commands.push(&command_buffer);
    js_call(queue, "submit", &[commands.into()])?;

    Ok(())
}
