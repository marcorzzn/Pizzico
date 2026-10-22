// Pizzico — crates/io-psd/src/rle.rs
// Riferimento manifesto: §6.5
// Licenza: MIT OR Apache-2.0

//! Algoritmo di compressione e decompressione RLE PackBits (Apple Macintosh Standard).
//!
//! Usato nel formato PSD per comprimere i dati dei singoli canali e delle scansioni.
//! Specifica:
//! - Un byte di controllo `b` interpretato come intero con segno a 8 bit (`i8`):
//!   - `0 <= b <= 127`: copia letteralmente i successivi `b + 1` byte.
//!   - `-127 <= b <= -1`: ripeti il byte successivo `(-b) + 1` (ovvero `1 - b`) volte.
//!   - `b == -128` (`0x80`): no-op (ignorato).

use crate::error::PsdError;

/// Decomprime un flusso di byte PackBits RLE fino al raggiungimento di `expected_len` byte.
pub fn decompress_packbits(input: &[u8], expected_len: usize) -> Result<Vec<u8>, PsdError> {
    let mut output = Vec::with_capacity(expected_len);
    let mut i = 0;

    while i < input.len() && output.len() < expected_len {
        let b = input[i] as i8;
        i += 1;

        if b >= 0 {
            // Copia letterale di (b + 1) byte
            let count = (b as usize) + 1;
            if i + count > input.len() {
                return Err(PsdError::RleDecompressionError(format!(
                    "Fine inattesa durante la copia letterale di {} byte (offset: {})",
                    count, i
                )));
            }
            output.extend_from_slice(&input[i..i + count]);
            i += count;
        } else if b != -128 {
            // Ripetizione del byte successivo per (1 - b) volte
            let count = (1 - (b as isize)) as usize;
            if i >= input.len() {
                return Err(PsdError::RleDecompressionError(
                    "Byte mancante per la ripetizione PackBits".to_string(),
                ));
            }
            let byte_to_repeat = input[i];
            i += 1;
            output.resize(output.len() + count, byte_to_repeat);
        }
        // Se b == -128, è un no-op definito dalla specifica Apple/Adobe
    }

    if output.len() < expected_len {
        return Err(PsdError::RleDecompressionError(format!(
            "Dati decompressi insufficienti: ottenuti {} byte, attesi {}",
            output.len(),
            expected_len
        )));
    }

    output.truncate(expected_len);
    Ok(output)
}

/// Comprime un buffer di byte usando l'algoritmo PackBits RLE.
/// Usato per la generazione di file PSD sintetici e test di regressione.
pub fn compress_packbits(input: &[u8]) -> Vec<u8> {
    let mut output = Vec::new();
    let mut i = 0;

    while i < input.len() {
        // Cerca sequenze ripetute dello stesso byte
        let mut run_len = 1;
        while i + run_len < input.len()
            && input[i + run_len] == input[i]
            && run_len < 128
        {
            run_len += 1;
        }

        if run_len >= 3 {
            // Sequenza ripetuta: scrivi flag (1 - run_len) come u8 e il byte ripetuto
            let flag = (1 - (run_len as isize)) as i8 as u8;
            output.push(flag);
            output.push(input[i]);
            i += run_len;
        } else {
            // Sequenza letterale (non ripetuta)
            let mut literal_len = 0;
            while i + literal_len < input.len() && literal_len < 128 {
                // Verifica se inizia una sequenza ripetuta di almeno 3 byte
                if i + literal_len + 2 < input.len()
                    && input[i + literal_len] == input[i + literal_len + 1]
                    && input[i + literal_len] == input[i + literal_len + 2]
                {
                    break;
                }
                literal_len += 1;
            }

            if literal_len > 0 {
                let flag = (literal_len - 1) as u8;
                output.push(flag);
                output.extend_from_slice(&input[i..i + literal_len]);
                i += literal_len;
            }
        }
    }

    output
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_packbits_literal_copy() {
        // Byte 0x02 = copia letterale di 3 byte: [10, 20, 30]
        let input = vec![0x02, 10, 20, 30];
        let decompressed = decompress_packbits(&input, 3).expect("Decompressione riuscita");
        assert_eq!(decompressed, vec![10, 20, 30]);
    }

    #[test]
    fn test_packbits_repeat() {
        // Byte 0xFE = -2 in i8 -> (1 - (-2)) = 3 ripetizioni del byte 42
        let input = vec![0xFE, 42];
        let decompressed = decompress_packbits(&input, 3).expect("Decompressione riuscita");
        assert_eq!(decompressed, vec![42, 42, 42]);
    }

    #[test]
    fn test_packbits_roundtrip() {
        let mut original = Vec::new();
        // 50 byte ripetuti (valore 7)
        original.extend(vec![7u8; 50]);
        // 10 byte casuali letterali
        original.extend_from_slice(&[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        // 80 byte ripetuti (valore 255)
        original.extend(vec![255u8; 80]);

        let compressed = compress_packbits(&original);
        assert!(compressed.len() < original.len());

        let decompressed = decompress_packbits(&compressed, original.len())
            .expect("Roundtrip decompression riuscita");
        assert_eq!(original, decompressed);
    }
}
