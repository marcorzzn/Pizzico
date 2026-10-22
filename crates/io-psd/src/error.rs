// Pizzico — crates/io-psd/src/error.rs
// Riferimento manifesto: §3.1, §6.5
// Licenza: MIT OR Apache-2.0

//! Tipi di errore per il parser Adobe Photoshop PSD/PSB.

use thiserror::Error;

#[derive(Error, Debug)]
pub enum PsdError {
    #[error("Magic bytes non validi: atteso '8BPS', trovato {0:?}")]
    InvalidSignature([u8; 4]),

    #[error("Versione PSD/PSB non supportata: {0} (supportate: 1 = PSD, 2 = PSB)")]
    UnsupportedVersion(u16),

    #[error("Modalità colore non supportata o non valida: {0}")]
    InvalidColorMode(u16),

    #[error("Profondità di colore non supportata: {0} bit per canale (supportati: 8 bit)")]
    UnsupportedDepth(u16),

    #[error("Blend mode key non valida: {0:?}")]
    InvalidBlendMode([u8; 4]),

    #[error("Metodo di compressione non supportato: {0} (supportati: 0 = Raw, 1 = RLE PackBits)")]
    UnsupportedCompression(u16),

    #[error("Errore durante la decompressione PackBits RLE: {0}")]
    RleDecompressionError(String),

    #[error("Struttura Layer Record non valida: {0}")]
    InvalidLayerRecord(String),

    #[error("Fine inattesa dei dati del file PSD (EOF prematuro)")]
    UnexpectedEof,

    #[error("Errore I/O durante la lettura binaria: {0}")]
    Io(#[from] std::io::Error),
}
