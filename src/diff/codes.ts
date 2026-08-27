import { registerCode } from "../errors/catalog.js";

export const DIFF_BREAKING_CHANGE = registerCode({
  code: "MRD5001",
  stage: "diff",
  defaultSeverity: "error",
  summary: "A structural change between schema versions is not backward compatible.",
}).code;
