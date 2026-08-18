import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**", "reports/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    rules: {
      "no-console": "warn",
      // tsc already catches undefined references; no-undef false-positives on TS-only syntax.
      "no-undef": "off",
      "no-restricted-properties": [
        "error",
        { object: "Date", property: "now", message: "Date.now() is non-deterministic; inject a clock instead." },
        { object: "performance", property: "now", message: "performance.now() is non-deterministic; inject a clock instead." },
        { object: "Math", property: "random", message: "Math.random() is non-deterministic and must not be used." },
        { object: "process", property: "env", message: "process.env is only permitted in src/config/env.ts." },
        { object: "JSON", property: "stringify", message: "JSON.stringify is only permitted in src/report/json.ts, which sorts keys." },
        { property: "localeCompare", message: "localeCompare is locale-dependent; use an explicit codepoint compare." },
      ],
      "no-restricted-syntax": [
        "error",
        { selector: "NewExpression[callee.name='Date']", message: "new Date() is non-deterministic; inject a clock instead." },
        { selector: "CallExpression[callee.name='Date']", message: "Date() is non-deterministic; inject a clock instead." },
        { selector: "FunctionDeclaration[async=true]", message: "async functions are banned; this project is synchronous end to end." },
        { selector: "FunctionExpression[async=true]", message: "async functions are banned; this project is synchronous end to end." },
        { selector: "ArrowFunctionExpression[async=true]", message: "async functions are banned; this project is synchronous end to end." },
        { selector: "AwaitExpression", message: "await is banned; this project is synchronous end to end." },
      ],
      "no-restricted-globals": [
        "error",
        { name: "Promise", message: "Promise is banned; this project is synchronous end to end." },
        { name: "setTimeout", message: "setTimeout is banned; this project is synchronous end to end." },
        { name: "setInterval", message: "setInterval is banned; this project is synchronous end to end." },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: ["fs", "node:fs", "fs/promises", "node:fs/promises", "path", "node:path", "os", "node:os"].map(
            (name) => ({
              name,
              message: "filesystem and OS modules are only permitted in src/util/fs.ts and the cli layer.",
            }),
          ),
        },
      ],
    },
  },
);
