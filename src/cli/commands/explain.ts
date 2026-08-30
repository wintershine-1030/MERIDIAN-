import { lookupCode } from "../../errors/catalog.js";
import type { ParsedArgs } from "../args.js";
import { EXIT_SUCCESS, EXIT_USAGE_ERROR } from "../exitcodes.js";
import type { CliResult } from "../io.js";

export function runExplain(args: ParsedArgs): CliResult {
  const code = args.positionals[0];
  if (code === undefined) {
    return {
      stdout: "",
      stderr: "explain requires a diagnostic code, e.g. 'meridian explain MRD4012'\n",
      exitCode: EXIT_USAGE_ERROR,
    };
  }

  const entry = lookupCode(code);
  if (entry === undefined) {
    return { stdout: "", stderr: `unknown diagnostic code '${code}'\n`, exitCode: EXIT_USAGE_ERROR };
  }

  return {
    stdout: `${entry.code} [${entry.stage}, ${entry.defaultSeverity}]: ${entry.summary}\n`,
    stderr: "",
    exitCode: EXIT_SUCCESS,
  };
}
