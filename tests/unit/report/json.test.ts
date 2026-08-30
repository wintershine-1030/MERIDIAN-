import { describe, expect, it } from "vitest";
import { createDiagnostic } from "../../../src/errors/diagnostic.js";
import { renderJson } from "../../../src/report/json.js";

const diagnostic = createDiagnostic({
  code: "MRD4012",
  severity: "error",
  message: "example message",
  file: "schema.mrd",
  start: { line: 12, column: 3 },
  end: { line: 12, column: 10 },
});

describe("renderJson", () => {
  it("emits a trailing newline and parses back to the documented shape", () => {
    const output = renderJson([diagnostic], false);
    expect(output.endsWith("\n")).toBe(true);
    expect(JSON.parse(output)).toEqual({
      diagnostics: [
        { code: "MRD4012", column: 3, file: "schema.mrd", line: 12, message: "example message", severity: "error" },
      ],
      ok: false,
      version: 1,
    });
  });

  it("sorts the top-level keys alphabetically", () => {
    const output = renderJson([diagnostic], false);
    expect(Object.keys(JSON.parse(output))).toEqual(["diagnostics", "ok", "version"]);
  });

  it("sorts each diagnostic entry's keys alphabetically", () => {
    const output = renderJson([diagnostic], false);
    const parsed = JSON.parse(output) as { diagnostics: Record<string, unknown>[] };
    expect(Object.keys(parsed.diagnostics[0]!)).toEqual(["code", "column", "file", "line", "message", "severity"]);
  });

  it("emits an empty diagnostics array and ok:true when there is nothing to report", () => {
    const output = renderJson([], true);
    expect(JSON.parse(output)).toEqual({ diagnostics: [], ok: true, version: 1 });
  });
});
