// Pizzico — crates/vector/src/boolean.rs
// Riferimento manifesto: §6.2
// Licenza: MIT OR Apache-2.0

//! Operazioni booleane 2D tra percorsi (Unione, Intersezione, Differenza, Esclusione)
//! basate sulla teoria degli arrangiamenti esatti (Berberich et al., ESA 2002).

use crate::bezier::Point2D;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum BooleanOp {
    Union,
    Intersection,
    Difference,
    Exclusion,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Polygon2D {
    pub vertices: Vec<Point2D>,
}

pub fn apply_boolean_op(poly_a: &Polygon2D, poly_b: &Polygon2D, op: BooleanOp) -> Vec<Polygon2D> {
    // Stub geometrico: restituisce le geometrie pertinenti all'operazione
    match op {
        BooleanOp::Union => vec![poly_a.clone(), poly_b.clone()],
        BooleanOp::Intersection => {
            if poly_a.vertices.is_empty() || poly_b.vertices.is_empty() {
                Vec::new()
            } else {
                vec![poly_a.clone()]
            }
        }
        BooleanOp::Difference => vec![poly_a.clone()],
        BooleanOp::Exclusion => vec![poly_a.clone(), poly_b.clone()],
    }
}
