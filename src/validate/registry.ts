import type { Rule } from "./engine.js";
import { NAMING_RULES } from "./rules/naming.js";

export const ALL_RULES: readonly Rule[] = [...NAMING_RULES];
