import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { pushDevicesPath } from "../storage/userDataPaths";
import { parsePushDevice, type PushDevice } from "./PushDevice";

/** Phones and tablets that asked to be alerted when a turn finishes. */
export class PushDevices {
  private devices: PushDevice[] | null = null;
  private queue = Promise.resolve();

  list(): Promise<PushDevice[]> {
    return this.enqueue(() => this.loaded());
  }

  upsert(device: PushDevice): Promise<void> {
    return this.enqueue(async () => {
      const devices = await this.loaded();
      this.devices = [...devices.filter((item) => item.token !== device.token), device];
      await this.write();
    });
  }

  remove(token: string): Promise<void> {
    return this.enqueue(async () => {
      const devices = await this.loaded();
      this.devices = devices.filter((item) => item.token !== token);
      await this.write();
    });
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task);
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async loaded(): Promise<PushDevice[]> {
    if (this.devices) return this.devices;
    try {
      this.devices = parseDevices(JSON.parse(await readFile(pushDevicesPath(), "utf8")));
    } catch {
      this.devices = [];
    }
    return this.devices;
  }

  private async write(): Promise<void> {
    const file = pushDevicesPath();
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, `${JSON.stringify({ devices: this.devices ?? [] }, null, 2)}\n`, { mode: 0o600 });
  }
}

function parseDevices(raw: unknown): PushDevice[] {
  if (!raw || typeof raw !== "object") return [];
  const devices = (raw as { devices?: unknown }).devices;
  if (!Array.isArray(devices)) return [];
  return devices.flatMap((item) => parsePushDevice(item) ?? []);
}
