import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { EventEmitter } from "node:events";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";

const jiti = createJiti(import.meta.url, {
  alias: { electron: fileURLToPath(new URL("./fixtures/sessionLinksElectron.cjs", import.meta.url)) },
});
const electron = createRequire(import.meta.url)("./fixtures/sessionLinksElectron.cjs");
const { sessionLink } = await jiti.import("../src/shared/sessionLink.ts");
const { sessionIdFromLink } = await jiti.import("../src/shared/sessionIdFromLink.ts");
const { installSessionLinks } = await jiti.import("../src/main/lifecycle/installSessionLinks.ts");
const { markdownUrlTransform } = await jiti.import("../src/renderer/features/markdown/markdownUrlTransform.ts");
const { remarkSessionLinks } = await jiti.import("../src/renderer/features/markdown/remarkSessionLinks.ts");
const settle = () => new Promise((resolve) => setImmediate(resolve));

function fixture(t, initialLinks = []) {
  electron.app.removeAllListeners();
  electron.handlers.clear();
  const argv = process.argv;
  process.argv = [argv[0], argv[1], ...initialLinks];
  t.after(() => { process.argv = argv; });
  const opened = [];
  const windowEvents = [];
  const win = new EventEmitter();
  win.isMinimized = () => true;
  win.restore = () => windowEvents.push("restore");
  win.show = () => windowEvents.push("show");
  win.focus = () => windowEvents.push("focus");
  win.webContents = new EventEmitter();
  installSessionLinks({ navigateToSession: async (id) => opened.push(id) }, () => win);
  electron.app.emit("browser-window-created", {}, win);
  return { opened, windowEvents, win, ready: () => electron.handlers.get("sessions:linksReady")() };
}

test("session URLs round-trip current and legacy ids and reject pairing or unsafe paths", () => {
  for (const id of ["2026-11-16-a9b3-1234", "8b3e8-uuid", "legacy_ID"]) {
    assert.equal(sessionIdFromLink(sessionLink(id)), id);
  }
  for (const url of [
    "birdsong://machine.ts.net?token=secret", "https://session/id", "birdsong://session/",
    "birdsong://session/..", "birdsong://session/../other", "birdsong://session/%2e%2e",
    "birdsong://session/id%2fother", "birdsong://session/id?token=x", "birdsong://session/id#event",
    "birdsong://user@session/id", "birdsong://session:123/id", "birdsong://session/id\n",
  ]) assert.equal(sessionIdFromLink(url), null, url);
});

test("cold-start argv and macOS links wait for renderer subscriptions, then focus and open", async (t) => {
  const f = fixture(t, [sessionLink("argv-session")]);
  let prevented = false;
  electron.app.emit("open-url", { preventDefault: () => { prevented = true; } }, sessionLink("mac-session"));
  assert.equal(prevented, true);
  assert.deepEqual(f.opened, []);
  f.ready();
  await settle();
  assert.deepEqual(f.opened, ["argv-session", "mac-session"]);
  assert.deepEqual(f.windowEvents, ["restore", "show", "focus", "restore", "show", "focus"]);
});

test("warm launches and in-app links open repeatedly; reloads queue until ready again", async (t) => {
  const f = fixture(t);
  f.ready();
  electron.app.emit("second-instance", {}, ["electron", ".", sessionLink("same")]);
  electron.handlers.get("sessions:openLink")({}, sessionLink("same"));
  await settle();
  assert.deepEqual(f.opened, ["same", "same"]);
  f.win.webContents.emit("did-start-loading");
  electron.handlers.get("sessions:openLink")({}, sessionLink("after-reload"));
  await settle();
  assert.deepEqual(f.opened, ["same", "same"]);
  f.ready();
  await settle();
  assert.deepEqual(f.opened, ["same", "same", "after-reload"]);
});

test("pairing links are ignored and the desktop registers its scheme", async (t) => {
  const f = fixture(t);
  f.ready();
  electron.app.emit("ready");
  assert.deepEqual(electron.registration, ["birdsong"]);
  electron.app.emit("open-url", { preventDefault: () => assert.fail("pairing link intercepted") },
    "birdsong://machine.ts.net?token=secret");
  await settle();
  assert.deepEqual(f.opened, []);
});

test("Markdown links and pasted session URLs are clickable, while code and unsafe schemes stay safe", () => {
  const link = sessionLink("target");
  const html = renderToStaticMarkup(createElement(ReactMarkdown, {
    urlTransform: markdownUrlTransform,
    remarkPlugins: [remarkSessionLinks],
    children: `[Open session](${link}) and ${link}. \`${link}\` [bad](javascript:alert) ${link}?token=x birdsong://session/../other`,
  }));
  assert.equal(html.match(/href="birdsong:\/\/session\/target"/g).length, 2);
  assert.ok(html.includes(`<code>${link}</code>`));
  assert.ok(!html.includes('href="javascript:'));
  assert.equal(markdownUrlTransform("birdsong://session/../other"), "");
});
