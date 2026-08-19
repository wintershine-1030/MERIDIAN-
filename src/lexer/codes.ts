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

export const LEX_UNKNOWN_ESCAPE_SEQUENCE = registerCode({
  code: "MRD1003",
  stage: "lex",
  defaultSeverity: "warning",
  summary: "An escape sequence inside a string literal is not recognized.",
}).code;
