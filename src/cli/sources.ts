import type { Io } from "./io.js";

export type ReadSourcesResult = { readonly sources: Record<string, string> } | { readonly error: string };

export function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

export function readSources(paths: readonly string[], io: Io): ReadSourcesResult {
  // A null-prototype object: assigning to a key like "__proto__" through a normal {}
  // object literal silently no-ops (it sets the object's prototype rather than an own
  // property with that name), which would make a file legitimately named "__proto__"
  // vanish from compilation with no error. Object.create(null) makes every key, including
  // "__proto__", behave as a plain own property.
  const sources: Record<string, string> = Object.create(null) as Record<string, string>;
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
