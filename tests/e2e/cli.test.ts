import { describe, expect, it } from "vitest";
import { run } from "../helpers/harness.js";
import { readFixture } from "../helpers/fixtures.js";

const basic = readFixture("schemas/basic.mrd");
const referentialErrors = readFixture("schemas/validate-referential.mrd");
const namingWarnings = readFixture("schemas/validate-naming.mrd");
const widgets = readFixture("schemas/emit-widgets.mrd");
const postgresWidgetsGolden = readFixture("golden/postgres/widgets.sql");
const sqliteWidgetsGolden = readFixture("golden/sqlite/widgets.sql");
const diffBefore = readFixture("schemas/diff-before.mrd");
const diffAfter = readFixture("schemas/diff-after.mrd");

describe("runCli: help and version", () => {
  it("--help prints usage and exits 0", () => {
    const result = run(["--help"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("meridian");
    expect(result.stdout).toContain("check");
    expect(result.stderr).toBe("");
  });

  it("--version prints the version number and exits 0", () => {
    const result = run(["--version"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("0.1.0\n");
  });
});

describe("runCli: usage errors", () => {
  it("exits 2 when no command is given", () => {
    const result = run([]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr.length).toBeGreaterThan(0);
  });

  it("exits 2 for an unknown command", () => {
    const result = run(["bogus"]);
    expect(result.exitCode).toBe(2);
  });

  it("exits 2 for a bad flag value", () => {
    const result = run(["check", "--format", "bogus", "a.mrd"], { "a.mrd": basic });
    expect(result.exitCode).toBe(2);
  });

  it("exits 2 when diff is given the wrong number of paths", () => {
    const result = run(["diff", "a.mrd"], { "a.mrd": basic });
    expect(result.exitCode).toBe(2);
  });
});

describe("runCli: input errors", () => {
  it("exits 3 when a path cannot be read", () => {
    const result = run(["check", "missing.mrd"], {});
    expect(result.exitCode).toBe(3);
  });
});

describe("runCli check", () => {
  it("exits 0 with no output for a well-formed schema", () => {
    const result = run(["check", "a.mrd"], { "a.mrd": basic });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
  });

  it("exits 1 and reports diagnostics on stderr for a schema with errors", () => {
    const result = run(["check", "a.mrd"], { "a.mrd": referentialErrors });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("MRD4003");
    expect(result.stdout).toBe("");
  });

  it("treats warnings as passing by default but failing under --strict", () => {
    const lenient = run(["check", "a.mrd"], { "a.mrd": namingWarnings });
    expect(lenient.exitCode).toBe(0);

    const strict = run(["check", "--strict", "a.mrd"], { "a.mrd": namingWarnings });
    expect(strict.exitCode).toBe(1);
  });

  it("renders a sorted-key JSON envelope to stdout with --format json", () => {
    const result = run(["check", "--format", "json", "a.mrd"], { "a.mrd": basic });
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toEqual({ diagnostics: [], ok: true, version: 1 });
  });

  it("suppresses all output under --quiet while keeping the exit code", () => {
    const result = run(["check", "--quiet", "a.mrd"], { "a.mrd": referentialErrors });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
  });
});

describe("runCli emit", () => {
  it("emits postgres DDL matching the golden fixture", () => {
    const result = run(["emit", "--dialect", "postgres", "w.mrd"], { "w.mrd": widgets });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(postgresWidgetsGolden);
  });

  it("emits sqlite DDL matching the golden fixture", () => {
    const result = run(["emit", "--dialect", "sqlite", "w.mrd"], { "w.mrd": widgets });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(sqliteWidgetsGolden);
  });

  it("defaults to postgres when no dialect flag is given", () => {
    const result = run(["emit", "w.mrd"], { "w.mrd": widgets });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(postgresWidgetsGolden);
  });

  it("emits nothing and exits 1 when the schema fails to compile", () => {
    const result = run(["emit", "a.mrd"], { "a.mrd": referentialErrors });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr.length).toBeGreaterThan(0);
  });
});

describe("runCli diff", () => {
  it("exits 1 and lists both compatible and breaking changes when any change is breaking", () => {
    const result = run(["diff", "old.mrd", "new.mrd"], { "old.mrd": diffBefore, "new.mrd": diffAfter });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("breaking: table 'legacy_tokens' was removed");
    expect(result.stdout).toContain("compatible: table 'comments' was added");
  });

  it("exits 0 with no output when comparing a schema to itself", () => {
    const result = run(["diff", "a.mrd", "b.mrd"], { "a.mrd": basic, "b.mrd": basic });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
  });
});

describe("runCli plan", () => {
  it("lists ordered migration steps between two schema versions", () => {
    const result = run(["plan", "old.mrd", "new.mrd"], { "old.mrd": diffBefore, "new.mrd": diffAfter });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("create table 'comments'");
    expect(result.stdout).toContain("drop table 'legacy_tokens'");
  });
});

describe("runCli explain", () => {
  it("explains a known diagnostic code", () => {
    const result = run(["explain", "MRD4001"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("MRD4001");
    expect(result.stdout).toContain("reserved word");
  });

  it("exits 2 for an unknown diagnostic code", () => {
    const result = run(["explain", "MRD9999"]);
    expect(result.exitCode).toBe(2);
  });

  it("exits 2 when no code is given", () => {
    const result = run(["explain"]);
    expect(result.exitCode).toBe(2);
  });
});
