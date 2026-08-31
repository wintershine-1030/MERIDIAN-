import type { MeridianConfig } from "../../config/types.js";
import { diffSchemas } from "../../diff/classify.js";
import { generateSteps } from "../../plan/generate.js";
import type { ParsedArgs } from "../args.js";
import { EXIT_SUCCESS } from "../exitcodes.js";
import type { CliResult, Io } from "../io.js";
import { compileTwo } from "./compileTwo.js";

export function runPlan(args: ParsedArgs, config: MeridianConfig, io: Io): CliResult {
  const compiled = compileTwo("plan", args, config, io);
  if (!compiled.ok) {
    return compiled.result;
  }

  const steps = generateSteps(diffSchemas(compiled.before, compiled.after));
  const lines = steps.map((step) => step.description);

  return {
    stdout: config.quiet || lines.length === 0 ? "" : `${lines.join("\n")}\n`,
    stderr: "",
    exitCode: EXIT_SUCCESS,
  };
}
