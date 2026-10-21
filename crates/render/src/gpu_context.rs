// Pizzico — crates/render/src/gpu_context.rs
// Riferimento manifesto: §3.1, §6.2
// Licenza: MIT OR Apache-2.0

//! Gestione del contesto e dispositivo WebGPU / wgpu.

pub struct GpuContext {
    pub instance: wgpu::Instance,
    pub adapter: Option<wgpu::Adapter>,
    pub device: Option<wgpu::Device>,
    pub queue: Option<wgpu::Queue>,
}

impl Default for GpuContext {
    fn default() -> Self {
        Self::new()
    }
}

impl GpuContext {
    pub fn new() -> Self {
        let instance = wgpu::Instance::default();
        Self {
            instance,
            adapter: None,
            device: None,
            queue: None,
        }
    }

    pub async fn initialize(&mut self) -> Result<(), String> {
        let adapter = self
            .instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::HighPerformance,
                compatible_surface: None,
                force_fallback_adapter: false,
            })
            .await
            .ok_or_else(|| "Nessun adattatore WebGPU/wgpu compatibile trovato".to_string())?;

        let (device, queue) = adapter
            .request_device(&wgpu::DeviceDescriptor::default(), None)
            .await
            .map_err(|e| format!("Errore creazione dispositivo wgpu: {}", e))?;

        self.adapter = Some(adapter);
        self.device = Some(device);
        self.queue = Some(queue);

        Ok(())
    }

    pub const RECTANGLE_WGSL: &'static str = r#"
struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) in_vertex_index: u32) -> VertexOutput {
    var out: VertexOutput;
    var pos = array<vec2<f32>, 6>(
        vec2<f32>(-0.6, -0.4),
        vec2<f32>( 0.6, -0.4),
        vec2<f32>( 0.6,  0.4),
        vec2<f32>(-0.6, -0.4),
        vec2<f32>( 0.6,  0.4),
        vec2<f32>(-0.6,  0.4)
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
"#;

    /// Crea la pipeline di rendering per il rettangolo colorato
    pub fn create_rectangle_pipeline(
        &self,
        target_format: wgpu::TextureFormat,
    ) -> Result<wgpu::RenderPipeline, String> {
        let device = self
            .device
            .as_ref()
            .ok_or_else(|| "Dispositivo wgpu non inizializzato".to_string())?;

        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Pizzico Rectangle WGSL Shader"),
            source: wgpu::ShaderSource::Wgsl(Self::RECTANGLE_WGSL.into()),
        });

        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Pizzico Rectangle Pipeline Layout"),
            bind_group_layouts: &[],
            push_constant_ranges: &[],
        });

        let pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("Pizzico Rectangle Render Pipeline"),
            layout: Some(&pipeline_layout),
            vertex: wgpu::VertexState {
                module: &shader,
                entry_point: Some("vs_main"),
                compilation_options: Default::default(),
                buffers: &[],
            },
            fragment: Some(wgpu::FragmentState {
                module: &shader,
                entry_point: Some("fs_main"),
                compilation_options: Default::default(),
                targets: &[Some(wgpu::ColorTargetState {
                    format: target_format,
                    blend: Some(wgpu::BlendState::ALPHA_BLENDING),
                    write_mask: wgpu::ColorWrites::ALL,
                })],
            }),
            primitive: wgpu::PrimitiveState {
                topology: wgpu::PrimitiveTopology::TriangleList,
                strip_index_format: None,
                front_face: wgpu::FrontFace::Ccw,
                cull_mode: None,
                unclipped_depth: false,
                polygon_mode: wgpu::PolygonMode::Fill,
                conservative: false,
            },
            depth_stencil: None,
            multisample: wgpu::MultisampleState::default(),
            multiview: None,
            cache: None,
        });

        Ok(pipeline)
    }
}

