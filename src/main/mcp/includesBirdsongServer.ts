import type * as acp from "@agentclientprotocol/sdk/unstable";
import { BIRDSONG_SERVER_NAME } from "./birdsongServerName";

/** True when a session has Birdsong's own tools, not just custom servers. */
export function includesBirdsongServer(servers: readonly acp.McpServer[]): boolean {
  return servers.some((server) => server.name === BIRDSONG_SERVER_NAME);
}
