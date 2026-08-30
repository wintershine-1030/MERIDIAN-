# MERIDIAN

MERIDIAN is a declarative data-contract compiler and migration planner. You
describe database tables, columns, types, nullability, keys, and references
in a small text language (`.mrd` files); MERIDIAN parses, validates, and
normalizes that description, then uses it to generate dialect-specific DDL,
compute structural diffs between two versions of a schema, and produce
ordered migration plans.

The project is in active early development. This document describes the
target language and CLI surface; the implementation is being built out
incrementally on top of the pipeline described below.

## Why

Schema changes are usually authored twice: once as a mental model, and once
as hand-written SQL migrations that have to stay consistent with it by
convention. MERIDIAN keeps a single declarative source of truth, and derives
DDL, diffs, and migration plans from it mechanically, so that "what changed"
and "is this change safe" are answered by the tool rather than by
inspection.

## The contract language

A `.mrd` file opens with a schema header and declares one or more tables:

```
schema catalog v1

table users {
  id          uuid        primary key
  email       text        not null unique
  created_by  uuid?       references users.id on delete set null
  display     text?       default "anonymous"
}

table posts {
  id        uuid    primary key
  author    uuid    not null references users.id on delete cascade
  title     text    not null
  body      text?
  index (author, title) unique
}
```

Columns are declared as `name type [modifiers...]`. A `?` suffix on a type
marks the column nullable; omitting it means `not null` is implied unless
stated otherwise. Constraints (`primary key`, `unique`, `references`,
`default`) attach directly to a column, or, for multi-column cases, to a
table-level `index (...)` declaration.

## Pipeline

Source text moves through a fixed sequence of pure stages:

```
sources -> lexer -> parser -> ir -> validate -> {emit, diff -> plan} -> report
```

Every stage is a pure function from data to data: no filesystem or network
access below the CLI layer, no clocks, no randomness. That is what makes the
tool's output reproducible run over run, and it is a hard design constraint,
not an implementation detail — see "Determinism" below.

- **lexer** turns source text into a token stream with byte-accurate spans.
- **parser** builds an AST, recovering from errors so that a single file can
  report more than one problem at a time.
- **ir** normalizes the AST into a resolved model: types are resolved,
  symbols are checked for duplicates, and table/column/constraint ordering
  is canonicalized so that two schemas that differ only in declaration
  order produce identical output.
- **validate** runs a rule engine over the IR and produces coded
  diagnostics (naming, referential integrity, nullability/default
  consistency, and more).
- **emit** renders the validated IR as DDL for a target SQL dialect.
- **diff** structurally compares two IR snapshots and classifies each
  change.
- **plan** turns a classified diff into an ordered sequence of migration
  steps.
- **report** renders diagnostics and results either as human-readable text
  or as sorted-key JSON.

## CLI

```
meridian check   <paths...>        validate files, print diagnostics
meridian emit    <paths...>        --dialect postgres|sqlite
meridian diff    <old> <new>       structural diff between two versions
meridian plan    <old> <new>       ordered migration steps
meridian explain <code>            explain a diagnostic code
meridian --help | --version
```

Global flags: `--format human|json`, `--strict`, `--quiet`, `--no-color`.

Exit codes are fixed: `0` success, `1` diagnostics at error severity,
`2` usage error, `3` input error (unreadable path, no files matched).

## Determinism

MERIDIAN never reads a clock, calls into randomness, or depends on
filesystem/object iteration order. Concretely, and enforced by lint rule
rather than by convention:

- No `Date`, `Date.now`, or `performance.now` in any code path that
  influences output; a clock is injected where one is genuinely needed.
- No `Math.random`.
- No reliance on `Map`/`Set`/object key order or directory listing order
  without an explicit sort first.
- `JSON.stringify` output always has sorted keys.

This is why the test suite can assert exact output byte-for-byte, and why
running the suite repeatedly produces identical reports.

## Public API

`src/index.ts` exports exactly two functions, and nothing else — every test
in this repository asserts through one of them, never through an internal
module path:

```ts
export interface Io {
  readFile(path: string): string;
  listDir(path: string): string[];
  now(): number;
  readonly cwd: string;
}

export interface CliResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}

function runCli(argv: readonly string[], io: Io): CliResult;

export interface CompileOptions {
  readonly rules?: readonly Rule[];
  readonly strict?: boolean;
}

export interface CompileResult {
  readonly ok: boolean;
  readonly ir: IrSchema | null;
  readonly diagnostics: readonly Diagnostic[];
}

function compile(sources: Record<string, string>, options?: CompileOptions): CompileResult;
```

`compile` is the pure core: lex, parse, build IR, and validate over one or
more in-memory sources, with no filesystem access. `runCli` wraps it with
argument parsing, dialect selection, and the diagnostic renderers, reading
its inputs exclusively through the injected `Io`, so it can be exercised in
tests without ever touching a real disk.

## Output contracts

These shapes are frozen: nothing that emits or parses them should change
without a very good reason.

Exit codes:

```
0  success, no diagnostics above the failure threshold
1  diagnostics at error severity (or warning, under --strict)
2  usage error: unknown command, bad flag, missing argument
3  input error: unreadable path
```

Diagnostic codes are `MRD####`, grouped by stage: `1xxx` lex, `2xxx` parse,
`3xxx` resolve, `4xxx` validate, `5xxx` diff, `6xxx` plan, `7xxx` emit,
`8xxx` config. `meridian explain <code>` prints the registered summary for
any code.

Human diagnostic output (stderr unless `--format json`), one block per
diagnostic:

```
<severity>[<code>]: <message>
  --> <file>:<line>:<column>
```

JSON diagnostic output (stdout, `--format json`), keys sorted
alphabetically at every level:

```json
{
  "diagnostics": [
    { "code": "MRD4012", "column": 3, "file": "schema.mrd", "line": 12,
      "message": "...", "severity": "error" }
  ],
  "ok": false,
  "version": 1
}
```

Emit output: one statement per paragraph, tables ordered by dependency
then by name, two-space indent, identifiers quoted per dialect, trailing
newline always present.

## Usage examples

Check a schema and print any diagnostics:

```
$ meridian check schema.mrd
$ echo $?
0
```

Emit DDL for a target dialect:

```
$ meridian emit --dialect postgres schema.mrd
CREATE TABLE "users" (
  "id" uuid PRIMARY KEY,
  ...
);
```

Compare two versions of a schema and see which changes are safe:

```
$ meridian diff schema-v1.mrd schema-v2.mrd
compatible: column 'users.last_login' was added
breaking: column 'users.display' was removed
```

Generate the ordered steps to get from one version to the other:

```
$ meridian plan schema-v1.mrd schema-v2.mrd
add column 'last_login' to 'users'
drop column 'display' from 'users'
```

Look up what a diagnostic code means:

```
$ meridian explain MRD4006
MRD4006 [validate, error]: A primary key column is declared nullable.
```

Machine-readable output for any command that reports diagnostics:

```
$ meridian check --format json schema.mrd
```

## Diagnostic code reference

| Code | Stage | Meaning |
| --- | --- | --- |
| MRD1001 | lex | A character does not belong to any recognized token. |
| MRD1002 | lex | A string literal was not closed before the end of the line or file. |
| MRD1003 | lex | An escape sequence inside a string literal is not recognized. |
| MRD2001 | parse | A token appeared where the grammar did not expect it. |
| MRD3001 | resolve | Two tables in the same schema declare the same name. |
| MRD3002 | resolve | Two columns in the same table declare the same name. |
| MRD3003 | resolve | A column declares a type name that is not a recognized scalar type. |
| MRD4001 | validate | A table or column name matches a common SQL reserved word. |
| MRD4002 | validate | A table or column name does not follow lowercase snake_case naming. |
| MRD4003 | validate | A references clause targets a table that does not exist in the schema. |
| MRD4004 | validate | A references clause targets a column that does not exist on the target table. |
| MRD4005 | validate | A table-level index references a column that does not exist on the table. |
| MRD4006 | validate | A primary key column is declared nullable. |
| MRD4007 | validate | A unique column has a constant default, which only the first row can use. |
| MRD5001 | diff | A structural change between schema versions is not backward compatible. |
| MRD7001 | emit | The target dialect does not support foreign key referential actions. |
| MRD7002 | emit | The target dialect does not support indexes. |
| MRD8001 | config | The configuration file does not contain valid JSON. |
| MRD8002 | config | A configuration field has an invalid value or type. |

Run `meridian explain <code>` for the authoritative, up-to-date text for any
code — this table is a convenience snapshot, not the source of truth.

## Project layout

```
src/            first-party source, organized by pipeline stage
tests/          unit, integration, and end-to-end tests (never colocated
                with source)
tests/fixtures/ input fixtures and golden output files
```

`src/index.ts` is the only supported entry point for programmatic use.

## Development

Requirements: Node.js 24.

```
npm ci             # install pinned dependencies
npm run typecheck  # tsc --noEmit
npm run lint       # eslint .
npm test           # vitest run
npm run build      # tsc -p tsconfig.json
```

The project has zero runtime dependencies by design; all dependencies are
development-only (TypeScript, Vitest, ESLint) and pinned to exact versions
in `package.json`, with `package-lock.json` committed.

## Status

The full pipeline described above is implemented and wired end to end
through `runCli`: lex, parse, ir, validate, emit (postgres and sqlite),
diff, plan, and both report renderers, behind the `check`, `emit`, `diff`,
`plan`, and `explain` commands. Development continues incrementally on top
of this base, with CI enforcing typecheck, lint, and test on every push.

## License

MIT. See [LICENSE](LICENSE).
