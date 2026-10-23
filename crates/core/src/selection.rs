// Pizzico — crates/core/src/selection.rs
// Riferimento manifesto: §3.1, §4, §10 Fase 1
// Licenza: MIT OR Apache-2.0

//! Modello della selezione rettangolare (Marquee Selection).
//! Gestisce coordinate documento e test di intersezione/clipping per il disegno raster.

use serde::{Deserialize, Serialize};

/// Selezione rettangolare definita in coordinate logiche documento.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct RectSelection {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
    pub active: bool,
}

impl Default for RectSelection {
    fn default() -> Self {
        Self {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            active: false,
        }
    }
}

impl RectSelection {
    /// Crea una nuova selezione attiva con coordinate e dimensioni specificate.
    pub fn new(x: u32, y: u32, width: u32, height: u32) -> Self {
        Self {
            x,
            y,
            width,
            height,
            active: width > 0 && height > 0,
        }
    }

    /// Crea una selezione vuota / inattiva.
    pub fn none() -> Self {
        Self::default()
    }

    /// Verifica se il punto `(px, py)` in coordinate documento è contenuto nella selezione attiva.
    /// Se la selezione non è attiva, restituisce sempre `true` (nessun clipping).
    pub fn contains(&self, px: u32, py: u32) -> bool {
        if !self.active {
            return true;
        }
        px >= self.x && px < self.x + self.width && py >= self.y && py < self.y + self.height
    }

    /// Calcola l'intersezione tra la selezione (in coordinate documento)
    /// e l'area di un livello traslato di `(layer_offset_x, layer_offset_y)`.
    /// Restituisce `(local_min_x, local_min_y, local_max_x, local_max_y)` in coordinate locali del livello,
    /// oppure `None` se non vi è alcuna intersezione.
    pub fn to_layer_local_clip(
        &self,
        layer_offset_x: i32,
        layer_offset_y: i32,
        layer_w: u32,
        layer_h: u32,
    ) -> Option<(u32, u32, u32, u32)> {
        if !self.active {
            return Some((0, 0, layer_w.saturating_sub(1), layer_h.saturating_sub(1)));
        }

        let sel_min_x = self.x as i32;
        let sel_min_y = self.y as i32;
        let sel_max_x = (self.x + self.width).saturating_sub(1) as i32;
        let sel_max_y = (self.y + self.height).saturating_sub(1) as i32;

        let loc_min_x = (sel_min_x - layer_offset_x).max(0);
        let loc_min_y = (sel_min_y - layer_offset_y).max(0);
        let loc_max_x = (sel_max_x - layer_offset_x).min(layer_w as i32 - 1);
        let loc_max_y = (sel_max_y - layer_offset_y).min(layer_h as i32 - 1);

        if loc_min_x > loc_max_x || loc_min_y > loc_max_y {
            None
        } else {
            Some((loc_min_x as u32, loc_min_y as u32, loc_max_x as u32, loc_max_y as u32))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rect_selection_contains() {
        let sel = RectSelection::new(50, 50, 100, 100);
        assert!(sel.active);
        assert!(sel.contains(50, 50));
        assert!(sel.contains(149, 149));
        assert!(!sel.contains(49, 50));
        assert!(!sel.contains(150, 50));
        assert!(!sel.contains(50, 150));
    }

    #[test]
    fn test_inactive_selection_allows_everything() {
        let sel = RectSelection::none();
        assert!(!sel.active);
        assert!(sel.contains(0, 0));
        assert!(sel.contains(1000, 1000));
    }

    #[test]
    fn test_to_layer_local_clip() {
        let sel = RectSelection::new(100, 100, 200, 200);
        // Livello posizionato a (50, 50) di dimensione 400x400
        let clip = sel.to_layer_local_clip(50, 50, 400, 400);
        assert_eq!(clip, Some((50, 50, 249, 249)));

        // Livello completamente fuori dalla selezione
        let clip_outside = sel.to_layer_local_clip(500, 500, 200, 200);
        assert_eq!(clip_outside, None);
    }
}
