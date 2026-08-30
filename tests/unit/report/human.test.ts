import { describe, expect, it } from "vitest";
import { createDiagnostic } from "../../../src/errors/diagnostic.js";
import { renderHuman } from "../../../src/report/human.js";

describe("renderHuman", () => {
  it("renders the exact two-line format per diagnostic", () => {
    const diagnostic = createDiagnostic({
      code: "MRD4012",
      severity: "error",
      message: "example message",
      file: "schema.mrd",
      start: { line: 12, column: 3 },
      end: { line: 12, column: 10 },
    });

    expect(renderHuman([diagnostic])).toBe("error[MRD4012]: example message\n  --> schema.mrd:12:3\n");
  });

  it("joins multiple diagnostics with a blank line between them", () => {
    const first = createDiagnostic({
      code: "MRD4001",
      severity: "warning",
      message: "first",
      file: "a.mrd",
      start: { line: 1, column: 1 },
      end: { line: 1, column: 2 },
    });
    const second = createDiagnostic({
      code: "MRD4002",
      severity: "warning",
      message: "second",
      file: "b.mrd",
      start: { line: 2, column: 4 },
      end: { line: 2, column: 5 },
    });

    expect(renderHuman([first, second])).toBe(
      "warning[MRD4001]: first\n  --> a.mrd:1:1\n\nwarning[MRD4002]: second\n  --> b.mrd:2:4\n",
    );
  });

  it("returns an empty string when there are no diagnostics", () => {
    expect(renderHuman([])).toBe("");
  });
});
