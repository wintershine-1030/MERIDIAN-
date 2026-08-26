import { DEFAULT_CONFIG, type MeridianConfig, type PartialConfig } from "./types.js";

export function mergeConfig(base: MeridianConfig, override: PartialConfig): MeridianConfig {
  return {
    dialect: override.dialect ?? base.dialect,
    strict: override.strict ?? base.strict,
    format: override.format ?? base.format,
    quiet: override.quiet ?? base.quiet,
    color: override.color ?? base.color,
  };
}

export function loadConfig(fileContents: string | null): MeridianConfig {
  if (fileContents === null) {
    return DEFAULT_CONFIG;
  }
  const parsed = JSON.parse(fileContents) as PartialConfig;
  return mergeConfig(DEFAULT_CONFIG, parsed);
}
