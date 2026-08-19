import { registerCode } from "../errors/catalog.js";

export const PARSE_UNEXPECTED_TOKEN = registerCode({
  code: "MRD2001",
  stage: "parse",
  defaultSeverity: "error",
  summary: "A token appeared where the grammar did not expect it.",
}).code;
