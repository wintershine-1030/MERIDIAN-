import type { Io } from "./io.js";

export type ReadSourcesResult = { readonly sources: Record<string, string> } | { readonly error: string };

export function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

export function readSources(paths: readonly string[], io: Io): ReadSourcesResult {
  const sources: Record<string, string> = {};
  for (const path of paths) {
    const normalized = normalizePath(path);
    try {
      sources[normalized] = io.readFile(normalized);
    } catch {
      return { error: `cannot read '${normalized}'` };
    }
  }
  return { sources };
}
