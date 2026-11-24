# Custom MCP servers

Every agent session (Claude, Codex, Cursor, Pi) also gets the servers in `mcp.json`, next to `crons.json` in Birdsong's app data. Birdsong's own server comes first; a custom entry named `birdsong` is skipped.

New sessions pick the file up when they start. Bad entries are skipped with a `[mcp]` warning; a missing file means no custom servers.

```json
{
  "mcpServers": [
    { "type": "stdio", "name": "my-tools", "command": "/usr/local/bin/my-mcp", "args": ["--flag"],
      "env": [{ "name": "API_KEY", "value": "${MY_API_KEY}" }] },
    { "type": "http", "name": "remote", "url": "https://example.com/mcp",
      "headers": [{ "name": "Authorization", "value": "Bearer ${REMOTE_TOKEN}" }] }
  ]
}
```

`${VAR}` expands from the environment. Only `stdio` (supported by every agent) and `http` are accepted. Either kind takes an optional `"enabled": false` to keep the entry without loading it.
