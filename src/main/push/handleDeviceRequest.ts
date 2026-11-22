import type { IncomingMessage, ServerResponse } from "node:http";
import { errorMessage } from "../../shared/errorMessage";
import { readJson } from "../control/readJson";
import { sendJson } from "../control/sendJson";
import type { PushDevices } from "./PushDevices";

const TOKEN = /^[0-9a-f]{32,200}$/;
const TOPIC = /^[A-Za-z0-9][A-Za-z0-9.-]{1,200}$/;

/** `POST /devices` registers a phone; `DELETE /devices` drops it. The iOS bearer token is required. */
export async function handleDeviceRequest(req: IncomingMessage, res: ServerResponse, devices: PushDevices): Promise<void> {
  try {
    const method = (req.method ?? "GET").toUpperCase();
    if (method !== "POST" && method !== "DELETE") return sendJson(res, 404, { error: "Not found" });
    const body = await readJson(req);
    const token = typeof body.token === "string" ? body.token.trim().toLowerCase() : "";
    if (!TOKEN.test(token)) return sendJson(res, 400, { error: "token is required" });
    if (method === "DELETE") {
      await devices.remove(token);
      return sendJson(res, 200, { ok: true });
    }
    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    if (!TOPIC.test(topic)) return sendJson(res, 400, { error: "topic is required" });
    await devices.upsert({ token, sandbox: body.sandbox === true, topic });
    return sendJson(res, 200, { ok: true });
  } catch (err) {
    return sendJson(res, 400, { error: errorMessage(err) });
  }
}
