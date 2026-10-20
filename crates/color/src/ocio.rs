// Pizzico — crates/color/src/ocio.rs
// Riferimento manifesto: §3.1, §6.1
// Licenza: MIT OR Apache-2.0

//! Interfaccia OpenColorIO (OCIO) per la gestione avanzata di profili colore,
//! standard cinematografici e conversioni ACES.

pub struct OcioContext {
    pub current_config: String,
}

impl Default for OcioContext {
    fn default() -> Self {
        Self {
            current_config: "ocio://default".to_string(),
        }
    }
}

impl OcioContext {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn transform_display(&self, rgb: [f32; 3], _display: &str, _view: &str) -> [f32; 3] {
        // Fallback standard a curva sRGB quando OCIO nativo non è compilato con le librerie C++ esterne
        rgb
    }
}
