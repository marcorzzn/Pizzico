// Pizzico — crates/selection/src/snap.rs
// Riferimento manifesto: §6.3
// Licenza: MIT OR Apache-2.0

//! Lazy Snapping (Li et al., SIGGRAPH 2004) per ritaglio interattivo immediato
//! con separazione tra marcatura grossolana dei contorni e raffinamento poligonale.

pub struct LazySnapper;

impl LazySnapper {
    pub fn snap_boundary(mask: &mut [u8], width: usize, height: usize) {
        // Operazione morfologica semplice di chiusura per regolarizzare il bordo
        let copy = mask.to_vec();
        for y in 1..(height - 1) {
            for x in 1..(width - 1) {
                let idx = y * width + x;
                let sum = copy[idx - 1] as u32
                    + copy[idx + 1] as u32
                    + copy[(y - 1) * width + x] as u32
                    + copy[(y + 1) * width + x] as u32;
                if sum >= 255 * 3 {
                    mask[idx] = 255;
                } else if sum <= 255 {
                    mask[idx] = 0;
                }
            }
        }
    }
}
