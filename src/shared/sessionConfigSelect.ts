import type { SessionConfigOption } from "@agentclientprotocol/sdk/unstable";

export type SessionConfigSelect = Extract<SessionConfigOption, { type: "select" }>;
