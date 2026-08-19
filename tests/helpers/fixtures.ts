import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const FIXTURES_ROOT = fileURLToPath(new URL("../fixtures/", import.meta.url));

export function readFixture(relativePath: string): string {
  return readFileSync(join(FIXTURES_ROOT, relativePath), "utf8");
}
