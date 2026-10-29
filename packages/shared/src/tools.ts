// Pizzico — packages/shared/src/tools.ts
// Licenza: MIT OR Apache-2.0
//
// Tipi del catalogo degli strumenti e validazione del confine.
//
// La fonte di verità è `crates/tools/src/schema.rs`: il JSON prodotto da Rust è
// la forma serializzata di quelle struct. Questi tipi sono la proiezione
// TypeScript, con `ParamSpec` come unione discriminata su `kind`. Il parser non
// duplica le regole di merito (limiti, colori): verifica la struttura e la
// versione, perché il resto è già validato a monte e duplicarlo creerebbe due
// verità che possono divergere.

export const TOOL_CATALOG_SCHEMA_VERSION = 1;

export interface ChoiceOption {
  value: string;
  label: string;
}

interface ParamBase {
  id: string;
  label: string;
}

export interface IntegerParam extends ParamBase {
  kind: 'integer';
  min: number;
  max: number;
  step: number;
  default: number;
  unit?: string;
}

export interface FloatParam extends ParamBase {
  kind: 'float';
  min: number;
  max: number;
  step: number;
  default: number;
  unit?: string;
}

export interface ColorParam extends ParamBase {
  kind: 'color';
  default: string;
}

export interface BooleanParam extends ParamBase {
  kind: 'boolean';
  default: boolean;
}

export interface ChoiceParam extends ParamBase {
  kind: 'choice';
  options: ChoiceOption[];
  default: string;
}

export type ParamSpec =
  | IntegerParam
  | FloatParam
  | ColorParam
  | BooleanParam
  | ChoiceParam;

export interface ToolSchema {
  id: string;
  label: string;
  description: string;
  shortcut?: string;
  params: ParamSpec[];
}

export interface ToolCatalog {
  schemaVersion: number;
  tools: ToolSchema[];
}

export class ToolCatalogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ToolCatalogError';
  }
}

const PARAM_KINDS: ReadonlySet<string> = new Set([
  'integer',
  'float',
  'color',
  'boolean',
  'choice',
]);

function fail(message: string): never {
  throw new ToolCatalogError(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJson(json: string, context: string): unknown {
  try {
    return JSON.parse(json) as unknown;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new ToolCatalogError(`${context}: JSON non valido (${detail})`);
  }
}

function readString(
  record: Record<string, unknown>,
  key: string,
  context: string
): string {
  const value = record[key];
  if (typeof value !== 'string' || value.length === 0) {
    fail(`${context}: "${key}" deve essere una stringa non vuota`);
  }
  return value;
}

function parseParam(value: unknown, index: number, toolId: string): ParamSpec {
  const context = `strumento "${toolId}", parametro #${index}`;
  if (!isRecord(value)) {
    fail(`${context}: atteso un oggetto`);
  }

  const kind = value.kind;
  if (typeof kind !== 'string' || !PARAM_KINDS.has(kind)) {
    fail(`${context}: "kind" non riconosciuto (${String(kind)})`);
  }
  readString(value, 'id', context);
  readString(value, 'label', context);

  switch (kind) {
    case 'integer':
    case 'float':
      for (const key of ['min', 'max', 'step', 'default'] as const) {
        const number = value[key];
        if (typeof number !== 'number' || !Number.isFinite(number)) {
          fail(`${context}: "${key}" deve essere un numero finito`);
        }
      }
      if (value.unit !== undefined && typeof value.unit !== 'string') {
        fail(`${context}: "unit" deve essere una stringa`);
      }
      break;
    case 'color':
      readString(value, 'default', context);
      break;
    case 'boolean':
      if (typeof value.default !== 'boolean') {
        fail(`${context}: "default" deve essere booleano`);
      }
      break;
    case 'choice': {
      const options = value.options;
      if (!Array.isArray(options) || options.length === 0) {
        fail(`${context}: "options" deve essere un array non vuoto`);
      }
      options.forEach((option, optionIndex) => {
        const optionContext = `${context}, opzione #${optionIndex}`;
        if (!isRecord(option)) {
          fail(`${optionContext}: attesa un'oggetto`);
        }
        readString(option, 'value', optionContext);
        readString(option, 'label', optionContext);
      });
      readString(value, 'default', context);
      break;
    }
  }

  return value as unknown as ParamSpec;
}

function parseToolSchemaValue(value: unknown): ToolSchema {
  if (!isRecord(value)) {
    fail('strumento: atteso un oggetto');
  }

  const id = readString(value, 'id', 'strumento');
  const label = readString(value, 'label', `strumento "${id}"`);

  const description = value.description;
  if (description !== undefined && typeof description !== 'string') {
    fail(`strumento "${id}": "description" deve essere una stringa`);
  }

  const shortcut = value.shortcut;
  if (shortcut !== undefined && typeof shortcut !== 'string') {
    fail(`strumento "${id}": "shortcut" deve essere una stringa`);
  }

  const paramsValue = value.params;
  if (!Array.isArray(paramsValue)) {
    fail(`strumento "${id}": "params" deve essere un array`);
  }

  return {
    id,
    label,
    description: description ?? '',
    params: paramsValue.map((param, index) => parseParam(param, index, id)),
    shortcut: typeof shortcut === 'string' ? shortcut : undefined,
  };
}

/** Valida e tipizza il JSON di un singolo strumento. */
export function parseToolSchema(json: string): ToolSchema {
  return parseToolSchemaValue(parseJson(json, 'strumento'));
}

/**
 * Valida e tipizza il JSON del catalogo completo.
 *
 * Rifiuta una versione futura invece di interpretarla con i tipi attuali: è lo
 * stesso principio del `schemaVersion` lato Rust, applicato al consumatore.
 */
export function parseToolCatalog(json: string): ToolCatalog {
  const value = parseJson(json, 'catalogo');
  if (!isRecord(value)) {
    fail('catalogo: atteso un oggetto');
  }

  const version = value.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version)) {
    fail('catalogo: "schemaVersion" mancante o non intero');
  }
  if (version !== TOOL_CATALOG_SCHEMA_VERSION) {
    fail(
      `catalogo: versione ${version} non supportata (attesa ${TOOL_CATALOG_SCHEMA_VERSION})`
    );
  }

  const toolsValue = value.tools;
  if (!Array.isArray(toolsValue)) {
    fail('catalogo: "tools" deve essere un array');
  }

  const seen = new Set<string>();
  const tools = toolsValue.map((item) => {
    const tool = parseToolSchemaValue(item);
    if (seen.has(tool.id)) {
      fail(`catalogo: strumento duplicato "${tool.id}"`);
    }
    seen.add(tool.id);
    return tool;
  });

  return { schemaVersion: version, tools };
}
