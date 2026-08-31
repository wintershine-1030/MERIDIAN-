import type { MeridianConfig } from "../../config/types.js";
import { describeChange, diffSchemas } from "../../diff/classify.js";
import type { ParsedArgs } from "../args.js";
import { EXIT_DIAGNOSTIC_ERROR, EXIT_SUCCESS } from "../exitcodes.js";
import type { CliResult, Io } from "../io.js";
import { compileTwo } from "./compileTwo.js";

export function runDiff(args: ParsedArgs, config: MeridianConfig, io: Io): CliResult {
  const compiled = compileTwo("diff", args, config, io);
  if (!compiled.ok) {
    return compiled.result;
  }

  const classified = diffSchemas(compiled.before, compiled.after);
  const lines = classified.map((entry) => `${entry.compatibility}: ${describeChange(entry.change)}`);
  const anyBreaking = classified.some((entry) => entry.compatibility === "breaking");

  return {
    stdout: config.quiet || lines.length === 0 ? "" : `${lines.join("\n")}\n`,
    stderr: "",
    exitCode: anyBreaking ? EXIT_DIAGNOSTIC_ERROR : EXIT_SUCCESS,
  };
}
