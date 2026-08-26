import { registerCode } from "../errors/catalog.js";

export const CONFIG_INVALID_JSON = registerCode({
  code: "MRD8001",
  stage: "config",
  defaultSeverity: "error",
  summary: "The configuration file does not contain valid JSON.",
}).code;

export const CONFIG_INVALID_FIELD = registerCode({
  code: "MRD8002",
  stage: "config",
  defaultSeverity: "error",
  summary: "A configuration field has an invalid value or type.",
}).code;
