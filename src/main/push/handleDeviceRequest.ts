import type { IncomingMessage, ServerResponse } from "node:http";
import { errorMessage } from "../../shared/errorMessage";
import { readJson } from "../control/readJson";
import { sendJson } from "../control/sendJson";
import { APNS_TOKEN, APNS_TOPIC, FCM_TOKEN } from "./PushDevice";
import type { PushDevices } from "./PushDevices";

/**
 * `POST /devices` registers a phone or tablet; `DELETE /devices` drops it. The mobile bearer token is required.
 * `platform` is `fcm` for Android; absent means APNs, as older iOS builds send.
 */
export async function handleDeviceRequest(req: IncomingMessage, res: ServerResponse, devices: PushDevices): Promise<void> {
  try {
    const method = (req.method ?? "GET").toUpperCase();
    if (method !== "POST" && method !== "DELETE") return sendJson(res, 404, { error: "Not found" });
    const body = await readJson(req);
    const fcm = body.platform === "fcm";
    const raw = typeof body.token === "string" ? body.token.trim() : "";
    // APNs tokens are hex in any case; FCM tokens are case-sensitive.
    const token = fcm ? raw : raw.toLowerCase();
    if (!(fcm ? FCM_TOKEN : APNS_TOKEN).test(token)) return sendJson(res, 400, { error: "token is required" });
    if (method === "DELETE") {
      await devices.remove(token);
      return sendJson(res, 200, { ok: true });
    }
    if (fcm) {
      await devices.upsert({ platform: "fcm", token });
      return sendJson(res, 200, { ok: true });
    }
    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    if (!APNS_TOPIC.test(topic)) return sendJson(res, 400, { error: "topic is required" });
    await devices.upsert({ platform: "apns", token, sandbox: body.sandbox === true, topic });
    return sendJson(res, 200, { ok: true });
  } catch (err) {
    return sendJson(res, 400, { error: errorMessage(err) });
  }
}
