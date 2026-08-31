import { loadConfig, mergeConfig } from "../config/load.js";
import type { MeridianConfig, PartialConfig } from "../config/types.js";
import type { Diagnostic } from "../errors/diagnostic.js";
import { renderHuman } from "../report/human.js";
import { renderJson } from "../report/json.js";
import { parseArgs, type ParsedArgs } from "./args.js";
import { runCheck } from "./commands/check.js";
import { runDiff } from "./commands/diff.js";
import { runEmit } from "./commands/emit.js";
import { runExplain } from "./commands/explain.js";
import { runPlan } from "./commands/plan.js";
import { EXIT_DIAGNOSTIC_ERROR, EXIT_SUCCESS, EXIT_USAGE_ERROR } from "./exitcodes.js";
import { HELP_TEXT, VERSION } from "./help.js";
import type { CliResult, Io } from "./io.js";

const CONFIG_FILE_NAME = "meridian.config.json";

function cliOverrides(args: ParsedArgs): PartialConfig {
  return {
    ...(args.dialect !== null && { dialect: args.dialect }),
    ...(args.strict && { strict: true }),
    ...(args.format !== null && { format: args.format }),
    ...(args.quiet && { quiet: true }),
    ...(args.color !== null && { color: args.color }),
  };
}

interface ResolvedConfig {
  readonly config: MeridianConfig;
  readonly diagnostics: readonly Diagnostic[];
}

function resolveConfig(args: ParsedArgs, io: Io): ResolvedConfig {
  let fileContents: string | null;
  try {
    fileContents = io.readFile(CONFIG_FILE_NAME);
  } catch {
    fileContents = null;
  }
  const { config: fileConfig, diagnostics } = loadConfig(fileContents, CONFIG_FILE_NAME);
  return { config: mergeConfig(fileConfig, cliOverrides(args)), diagnostics };
}

export function runCli(argv: readonly string[], io: Io): CliResult {
  const args = parseArgs(argv);

  if (args.help) {
    return { stdout: HELP_TEXT, stderr: "", exitCode: EXIT_SUCCESS };
  }
  if (args.version) {
    return { stdout: `${VERSION}\n`, stderr: "", exitCode: EXIT_SUCCESS };
  }
  if (args.errors.length > 0) {
    return { stdout: "", stderr: `${args.errors.join("\n")}\n`, exitCode: EXIT_USAGE_ERROR };
  }
  if (args.command === null) {
    return { stdout: "", stderr: "no command specified; see --help\n", exitCode: EXIT_USAGE_ERROR };
  }

  const { config, diagnostics: configDiagnostics } = resolveConfig(args, io);

  // A malformed config file (invalid JSON, or a field with the wrong type/value) must not
  // be swallowed: fall through to the resolved config's own quiet/format so the report
  // still honors whatever the command line asked for, then stop before running anything
  // against a schema the user never intended to check against default settings.
  if (configDiagnostics.length > 0) {
    const text = config.quiet
      ? ""
      : config.format === "json"
        ? renderJson(configDiagnostics, false)
        : renderHuman(configDiagnostics);
    return config.format === "json"
      ? { stdout: text, stderr: "", exitCode: EXIT_DIAGNOSTIC_ERROR }
      : { stdout: "", stderr: text, exitCode: EXIT_DIAGNOSTIC_ERROR };
  }

  switch (args.command) {
    case "check":
      return runCheck(args, config, io);
    case "emit":
      return runEmit(args, config, io);
    case "diff":
      return runDiff(args, config, io);
    case "plan":
      return runPlan(args, config, io);
    case "explain":
      return runExplain(args);
    default:
      return { stdout: "", stderr: `unknown command '${args.command}'\n`, exitCode: EXIT_USAGE_ERROR };
  }
}
