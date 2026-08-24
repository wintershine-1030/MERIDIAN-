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
