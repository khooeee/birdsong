// Pi extension: registers the ACP `mcpServers` Birdsong passes in PI_ACP_MCP_SERVERS for this session.
const toRecord = (list = []) => Object.fromEntries(list.map(({ name, value }) => [name, value]));

export default function registerMcpServers(pi) {
  const raw = process.env.PI_ACP_MCP_SERVERS;
  if (!raw) return;
  // Keep the servers' credentials out of the shell commands Pi runs.
  delete process.env.PI_ACP_MCP_SERVERS;
  for (const server of JSON.parse(raw)) {
    const transport = "url" in server
      ? { url: server.url, headers: toRecord(server.headers) }
      : { command: server.command, args: server.args ?? [], env: toRecord(server.env) };
    // Birdsong's few tools go straight to the model. Custom servers keep Pi's default, so long tool lists stay out of context.
    const exposure = server.name === "birdsong" ? { exposure: "direct" } : {};
    try {
      pi.registerMcpServer(server.name, { ...transport, ...exposure });
    } catch (error) {
      // One bad server must not cost the session the others.
      console.error(`Could not register MCP server ${server.name}:`, error);
    }
  }
}
