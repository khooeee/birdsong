/** What the form shows of one server. Values may hold `${VAR}` references. */
export type McpServerFields = {
  kind: "command" | "url";
  /** The command, then its args. */
  words: string[];
  env: Record<string, string>;
  url: string;
  headers: Record<string, string>;
  enabled: boolean;
};
