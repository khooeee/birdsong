import { shellEnv } from "../../shellEnv/shellEnv";
import { mcpServerProblem } from "./mcpServerProblem";
import { parseMcpServers } from "./parseMcpServers";

/** Errors that block saving `text`, plus servers that sessions would leave out. */
export async function checkMcpServers(text: string): Promise<string[]> {
  const { servers, errors } = parseMcpServers(text);
  const env = await shellEnv.get();
  const problems = servers.map((server) => mcpServerProblem(server, env)).filter((problem) => problem !== null);
  return [...errors, ...problems];
}
