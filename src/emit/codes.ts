import { registerCode } from "../errors/catalog.js";

export const EMIT_UNSUPPORTED_FOREIGN_KEY_ACTIONS = registerCode({
  code: "MRD7001",
  stage: "emit",
  defaultSeverity: "error",
  summary: "The target dialect does not support foreign key referential actions.",
}).code;

export const EMIT_UNSUPPORTED_INDEXES = registerCode({
  code: "MRD7002",
  stage: "emit",
  defaultSeverity: "error",
  summary: "The target dialect does not support indexes.",
}).code;
