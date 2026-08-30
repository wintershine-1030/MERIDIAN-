export interface Io {
  readFile(path: string): string;
  listDir(path: string): string[];
  now(): number;
  readonly cwd: string;
}

export interface CliResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}
