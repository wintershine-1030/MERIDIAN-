import { registerCode } from "../errors/catalog.js";

export const VALIDATE_RESERVED_WORD = registerCode({
  code: "MRD4001",
  stage: "validate",
  defaultSeverity: "warning",
  summary: "A table or column name matches a common SQL reserved word.",
}).code;

export const VALIDATE_NAMING_CONVENTION = registerCode({
  code: "MRD4002",
  stage: "validate",
  defaultSeverity: "warning",
  summary: "A table or column name does not follow lowercase snake_case naming.",
}).code;

export const VALIDATE_UNKNOWN_REFERENCE_TABLE = registerCode({
  code: "MRD4003",
  stage: "validate",
  defaultSeverity: "error",
  summary: "A references clause targets a table that does not exist in the schema.",
}).code;

export const VALIDATE_UNKNOWN_REFERENCE_COLUMN = registerCode({
  code: "MRD4004",
  stage: "validate",
  defaultSeverity: "error",
  summary: "A references clause targets a column that does not exist on the target table.",
}).code;

export const VALIDATE_UNKNOWN_INDEX_COLUMN = registerCode({
  code: "MRD4005",
  stage: "validate",
  defaultSeverity: "error",
  summary: "A table-level index references a column that does not exist on the table.",
}).code;

export const VALIDATE_NULLABLE_PRIMARY_KEY = registerCode({
  code: "MRD4006",
  stage: "validate",
  defaultSeverity: "error",
  summary: "A primary key column is declared nullable.",
}).code;

export const VALIDATE_UNIQUE_CONSTANT_DEFAULT = registerCode({
  code: "MRD4007",
  stage: "validate",
  defaultSeverity: "warning",
  summary: "A unique column has a constant default, which only the first row can use.",
}).code;
