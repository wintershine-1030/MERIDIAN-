import type { Rule } from "./engine.js";
import { NAMING_RULES } from "./rules/naming.js";
import { REFERENTIAL_RULES } from "./rules/referential.js";

export const ALL_RULES: readonly Rule[] = [...NAMING_RULES, ...REFERENTIAL_RULES];
