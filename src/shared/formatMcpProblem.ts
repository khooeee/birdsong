import type { McpProblem } from "./mcpProblem";

/** One line naming the server, for lists that mix every server's problems. */
export function formatMcpProblem({ server, message }: McpProblem): string {
  return server === null ? message : `${server || "(no name)"}: ${message}`;
}
