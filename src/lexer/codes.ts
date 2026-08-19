import { registerCode } from "../errors/catalog.js";

export const LEX_UNEXPECTED_CHARACTER = registerCode({
  code: "MRD1001",
  stage: "lex",
  defaultSeverity: "error",
  summary: "A character does not belong to any recognized token.",
}).code;
