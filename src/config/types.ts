export type DialectName = "postgres" | "sqlite";

export interface MeridianConfig {
  readonly dialect: DialectName;
  readonly strict: boolean;
  readonly format: "human" | "json";
  readonly quiet: boolean;
  readonly color: boolean;
}

export const DEFAULT_CONFIG: MeridianConfig = {
  dialect: "postgres",
  strict: false,
  format: "human",
  quiet: false,
  color: true,
};

export interface PartialConfig {
  readonly dialect?: DialectName;
  readonly strict?: boolean;
  readonly format?: "human" | "json";
  readonly quiet?: boolean;
  readonly color?: boolean;
}
