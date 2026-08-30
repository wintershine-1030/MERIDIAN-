import type { DialectName } from "../config/types.js";

export interface ParsedArgs {
  readonly command: string | null;
  readonly positionals: readonly string[];
  readonly format: "human" | "json" | null;
  readonly strict: boolean;
  readonly quiet: boolean;
  readonly color: boolean | null;
  readonly dialect: DialectName | null;
  readonly help: boolean;
  readonly version: boolean;
  readonly errors: readonly string[];
}

const KNOWN_COMMANDS: ReadonlySet<string> = new Set(["check", "emit", "diff", "plan", "explain"]);

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const positionals: string[] = [];
  const errors: string[] = [];
  let format: "human" | "json" | null = null;
  let strict = false;
  let quiet = false;
  let color: boolean | null = null;
  let dialect: DialectName | null = null;
  let help = false;
  let version = false;
  let command: string | null = null;

  let index = 0;
  if (argv.length > 0 && !argv[0]!.startsWith("-")) {
    command = argv[0]!;
    index = 1;
  }

  while (index < argv.length) {
    const token = argv[index]!;
    if (token === "--help" || token === "-h") {
      help = true;
      index++;
      continue;
    }
    if (token === "--version" || token === "-v") {
      version = true;
      index++;
      continue;
    }
    if (token === "--strict") {
      strict = true;
      index++;
      continue;
    }
    if (token === "--quiet") {
      quiet = true;
      index++;
      continue;
    }
    if (token === "--no-color") {
      color = false;
      index++;
      continue;
    }
    if (token === "--format") {
      const value = argv[index + 1];
      if (value === "human" || value === "json") {
        format = value;
        index += 2;
      } else {
        errors.push("--format requires a value of 'human' or 'json'");
        index++;
      }
      continue;
    }
    if (token === "--dialect") {
      const value = argv[index + 1];
      if (value === "postgres" || value === "sqlite") {
        dialect = value;
        index += 2;
      } else {
        errors.push("--dialect requires a value of 'postgres' or 'sqlite'");
        index++;
      }
      continue;
    }
    if (token.startsWith("--")) {
      errors.push(`unknown flag '${token}'`);
      index++;
      continue;
    }
    positionals.push(token);
    index++;
  }

  if (command !== null && !KNOWN_COMMANDS.has(command)) {
    errors.push(`unknown command '${command}'`);
  }

  return { command, positionals, format, strict, quiet, color, dialect, help, version, errors };
}
