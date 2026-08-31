import type { MeridianConfig } from "../../config/types.js";
import type { Dialect } from "../../emit/dialect.js";
import { emitSchema, postgresDialect } from "../../emit/postgres.js";
import { sqliteDialect } from "../../emit/sqlite.js";
import { renderHuman } from "../../report/human.js";
import { renderJson } from "../../report/json.js";
import type { ParsedArgs } from "../args.js";
import { compile } from "../compile.js";
import { EXIT_DIAGNOSTIC_ERROR, EXIT_INPUT_ERROR, EXIT_SUCCESS, EXIT_USAGE_ERROR } from "../exitcodes.js";
import type { CliResult, Io } from "../io.js";
import { readSources } from "../sources.js";

function dialectFor(config: MeridianConfig): Dialect {
  return config.dialect === "sqlite" ? sqliteDialect : postgresDialect;
}

export function runEmit(args: ParsedArgs, config: MeridianConfig, io: Io): CliResult {
  if (args.positionals.length === 0) {
    return { stdout: "", stderr: "emit requires at least one schema file path\n", exitCode: EXIT_USAGE_ERROR };
  }

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

  // The DDL is the one product of this command, so it always stays on stdout as plain SQL
  // (pipeable straight into psql/sqlite3) regardless of --format; diagnostics move to stderr
  // rendered in whichever format was requested. Previously the json branch concatenated the
  // JSON diagnostics envelope directly onto the DDL on stdout, which is neither valid JSON
  // nor valid SQL.
  return { stdout: ddl, stderr: diagnosticText, exitCode: EXIT_SUCCESS };
}
