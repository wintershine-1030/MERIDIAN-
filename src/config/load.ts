import { createDiagnostic, type Diagnostic } from "../errors/diagnostic.js";
import { CONFIG_INVALID_FIELD, CONFIG_INVALID_JSON } from "./codes.js";
import { DEFAULT_CONFIG, type DialectName, type MeridianConfig, type PartialConfig } from "./types.js";

const PLACEHOLDER_POSITION = { line: 1, column: 1 };

export function mergeConfig(base: MeridianConfig, override: PartialConfig): MeridianConfig {
  return {
    dialect: override.dialect ?? base.dialect,
    strict: override.strict ?? base.strict,
    format: override.format ?? base.format,
    quiet: override.quiet ?? base.quiet,
    color: override.color ?? base.color,
  };
}

export interface LoadConfigResult {
  readonly config: MeridianConfig;
  readonly diagnostics: readonly Diagnostic[];
}

function reportInvalidField(file: string, field: string, diagnostics: Diagnostic[]): void {
  diagnostics.push(
    createDiagnostic({
      code: CONFIG_INVALID_FIELD,
      severity: "error",
      message: `configuration field '${field}' has an invalid value`,
      file,
      start: PLACEHOLDER_POSITION,
      end: PLACEHOLDER_POSITION,
    }),
  );
}

function validateConfig(
  candidate: Record<string, unknown>,
  file: string,
): { partial: PartialConfig; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = [];
  let dialect: DialectName | undefined;
  let strict: boolean | undefined;
  let format: MeridianConfig["format"] | undefined;
  let quiet: boolean | undefined;
  let color: boolean | undefined;

  if ("dialect" in candidate) {
    if (candidate["dialect"] === "postgres" || candidate["dialect"] === "sqlite") {
      dialect = candidate["dialect"];
    } else {
      reportInvalidField(file, "dialect", diagnostics);
    }
  }
  if ("strict" in candidate) {
    if (typeof candidate["strict"] === "boolean") {
      strict = candidate["strict"];
    } else {
      reportInvalidField(file, "strict", diagnostics);
    }
  }
  if ("format" in candidate) {
    if (candidate["format"] === "human" || candidate["format"] === "json") {
      format = candidate["format"];
    } else {
      reportInvalidField(file, "format", diagnostics);
    }
  }
  if ("quiet" in candidate) {
    if (typeof candidate["quiet"] === "boolean") {
      quiet = candidate["quiet"];
    } else {
      reportInvalidField(file, "quiet", diagnostics);
    }
  }
  if ("color" in candidate) {
    if (typeof candidate["color"] === "boolean") {
      color = candidate["color"];
    } else {
      reportInvalidField(file, "color", diagnostics);
    }
  }

  return {
    partial: {
      ...(dialect !== undefined && { dialect }),
      ...(strict !== undefined && { strict }),
      ...(format !== undefined && { format }),
      ...(quiet !== undefined && { quiet }),
      ...(color !== undefined && { color }),
    },
    diagnostics,
  };
}

export function loadConfig(fileContents: string | null, file: string): LoadConfigResult {
  if (fileContents === null) {
    return { config: DEFAULT_CONFIG, diagnostics: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fileContents);
  } catch {
    return {
      config: DEFAULT_CONFIG,
      diagnostics: [
        createDiagnostic({
          code: CONFIG_INVALID_JSON,
          severity: "error",
          message: "configuration file is not valid JSON",
          file,
          start: PLACEHOLDER_POSITION,
          end: PLACEHOLDER_POSITION,
        }),
      ],
    };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {
      config: DEFAULT_CONFIG,
      diagnostics: [
        createDiagnostic({
          code: CONFIG_INVALID_JSON,
          severity: "error",
          message: "configuration file must contain a JSON object",
          file,
          start: PLACEHOLDER_POSITION,
          end: PLACEHOLDER_POSITION,
        }),
      ],
    };
  }

  const { partial, diagnostics } = validateConfig(parsed as Record<string, unknown>, file);
  return { config: mergeConfig(DEFAULT_CONFIG, partial), diagnostics };
}
