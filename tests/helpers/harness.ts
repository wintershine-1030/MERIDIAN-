import { runCli } from "../../src/index.js";
import type { CliResult, Io } from "../../src/index.js";
import { compareStrings } from "../../src/util/sort.js";

export function createMemoryIo(files: Record<string, string> = {}, cwd = "/"): Io {
  const store = new Map(Object.entries(files));
  return {
    readFile(path: string): string {
      const contents = store.get(path);
      if (contents === undefined) {
        throw new Error(`no such file: ${path}`);
      }
      return contents;
    },
    listDir(path: string): string[] {
      const prefix = path.endsWith("/") ? path : `${path}/`;
      return [...store.keys()].filter((key) => key.startsWith(prefix)).sort(compareStrings);
    },
    now(): number {
      return 0;
    },
    cwd,
  };
}

export function run(argv: readonly string[], files: Record<string, string> = {}): CliResult {
  return runCli(argv, createMemoryIo(files));
}
