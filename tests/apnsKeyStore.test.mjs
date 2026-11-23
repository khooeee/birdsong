import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

process.env.BIRDSONG_TEST_USER_DATA = await fs.mkdtemp(path.join(os.tmpdir(), "birdsong-apns-"));
const fixture = (name) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
const jiti = createJiti(import.meta.url, { alias: { electron: fixture("apnsElectron.cjs") } });

const { apnsKeyStore } = await jiti.import("../src/main/push/apnsKeyStore.ts");
const { getAppSettings, hydrateAppSettings } = await jiti.import("../src/main/appSettings.ts");

const PEM = "-----BEGIN PRIVATE KEY-----\nMIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgFakeKeyForTests\n-----END PRIVATE KEY-----";

test("importing a .p8 encrypts it and read returns the key", async () => {
  hydrateAppSettings({});
  const source = path.join(process.env.BIRDSONG_TEST_USER_DATA, "AuthKey_TEST.p8");
  await fs.writeFile(source, `${PEM}\n`);
  await apnsKeyStore.importFromPath(source);
  assert.equal(await apnsKeyStore.read(), PEM);
  assert.deepEqual(await apnsKeyStore.info(), { hasKey: true, secure: true });
  await apnsKeyStore.remove();
  assert.equal(await apnsKeyStore.read(), null);
});

test("importing a non-key file rejects", async () => {
  const source = path.join(process.env.BIRDSONG_TEST_USER_DATA, "not-a-key.txt");
  await fs.writeFile(source, "hello");
  await assert.rejects(apnsKeyStore.importFromPath(source), /not a \.p8/);
  assert.equal(await apnsKeyStore.read(), null);
});

test("migrateLegacy imports the old path and clears the setting", async () => {
  hydrateAppSettings({});
  const legacy = path.join(process.env.BIRDSONG_TEST_USER_DATA, "legacy", "AuthKey_OLD.p8");
  await fs.mkdir(path.dirname(legacy), { recursive: true });
  await fs.writeFile(legacy, PEM);
  hydrateAppSettings({ apnsKeyId: "K", apnsTeamId: "T", apnsKeyPath: legacy });
  assert.equal(await apnsKeyStore.migrateLegacy(), true);
  assert.equal(getAppSettings().apnsKeyPath, "");
  assert.equal(await apnsKeyStore.read(), PEM);
  await apnsKeyStore.remove();
});

test("migrateLegacy keeps a missing legacy path without failing", async () => {
  hydrateAppSettings({ apnsKeyPath: path.join(process.env.BIRDSONG_TEST_USER_DATA, "gone.p8") });
  assert.equal(await apnsKeyStore.migrateLegacy(), false);
  assert.notEqual(getAppSettings().apnsKeyPath, "");
});
