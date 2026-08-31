import type { MeridianConfig } from "../../config/types.js";
import { renderHuman } from "../../report/human.js";
import { renderJson } from "../../report/json.js";
import type { ParsedArgs } from "../args.js";
import { compile } from "../compile.js";
import { EXIT_DIAGNOSTIC_ERROR, EXIT_INPUT_ERROR, EXIT_SUCCESS, EXIT_USAGE_ERROR } from "../exitcodes.js";
import type { CliResult, Io } from "../io.js";
import { readSources } from "../sources.js";

export function runCheck(args: ParsedArgs, config: MeridianConfig, io: Io): CliResult {
  if (args.positionals.length === 0) {
    return { stdout: "", stderr: "check requires at least one schema file path\n", exitCode: EXIT_USAGE_ERROR };
  }

  const result = readSources(args.positionals, io);
  if ("error" in result) {
    return { stdout: "", stderr: `${result.error}\n`, exitCode: EXIT_INPUT_ERROR };
  }

  const { ok, diagnostics } = compile(result.sources, { strict: config.strict });
  const exitCode = ok ? EXIT_SUCCESS : EXIT_DIAGNOSTIC_ERROR;

  if (config.quiet) {
    return { stdout: "", stderr: "", exitCode };
  }
  if (config.format === "json") {
    return { stdout: renderJson(diagnostics, ok), stderr: "", exitCode };
  }
  return { stdout: "", stderr: renderHuman(diagnostics), exitCode };
}
