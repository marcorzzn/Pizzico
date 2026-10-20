// Pizzico — crates/commands/src/executor.rs
// Riferimento manifesto: §4, §5.5
// Licenza: MIT OR Apache-2.0

//! Esecutore dei comandi applicativi con snapshot per Undo/Redo.

use pizzico_core::{Document, HistoryStack, Layer};

pub struct CommandExecutor {
    pub history: HistoryStack,
}

impl Default for CommandExecutor {
    fn default() -> Self {
        Self {
            history: HistoryStack::new(50),
        }
    }
}

impl CommandExecutor {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn execute(&mut self, doc: &mut Document, command_id: &str) -> Result<(), String> {
        // Salva lo stato prima della mutazione
        self.history.push_snapshot(doc);

        match command_id {
            "layer.new_raster" => {
                let id = doc.allocate_layer_id();
                let layer = Layer::new_raster(id, format!("Livello {}", id), doc.width, doc.height);
                doc.add_layer(layer);
                Ok(())
            }
            "edit.undo" => {
                if let Some(prev) = self.history.undo(doc) {
                    *doc = prev;
                    Ok(())
                } else {
                    Err("Nessuna azione da annullare".to_string())
                }
            }
            "edit.redo" => {
                if let Some(next) = self.history.redo(doc) {
                    *doc = next;
                    Ok(())
                } else {
                    Err("Nessuna azione da ripristinare".to_string())
                }
            }
            _ => Err(format!("Comando non implementato: {}", command_id)),
        }
    }
}
