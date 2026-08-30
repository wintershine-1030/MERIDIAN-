import type { MeridianConfig } from "../../config/types.js";
import type { Dialect } from "../../emit/dialect.js";
import { emitSchema, postgresDialect } from "../../emit/postgres.js";
import { sqliteDialect } from "../../emit/sqlite.js";
import { renderHuman } from "../../report/human.js";
import { renderJson } from "../../report/json.js";
import type { ParsedArgs } from "../args.js";
import { compile } from "../compile.js";
import { EXIT_DIAGNOSTIC_ERROR, EXIT_INPUT_ERROR, EXIT_SUCCESS } from "../exitcodes.js";
import type { CliResult, Io } from "../io.js";
import { readSources } from "../sources.js";

function dialectFor(config: MeridianConfig): Dialect {
  return config.dialect === "sqlite" ? sqliteDialect : postgresDialect;
}

export function runEmit(args: ParsedArgs, config: MeridianConfig, io: Io): CliResult {
  const result = readSources(args.positionals, io);
  if ("error" in result) {
    return { stdout: "", stderr: `${result.error}\n`, exitCode: EXIT_INPUT_ERROR };
  }

  const { ok, ir, diagnostics } = compile(result.sources, { strict: config.strict });
  const diagnosticText = config.quiet
    ? ""
    : config.format === "json"
      ? renderJson(diagnostics, ok)
      : renderHuman(diagnostics);

  if (!ok || ir === null) {
    return config.format === "json"
      ? { stdout: diagnosticText, stderr: "", exitCode: EXIT_DIAGNOSTIC_ERROR }
      : { stdout: "", stderr: diagnosticText, exitCode: EXIT_DIAGNOSTIC_ERROR };
  }

  const ddl = emitSchema(ir, dialectFor(config));

  if (config.format === "json") {
    return { stdout: `${diagnosticText}${ddl}`, stderr: "", exitCode: EXIT_SUCCESS };
  }
  return { stdout: ddl, stderr: diagnosticText, exitCode: EXIT_SUCCESS };
}
