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
}
