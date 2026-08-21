import { registerCode } from "../errors/catalog.js";

export const IR_DUPLICATE_TABLE = registerCode({
  code: "MRD3001",
  stage: "resolve",
  defaultSeverity: "error",
  summary: "Two tables in the same schema declare the same name.",
}).code;

export const IR_DUPLICATE_COLUMN = registerCode({
  code: "MRD3002",
  stage: "resolve",
  defaultSeverity: "error",
  summary: "Two columns in the same table declare the same name.",
}).code;

export const IR_UNKNOWN_TYPE = registerCode({
  code: "MRD3003",
  stage: "resolve",
  defaultSeverity: "error",
  summary: "A column declares a type name that is not a recognized scalar type.",
}).code;
