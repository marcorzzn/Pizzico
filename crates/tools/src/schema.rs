// Pizzico — crates/tools/src/schema.rs
// Licenza: MIT OR Apache-2.0

//! Schema di uno strumento: identificativi, parametri tipizzati, validazione.
//!
//! Lo schema è **dati**, non codice: descrive cosa un tool chiede all'utente, non
//! come lo esegue. La validazione è fail-closed: uno schema invalido non entra nel
//! registro e non può raggiungere la UI.

use std::fmt;

use serde::{Deserialize, Serialize};

/// Lunghezza massima di un identificativo (strumento o parametro).
pub const MAX_ID_LEN: usize = 64;
/// Lunghezza massima di un'etichetta visibile.
pub const MAX_LABEL_LEN: usize = 64;
/// Lunghezza massima della descrizione contestuale.
pub const MAX_DESCRIPTION_LEN: usize = 512;
/// Numero massimo di parametri per strumento.
pub const MAX_PARAMS: usize = 32;
/// Lunghezza massima di una scorciatoia ("B", "Ctrl+Shift+Z").
pub const MAX_SHORTCUT_LEN: usize = 16;

/// Errore di costruzione o validazione di uno schema.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SchemaError {
    /// Identificativo non conforme alla forma richiesta.
    InvalidId { field: &'static str, value: String },
    /// Testo che deve essere presente ma è vuoto.
    EmptyText { field: &'static str },
    /// Testo oltre il limite consentito.
    TextTooLong {
        field: &'static str,
        len: usize,
        max: usize,
    },
    /// Intervallo incoerente o non finito.
    InvalidRange { param: String },
    /// Valore predefinito fuori dall'intervallo dichiarato.
    InvalidDefault { param: String },
    /// Colore non nel formato `#rrggbb` o `#rrggbbaa`.
    InvalidColor { param: String, value: String },
    /// Una scelta senza opzioni.
    EmptyOptions { param: String },
    /// Due opzioni con lo stesso valore.
    DuplicateOption { param: String, value: String },
    /// Il predefinito non è una delle opzioni.
    UnknownOption { param: String, value: String },
    /// Due parametri con lo stesso identificativo.
    DuplicateParam { param: String },
    /// Troppi parametri per un solo strumento.
    TooManyParams { count: usize },
}

impl fmt::Display for SchemaError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            SchemaError::InvalidId { field, value } => write!(
                f,
                "{field} non valido: {value:?}; richiesto [a-z][a-z0-9_-]*, massimo {MAX_ID_LEN} caratteri"
            ),
            SchemaError::EmptyText { field } => write!(f, "{field} non può essere vuoto"),
            SchemaError::TextTooLong { field, len, max } => {
                write!(f, "{field} troppo lungo: {len} caratteri (massimo {max})")
            }
            SchemaError::InvalidRange { param } => write!(
                f,
                "intervallo non valido per il parametro {param:?}: richiesto min < max e passo positivo"
            ),
            SchemaError::InvalidDefault { param } => write!(
                f,
                "il valore predefinito del parametro {param:?} è fuori dall'intervallo dichiarato"
            ),
            SchemaError::InvalidColor { param, value } => write!(
                f,
                "colore non valido per il parametro {param:?}: {value:?} (richiesto #rrggbb o #rrggbbaa)"
            ),
            SchemaError::EmptyOptions { param } => {
                write!(f, "la scelta {param:?} non ha opzioni")
            }
            SchemaError::DuplicateOption { param, value } => write!(
                f,
                "opzione duplicata {value:?} nella scelta {param:?}"
            ),
            SchemaError::UnknownOption { param, value } => write!(
                f,
                "il predefinito {value:?} non è fra le opzioni della scelta {param:?}"
            ),
            SchemaError::DuplicateParam { param } => {
                write!(f, "parametro duplicato: {param:?}")
            }
            SchemaError::TooManyParams { count } => {
                write!(f, "troppi parametri: {count} (massimo {MAX_PARAMS})")
            }
        }
    }
}

impl std::error::Error for SchemaError {}

/// `true` se `value` è un identificativo conforme: minuscola iniziale, poi
/// minuscole, cifre, `_` e `-`.
fn is_slug(value: &str) -> bool {
    if value.is_empty() || value.len() > MAX_ID_LEN {
        return false;
    }
    let Some(first) = value.chars().next() else {
        return false;
    };
    first.is_ascii_lowercase()
        && value
            .chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_' || c == '-')
}

/// Identificativo stabile di uno strumento.
///
/// Non è una stringa libera: si costruisce solo con [`ToolId::parse`], e anche la
/// deserializzazione JSON passa dalla stessa validazione.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct ToolId(String);

impl ToolId {
    /// Costruisce un identificativo valido.
    pub fn parse(value: impl Into<String>) -> Result<Self, SchemaError> {
        let value = value.into();
        if !is_slug(&value) {
            return Err(SchemaError::InvalidId {
                field: "id dello strumento",
                value,
            });
        }
        Ok(Self(value))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for ToolId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

impl Serialize for ToolId {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.0)
    }
}

impl<'de> Deserialize<'de> for ToolId {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        ToolId::parse(value).map_err(serde::de::Error::custom)
    }
}

/// Una voce di un parametro `choice`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ChoiceOption {
    pub value: String,
    pub label: String,
}

impl ChoiceOption {
    pub fn new(value: impl Into<String>, label: impl Into<String>) -> Self {
        Self {
            value: value.into(),
            label: label.into(),
        }
    }
}

/// Parametro dichiarato da uno strumento.
///
/// Il `tag` JSON è `kind`: `{"kind":"integer","id":"size",...}`. I campi numerici
/// sono nelle **unità mostrate all'utente**; la conversione verso il motore di
/// disegno avviene al confine di esecuzione.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum ParamSpec {
    Integer {
        id: String,
        label: String,
        min: i64,
        max: i64,
        step: i64,
        default: i64,
        #[serde(skip_serializing_if = "Option::is_none")]
        unit: Option<String>,
    },
    Float {
        id: String,
        label: String,
        min: f64,
        max: f64,
        step: f64,
        default: f64,
        #[serde(skip_serializing_if = "Option::is_none")]
        unit: Option<String>,
    },
    Color {
        id: String,
        label: String,
        default: String,
    },
    Boolean {
        id: String,
        label: String,
        default: bool,
    },
    Choice {
        id: String,
        label: String,
        options: Vec<ChoiceOption>,
        default: String,
    },
}

impl ParamSpec {
    /// Parametro intero (slider a passi interi). `unit` è solo presentazione.
    pub fn integer(
        id: impl Into<String>,
        label: impl Into<String>,
        min: i64,
        max: i64,
        step: i64,
        default: i64,
        unit: Option<&str>,
    ) -> Self {
        Self::Integer {
            id: id.into(),
            label: label.into(),
            min,
            max,
            step,
            default,
            unit: unit.map(ToOwned::to_owned),
        }
    }

    /// Parametro decimale.
    pub fn float(
        id: impl Into<String>,
        label: impl Into<String>,
        min: f64,
        max: f64,
        step: f64,
        default: f64,
        unit: Option<&str>,
    ) -> Self {
        Self::Float {
            id: id.into(),
            label: label.into(),
            min,
            max,
            step,
            default,
            unit: unit.map(ToOwned::to_owned),
        }
    }

    /// Colore esadecimale (`#rrggbb` o `#rrggbbaa`).
    pub fn color(
        id: impl Into<String>,
        label: impl Into<String>,
        default: impl Into<String>,
    ) -> Self {
        Self::Color {
            id: id.into(),
            label: label.into(),
            default: default.into(),
        }
    }

    /// Interruttore booleano.
    pub fn boolean(id: impl Into<String>, label: impl Into<String>, default: bool) -> Self {
        Self::Boolean {
            id: id.into(),
            label: label.into(),
            default,
        }
    }

    /// Scelta fra opzioni esplicite; `default` deve essere uno dei `value`.
    pub fn choice(
        id: impl Into<String>,
        label: impl Into<String>,
        options: Vec<ChoiceOption>,
        default: impl Into<String>,
    ) -> Self {
        Self::Choice {
            id: id.into(),
            label: label.into(),
            options,
            default: default.into(),
        }
    }

    pub fn id(&self) -> &str {
        match self {
            ParamSpec::Integer { id, .. }
            | ParamSpec::Float { id, .. }
            | ParamSpec::Color { id, .. }
            | ParamSpec::Boolean { id, .. }
            | ParamSpec::Choice { id, .. } => id,
        }
    }

    pub fn label(&self) -> &str {
        match self {
            ParamSpec::Integer { label, .. }
            | ParamSpec::Float { label, .. }
            | ParamSpec::Color { label, .. }
            | ParamSpec::Boolean { label, .. }
            | ParamSpec::Choice { label, .. } => label,
        }
    }

    /// Valida il parametro in isolamento.
    pub fn validate(&self) -> Result<(), SchemaError> {
        if !is_slug(self.id()) {
            return Err(SchemaError::InvalidId {
                field: "id del parametro",
                value: self.id().to_string(),
            });
        }
        let label = self.label();
        if label.trim().is_empty() {
            return Err(SchemaError::EmptyText {
                field: "etichetta del parametro",
            });
        }
        if label.chars().count() > MAX_LABEL_LEN {
            return Err(SchemaError::TextTooLong {
                field: "etichetta del parametro",
                len: label.chars().count(),
                max: MAX_LABEL_LEN,
            });
        }

        match self {
            ParamSpec::Integer {
                min,
                max,
                step,
                default,
                ..
            } => {
                if min >= max || *step < 1 {
                    return Err(SchemaError::InvalidRange {
                        param: self.id().to_string(),
                    });
                }
                if default < min || default > max {
                    return Err(SchemaError::InvalidDefault {
                        param: self.id().to_string(),
                    });
                }
            }
            ParamSpec::Float {
                min,
                max,
                step,
                default,
                ..
            } => {
                let finiti = [*min, *max, *step, *default].iter().all(|v| v.is_finite());
                if !finiti || min >= max || *step <= 0.0 {
                    return Err(SchemaError::InvalidRange {
                        param: self.id().to_string(),
                    });
                }
                if default < min || default > max {
                    return Err(SchemaError::InvalidDefault {
                        param: self.id().to_string(),
                    });
                }
            }
            ParamSpec::Color { default, .. } => {
                if !is_hex_color(default) {
                    return Err(SchemaError::InvalidColor {
                        param: self.id().to_string(),
                        value: default.clone(),
                    });
                }
            }
            ParamSpec::Boolean { .. } => {}
            ParamSpec::Choice {
                options, default, ..
            } => {
                if options.is_empty() {
                    return Err(SchemaError::EmptyOptions {
                        param: self.id().to_string(),
                    });
                }
                let mut visti: Vec<&str> = Vec::with_capacity(options.len());
                for option in options {
                    if option.value.trim().is_empty() {
                        return Err(SchemaError::EmptyText {
                            field: "valore di una opzione",
                        });
                    }
                    if option.label.trim().is_empty() {
                        return Err(SchemaError::EmptyText {
                            field: "etichetta di una opzione",
                        });
                    }
                    if visti.contains(&option.value.as_str()) {
                        return Err(SchemaError::DuplicateOption {
                            param: self.id().to_string(),
                            value: option.value.clone(),
                        });
                    }
                    visti.push(&option.value);
                }
                if !visti.contains(&default.as_str()) {
                    return Err(SchemaError::UnknownOption {
                        param: self.id().to_string(),
                        value: default.clone(),
                    });
                }
            }
        }
        Ok(())
    }
}

fn is_hex_color(value: &str) -> bool {
    let Some(hex) = value.strip_prefix('#') else {
        return false;
    };
    matches!(hex.len(), 6 | 8) && hex.chars().all(|c| c.is_ascii_hexdigit())
}

/// Descrizione completa di uno strumento.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ToolSchema {
    pub id: ToolId,
    pub label: String,
    /// Testo contestuale per il pannello proprietà; può essere vuoto.
    #[serde(default)]
    pub description: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub shortcut: Option<String>,
    #[serde(default)]
    pub params: Vec<ParamSpec>,
}

impl ToolSchema {
    /// Crea uno schema e lo valida subito.
    pub fn new(
        id: impl Into<String>,
        label: impl Into<String>,
        description: impl Into<String>,
    ) -> Result<Self, SchemaError> {
        let schema = Self {
            id: ToolId::parse(id)?,
            label: label.into(),
            description: description.into(),
            shortcut: None,
            params: Vec::new(),
        };
        schema.validate()?;
        Ok(schema)
    }

    /// Aggiunge una scorciatoia, validandola.
    pub fn with_shortcut(mut self, shortcut: impl Into<String>) -> Result<Self, SchemaError> {
        let shortcut = shortcut.into();
        validate_shortcut(&shortcut)?;
        self.shortcut = Some(shortcut);
        Ok(self)
    }

    /// Aggiunge un parametro, validandolo e rifiutando i duplicati.
    pub fn add_param(&mut self, param: ParamSpec) -> Result<(), SchemaError> {
        param.validate()?;
        if self.params.iter().any(|p| p.id() == param.id()) {
            return Err(SchemaError::DuplicateParam {
                param: param.id().to_string(),
            });
        }
        self.params.push(param);
        Ok(())
    }

    /// Valida l'intero schema (usata anche dopo una deserializzazione).
    pub fn validate(&self) -> Result<(), SchemaError> {
        if self.label.trim().is_empty() {
            return Err(SchemaError::EmptyText {
                field: "etichetta dello strumento",
            });
        }
        if self.label.chars().count() > MAX_LABEL_LEN {
            return Err(SchemaError::TextTooLong {
                field: "etichetta dello strumento",
                len: self.label.chars().count(),
                max: MAX_LABEL_LEN,
            });
        }
        if self.description.chars().count() > MAX_DESCRIPTION_LEN {
            return Err(SchemaError::TextTooLong {
                field: "descrizione dello strumento",
                len: self.description.chars().count(),
                max: MAX_DESCRIPTION_LEN,
            });
        }
        if let Some(shortcut) = &self.shortcut {
            validate_shortcut(shortcut)?;
        }
        if self.params.len() > MAX_PARAMS {
            return Err(SchemaError::TooManyParams {
                count: self.params.len(),
            });
        }

        let mut visti: Vec<&str> = Vec::with_capacity(self.params.len());
        for param in &self.params {
            param.validate()?;
            if visti.contains(&param.id()) {
                return Err(SchemaError::DuplicateParam {
                    param: param.id().to_string(),
                });
            }
            visti.push(param.id());
        }
        Ok(())
    }

    /// Parametro per identificativo, se esiste.
    pub fn param(&self, id: &str) -> Option<&ParamSpec> {
        self.params.iter().find(|p| p.id() == id)
    }

    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string(self)
    }

    /// Deserializza **e** valida: il JSON non è una scorciatoia per entrare nel registro.
    pub fn from_json(json: &str) -> Result<Self, ParseError> {
        let schema: Self = serde_json::from_str(json)?;
        schema.validate()?;
        Ok(schema)
    }
}

fn validate_shortcut(shortcut: &str) -> Result<(), SchemaError> {
    if shortcut.trim().is_empty() {
        return Err(SchemaError::EmptyText {
            field: "scorciatoia",
        });
    }
    if shortcut.chars().count() > MAX_SHORTCUT_LEN {
        return Err(SchemaError::TextTooLong {
            field: "scorciatoia",
            len: shortcut.chars().count(),
            max: MAX_SHORTCUT_LEN,
        });
    }
    Ok(())
}

/// Errore di lettura di uno schema da JSON: sintassi o validazione.
#[derive(Debug)]
pub enum ParseError {
    Json(serde_json::Error),
    Schema(SchemaError),
}

impl fmt::Display for ParseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ParseError::Json(e) => write!(f, "JSON non valido: {e}"),
            ParseError::Schema(e) => write!(f, "schema non valido: {e}"),
        }
    }
}

impl std::error::Error for ParseError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            ParseError::Json(e) => Some(e),
            ParseError::Schema(e) => Some(e),
        }
    }
}

impl From<serde_json::Error> for ParseError {
    fn from(value: serde_json::Error) -> Self {
        ParseError::Json(value)
    }
}

impl From<SchemaError> for ParseError {
    fn from(value: SchemaError) -> Self {
        ParseError::Schema(value)
    }
}
