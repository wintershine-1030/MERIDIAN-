import { compareStrings } from "../util/sort.js";
import type { Severity } from "./diagnostic.js";

export type Stage = "lex" | "parse" | "resolve" | "validate" | "diff" | "plan" | "emit" | "config";

export interface DiagnosticCodeEntry {
  readonly code: string;
  readonly stage: Stage;
  readonly defaultSeverity: Severity;
  readonly summary: string;
}

const registry = new Map<string, DiagnosticCodeEntry>();

export function registerCode(entry: DiagnosticCodeEntry): DiagnosticCodeEntry {
  if (registry.has(entry.code)) {
    throw new Error(`diagnostic code ${entry.code} is already registered`);
  }
  registry.set(entry.code, entry);
  return entry;
}

export function lookupCode(code: string): DiagnosticCodeEntry | undefined {
  return registry.get(code);
}

export function listCodes(): DiagnosticCodeEntry[] {
  return [...registry.values()].sort((a, b) => compareStrings(a.code, b.code));
}
