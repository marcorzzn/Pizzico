// Pizzico — crates/commands/src/registry.rs
// Riferimento manifesto: §4, §5.5
// Licenza: MIT OR Apache-2.0

//! Registro comandi con metadati, scorciatoie e categorie per ⌘K Palette.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum CommandCategory {
    File,
    Edit,
    Layer,
    Select,
    Filter,
    View,
    Color,
    Vector,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandDescriptor {
    pub id: String,
    pub title: String,
    pub category: CommandCategory,
    pub shortcut: Option<String>,
    pub description: String,
}

pub struct CommandRegistry {
    commands: Vec<CommandDescriptor>,
}

impl Default for CommandRegistry {
    fn default() -> Self {
        let mut reg = Self {
            commands: Vec::new(),
        };
        reg.register_builtins();
        reg
    }
}

impl CommandRegistry {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn register(&mut self, cmd: CommandDescriptor) {
        self.commands.push(cmd);
    }

    pub fn search(&self, query: &str) -> Vec<&CommandDescriptor> {
        let q = query.to_lowercase();
        self.commands
            .iter()
            .filter(|c| c.title.to_lowercase().contains(&q) || c.id.to_lowercase().contains(&q))
            .collect()
    }

    fn register_builtins(&mut self) {
        self.register(CommandDescriptor {
            id: "file.new".to_string(),
            title: "Nuovo Documento".to_string(),
            category: CommandCategory::File,
            shortcut: Some("Ctrl+N".to_string()),
            description: "Crea un nuovo documento vuoto".to_string(),
        });
        self.register(CommandDescriptor {
            id: "edit.undo".to_string(),
            title: "Annulla".to_string(),
            category: CommandCategory::Edit,
            shortcut: Some("Ctrl+Z".to_string()),
            description: "Annulla l'ultima modifica effettuata".to_string(),
        });
        self.register(CommandDescriptor {
            id: "edit.redo".to_string(),
            title: "Ripeti".to_string(),
            category: CommandCategory::Edit,
            shortcut: Some("Ctrl+Shift+Z".to_string()),
            description: "Ripristina l'ultima modifica annullata".to_string(),
        });
        self.register(CommandDescriptor {
            id: "layer.new_raster".to_string(),
            title: "Nuovo Livello Raster".to_string(),
            category: CommandCategory::Layer,
            shortcut: Some("Ctrl+Shift+N".to_string()),
            description: "Aggiunge un livello pixel vuoto".to_string(),
        });
        self.register(CommandDescriptor {
            id: "filter.box_blur".to_string(),
            title: "Sfocatura Box Blur O(1)".to_string(),
            category: CommandCategory::Filter,
            shortcut: None,
            description: "Applica sfocatura ricorsiva a tempo costante".to_string(),
        });
        self.register(CommandDescriptor {
            id: "filter.median".to_string(),
            title: "Filtro Mediano O(1)".to_string(),
            category: CommandCategory::Filter,
            shortcut: None,
            description: "Rimozione rumore impulsivo con istogrammi colonna".to_string(),
        });
        self.register(CommandDescriptor {
            id: "vector.pen_tool".to_string(),
            title: "Strumento Penna (Bézier)".to_string(),
            category: CommandCategory::Vector,
            shortcut: Some("P".to_string()),
            description: "Disegna curve parametriche cubiche".to_string(),
        });
        self.register(CommandDescriptor {
            id: "vector.curvature_tool".to_string(),
            title: "Strumento Curvatura (κ-Curves)".to_string(),
            category: CommandCategory::Vector,
            shortcut: Some("Shift+~".to_string()),
            description: "Disegna curve con continuità di curvatura garantita".to_string(),
        });
    }
}
