import assert from "node:assert/strict";
import { test } from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { buildInstallManifest } = await jiti.import("../src/main/ios/installManifest.ts");

test("manifest contains bundle id, version, title and IPA url", () => {
  const plist = buildInstallManifest({
    ipaUrl: "https://mac.tail.ts.net/ios/abc/app.ipa",
    bundleId: "com.example.app",
    version: "1.2",
    title: "App",
  });
  assert.match(plist, /com\.example\.app/);
  assert.match(plist, /software-package/);
  assert.match(plist, /https:\/\/mac\.tail\.ts\.net\/ios\/abc\/app\.ipa/);
});

test("manifest escapes XML", () => {
  const plist = buildInstallManifest({
    ipaUrl: "https://x/ios/a.ipa",
    bundleId: "com.example.app",
    version: "1.0",
    title: 'A&B <App>',
  });
  assert.match(plist, /A&amp;B &lt;App&gt;/);
});
