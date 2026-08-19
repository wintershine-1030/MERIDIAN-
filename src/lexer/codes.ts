import { registerCode } from "../errors/catalog.js";

export const LEX_UNEXPECTED_CHARACTER = registerCode({
  code: "MRD1001",
  stage: "lex",
  defaultSeverity: "error",
  summary: "A character does not belong to any recognized token.",
}).code;

export const LEX_UNTERMINATED_STRING = registerCode({
  code: "MRD1002",
  stage: "lex",
  defaultSeverity: "error",
  summary: "A string literal was not closed before the end of the line or file.",
}).code;
