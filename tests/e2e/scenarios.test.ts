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
