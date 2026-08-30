export const VERSION = "0.1.0";

export const HELP_TEXT = `meridian - a declarative data-contract compiler

Usage:
  meridian check <paths...>            validate schema files, print diagnostics
  meridian emit <paths...>             emit dialect DDL (--dialect postgres|sqlite)
  meridian diff <old> <new>            structural diff between two schema files
  meridian plan <old> <new>            ordered migration steps between two schema files
  meridian explain <code>              explain a diagnostic code
  meridian --help                      show this help text
  meridian --version                   show the version number

Global flags:
  --format human|json    diagnostic output format (default: human)
  --strict                treat warnings as failures
  --quiet                 suppress normal output
  --no-color              disable colored output
`;
