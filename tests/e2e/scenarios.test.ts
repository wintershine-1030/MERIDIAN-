import { describe, expect, it } from "vitest";
import { run } from "../helpers/harness.js";
import { readFixture } from "../helpers/fixtures.js";

const namingWarnings = readFixture("schemas/validate-naming.mrd");
const diffBefore = readFixture("schemas/diff-before.mrd");
const diffAfter = readFixture("schemas/diff-after.mrd");

describe("multi-file projects", () => {
  const usersFile = `schema catalog v1

table users {
  id uuid primary key
  email text not null unique
}
`;
  const postsFile = `schema catalog v1

table posts {
  id uuid primary key
  author uuid not null references users.id on delete cascade
  title text not null
}
`;

  it("merges tables declared across multiple files into one schema", () => {
    const result = run(["check", "users.mrd", "posts.mrd"], {
      "users.mrd": usersFile,
      "posts.mrd": postsFile,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
  });

  it("reports a duplicate-table error when two files declare the same table name", () => {
    const result = run(["check", "users.mrd", "users-again.mrd"], {
      "users.mrd": usersFile,
      "users-again.mrd": usersFile,
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("MRD3");
  });

  it("emits DDL for a table only defined once the second file's tables are merged in", () => {
    const result = run(["emit", "--dialect", "postgres", "users.mrd", "posts.mrd"], {
      "users.mrd": usersFile,
      "posts.mrd": postsFile,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('CREATE TABLE "users"');
    expect(result.stdout).toContain('CREATE TABLE "posts"');
  });

  it("does not fabricate a diagnostic on the losing side of a duplicate-table conflict", () => {
    // a.mrd (sorts first, wins the merge) has a real nullable-primary-key bug; b.mrd (loses)
    // declares the same table name but with a genuinely valid, non-nullable primary key.
    // The losing file must not be validated against the winning file's (buggy) column data.
    const a = `schema catalog v1

table widgets {
  id uuid? primary key
}
`;
    const b = `schema catalog v1

table widgets {
  id uuid primary key
}
`;
    const result = run(["check", "a.mrd", "b.mrd"], { "a.mrd": a, "b.mrd": b });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("MRD3001");
    expect(result.stderr).toContain("a.mrd");
    // b.mrd's own text ("id uuid primary key") never declares a nullable primary key, so no
    // MRD4006 should ever be attributed to it.
    const nullablePkOnB = result.stderr
      .split("\n\n")
      .some((block) => block.includes("MRD4006") && block.includes("b.mrd"));
    expect(nullablePkOnB).toBe(false);
  });

  it("reports a mismatched catalog/version across input files", () => {
    const result = run(["check", "a.mrd", "b.mrd"], {
      "a.mrd": "schema catalog_a v1\n\ntable t1 {\n  id uuid primary key\n}\n",
      "b.mrd": "schema catalog_b v9\n\ntable t2 {\n  id uuid primary key\n}\n",
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("MRD3004");
  });
});

describe("warnings do not block emit", () => {
  it("still emits DDL when the only diagnostics are warnings", () => {
    const result = run(["emit", "a.mrd"], { "a.mrd": namingWarnings });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("CREATE TABLE");
    expect(result.stderr).toContain("warning[MRD4");
  });

  it("fails the same emit under --strict, which promotes warnings to failures", () => {
    const result = run(["emit", "--strict", "a.mrd"], { "a.mrd": namingWarnings });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
  });
});

describe("configuration file errors", () => {
  it("a malformed meridian.config.json is reported, not silently replaced by defaults", () => {
    const result = run(["check", "a.mrd"], {
      "a.mrd": "schema catalog v1\n\ntable t {\n  id uuid primary key\n}\n",
      "meridian.config.json": "{ not valid json",
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("MRD8001");
  });
});

describe("path separator normalization", () => {
  it("normalizes backslashes to forward slashes in diagnostic file paths", () => {
    const result = run(["check", "schemas\\validate-referential.mrd"], {
      "schemas/validate-referential.mrd": readFixture("schemas/validate-referential.mrd"),
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--> schemas/validate-referential.mrd:");
    expect(result.stderr).not.toContain("\\");
  });
});

describe("diff and plan agree on the shape of change", () => {
  it("plan emits exactly one step per change diff reports", () => {
    const diffResult = run(["diff", "old.mrd", "new.mrd"], { "old.mrd": diffBefore, "new.mrd": diffAfter });
    const planResult = run(["plan", "old.mrd", "new.mrd"], { "old.mrd": diffBefore, "new.mrd": diffAfter });

    const diffLineCount = diffResult.stdout.split("\n").filter((line) => line.length > 0).length;
    const planLineCount = planResult.stdout.split("\n").filter((line) => line.length > 0).length;

    expect(diffLineCount).toBe(13);
    expect(planLineCount).toBe(13);
  });
});
