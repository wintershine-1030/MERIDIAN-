import type { MeridianConfig } from "../../config/types.js";
import { describeChange, diffSchemas } from "../../diff/classify.js";
import { renderHuman } from "../../report/human.js";
import { renderJson } from "../../report/json.js";
import type { ParsedArgs } from "../args.js";
import { compile } from "../compile.js";
import { EXIT_DIAGNOSTIC_ERROR, EXIT_INPUT_ERROR, EXIT_SUCCESS, EXIT_USAGE_ERROR } from "../exitcodes.js";
import type { CliResult, Io } from "../io.js";
import { readSources } from "../sources.js";

export function runDiff(args: ParsedArgs, config: MeridianConfig, io: Io): CliResult {
  if (args.positionals.length !== 2) {
    return { stdout: "", stderr: "diff requires exactly two paths: <old> <new>\n", exitCode: EXIT_USAGE_ERROR };
  }
  const [oldPath, newPath] = args.positionals;

  const oldResult = readSources([oldPath!], io);
  if ("error" in oldResult) {
    return { stdout: "", stderr: `${oldResult.error}\n`, exitCode: EXIT_INPUT_ERROR };
  }
  const newResult = readSources([newPath!], io);
  if ("error" in newResult) {
    return { stdout: "", stderr: `${newResult.error}\n`, exitCode: EXIT_INPUT_ERROR };
  }

  const before = compile(oldResult.sources, { strict: config.strict });
  const after = compile(newResult.sources, { strict: config.strict });
  const diagnostics = [...before.diagnostics, ...after.diagnostics];
  const ok = before.ok && after.ok;

  if (!ok || before.ir === null || after.ir === null) {
    const text = config.quiet ? "" : config.format === "json" ? renderJson(diagnostics, ok) : renderHuman(diagnostics);
    return config.format === "json"
      ? { stdout: text, stderr: "", exitCode: EXIT_DIAGNOSTIC_ERROR }
      : { stdout: "", stderr: text, exitCode: EXIT_DIAGNOSTIC_ERROR };
  }

  const classified = diffSchemas(before.ir, after.ir);
  const lines = classified.map((entry) => `${entry.compatibility}: ${describeChange(entry.change)}`);
  const anyBreaking = classified.some((entry) => entry.compatibility === "breaking");

  return {
    stdout: config.quiet || lines.length === 0 ? "" : `${lines.join("\n")}\n`,
    stderr: "",
    exitCode: anyBreaking ? EXIT_DIAGNOSTIC_ERROR : EXIT_SUCCESS,
  };
}
