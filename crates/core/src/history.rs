// Pizzico — crates/core/src/history.rs
// Riferimento manifesto: §3.1, §4
// Licenza: MIT OR Apache-2.0

//! Sistema di Undo/Redo e gestione della storia delle modifiche.

use crate::document::Document;

pub struct HistoryStack {
    undo_stack: Vec<Document>,
    redo_stack: Vec<Document>,
    max_history_depth: usize,
}

impl HistoryStack {
    pub fn new(max_depth: usize) -> Self {
        Self {
            undo_stack: Vec::new(),
            redo_stack: Vec::new(),
            max_history_depth: max_depth,
        }
    }

    pub fn push_snapshot(&mut self, current: &Document) {
        if self.undo_stack.len() >= self.max_history_depth {
            self.undo_stack.remove(0);
        }
        self.undo_stack.push(current.clone());
        self.redo_stack.clear();
    }

    pub fn undo(&mut self, current: &Document) -> Option<Document> {
        if let Some(prev) = self.undo_stack.pop() {
            self.redo_stack.push(current.clone());
            Some(prev)
        } else {
            None
        }
    }

    pub fn redo(&mut self, current: &Document) -> Option<Document> {
        if let Some(next) = self.redo_stack.pop() {
            self.undo_stack.push(current.clone());
            Some(next)
        } else {
            None
        }
    }

    pub fn can_undo(&self) -> bool {
        !self.undo_stack.is_empty()
    }

    pub fn can_redo(&self) -> bool {
        !self.redo_stack.is_empty()
    }
}
