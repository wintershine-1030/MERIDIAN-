import type { MeridianConfig } from "../../config/types.js";
import type { IrSchema } from "../../ir/types.js";
import { renderHuman } from "../../report/human.js";
import { renderJson } from "../../report/json.js";
import type { ParsedArgs } from "../args.js";
import { compile } from "../compile.js";
import { EXIT_DIAGNOSTIC_ERROR, EXIT_INPUT_ERROR, EXIT_USAGE_ERROR } from "../exitcodes.js";
import type { CliResult, Io } from "../io.js";
import { readSources } from "../sources.js";

export type CompileTwoResult =
  | { readonly ok: true; readonly before: IrSchema; readonly after: IrSchema }
  | { readonly ok: false; readonly result: CliResult };

// diff and plan both need exactly two schema files read, compiled, and reported on
// identically before doing their own thing (classify changes vs. generate steps) with the
// resulting pair of IR schemas. Shared here so the read/compile/error-branch logic can't
// drift between the two commands.
export function compileTwo(commandName: string, args: ParsedArgs, config: MeridianConfig, io: Io): CompileTwoResult {
  if (args.positionals.length !== 2) {
    return {
      ok: false,
      result: {
        stdout: "",
        stderr: `${commandName} requires exactly two paths: <old> <new>\n`,
        exitCode: EXIT_USAGE_ERROR,
      },
    };
  }
  const [oldPath, newPath] = args.positionals;

  const oldResult = readSources([oldPath!], io);
  if ("error" in oldResult) {
    return { ok: false, result: { stdout: "", stderr: `${oldResult.error}\n`, exitCode: EXIT_INPUT_ERROR } };
  }
  const newResult = readSources([newPath!], io);
  if ("error" in newResult) {
    return { ok: false, result: { stdout: "", stderr: `${newResult.error}\n`, exitCode: EXIT_INPUT_ERROR } };
  }

  const before = compile(oldResult.sources, { strict: config.strict });
  const after = compile(newResult.sources, { strict: config.strict });
  const diagnostics = [...before.diagnostics, ...after.diagnostics];
  const ok = before.ok && after.ok;

  if (!ok || before.ir === null || after.ir === null) {
    const text = config.quiet ? "" : config.format === "json" ? renderJson(diagnostics, ok) : renderHuman(diagnostics);
    return {
      ok: false,
      result:
        config.format === "json"
          ? { stdout: text, stderr: "", exitCode: EXIT_DIAGNOSTIC_ERROR }
          : { stdout: "", stderr: text, exitCode: EXIT_DIAGNOSTIC_ERROR },
    };
  }

  return { ok: true, before: before.ir, after: after.ir };
}
