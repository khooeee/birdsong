import assert from "node:assert/strict";
import { test } from "node:test";
import { createJiti } from "jiti";

Object.defineProperty(globalThis, "navigator", { value: { platform: "MacIntel" }, configurable: true });
const jiti = createJiti(import.meta.url);
const { paletteCommands } = await jiti.import("../src/renderer/features/commandPalette/paletteCommands.ts");
const { rankCommands } = await jiti.import("../src/renderer/features/commandPalette/rankCommands.ts");
const { nextCommandId } = await jiti.import("../src/renderer/features/commandPalette/nextCommandId.ts");

const context = {
  mode: "sessions", hasSessions: true, hasSession: true, supportsFork: true,
  pinned: false, unread: false, zenMode: false, wordWrap: false,
  filesReady: true, hasFile: true, textFile: true,
};
const commandsFor = (patch = {}) => paletteCommands({ ...context, ...patch });
const byId = (commands, id) => commands.find((command) => command.id === id);

test("only the current mode's commands are offered, with global commands in both modes", () => {
  const sessions = commandsFor();
  const files = commandsFor({ mode: "files" });
  for (const id of ["settings", "crons", "reminders", "zen", "switch-mode", "sessions-folder", "focus-prompt"]) {
    assert.ok(byId(sessions, id));
    assert.ok(byId(files, id));
  }
  assert.ok(byId(sessions, "new-session"));
  assert.equal(byId(files, "new-session"), undefined);
  assert.ok(byId(files, "go-to-file"));
  assert.equal(byId(sessions, "go-to-file"), undefined);
  assert.ok(byId(files, "find-in-files"));
  assert.equal(byId(sessions, "find-in-files"), undefined);
  assert.equal(byId(files, "find-in-files").shortcut, "⇧⌘F");
  for (const commands of [sessions, files]) {
    assert.equal(new Set(commands.map(({ id }) => id)).size, commands.length);
  }
});

test("an empty app still supports settings, new sessions, and searching saved history", () => {
  const commands = commandsFor({ hasSession: false, hasSessions: false });
  for (const id of ["settings", "new-session", "find-history", "crons", "reminders", "select-sessions"]) {
    assert.equal(byId(commands, id).disabled, undefined);
  }
  for (const id of ["pin-session", "fork-session", "rename-session", "close-session", "focus-prompt", "find", "switch-mode", "select-files", "select-diff"]) {
    assert.ok(byId(commands, id).disabled);
  }
  assert.ok(byId(commandsFor({ supportsFork: false }), "fork-session").disabled);
});

test("file actions distinguish no file, a non-text file, and pending explorer restoration", () => {
  const noFile = commandsFor({ mode: "files", hasFile: false, textFile: false });
  for (const id of ["save-file", "save-file-as", "find", "close-file"]) assert.ok(byId(noFile, id).disabled);
  for (const id of ["new-file", "open-file", "go-to-file", "find-in-files"]) assert.equal(byId(noFile, id).disabled, undefined);
  const image = commandsFor({ mode: "files", textFile: false });
  assert.equal(byId(image, "close-file").disabled, undefined);
  assert.ok(byId(image, "save-file").disabled);
  const restoring = commandsFor({ mode: "files", filesReady: false });
  for (const id of ["new-file", "open-file", "go-to-file", "find-in-files"]) assert.ok(byId(restoring, id).disabled);
});

test("toggle names and shortcut hints reflect the current state", () => {
  const initial = commandsFor();
  const changed = commandsFor({ pinned: true, unread: true, zenMode: true });
  assert.equal(byId(initial, "pin-session").label, "Pin Session");
  assert.equal(byId(changed, "pin-session").label, "Unpin Session");
  assert.equal(byId(changed, "pin-session").shortcut, "⌃⌘P");
  assert.equal(byId(initial, "unread-session").label, "Mark Session as Unread");
  assert.equal(byId(changed, "unread-session").label, "Mark Session as Read");
  assert.equal(byId(initial, "zen").label, "Enable Zen Mode");
  assert.equal(byId(changed, "zen").label, "Disable Zen Mode");
  assert.equal(byId(commandsFor({ mode: "files", wordWrap: true }), "word-wrap").label, "Disable Word Wrap");
  for (const [id, key] of [["select-sessions", "S"], ["select-files", "E"], ["select-diff", "D"]]) {
    assert.equal(byId(initial, id).shortcut, `⇧⌘${key}`);
  }
  for (const id of ["switch-mode", "diff"]) assert.equal(byId(initial, id).shortcut, undefined);
});

test("palette actions dispatch the existing command events without simulating keystrokes", () => {
  const events = new EventTarget();
  globalThis.window = events;
  const expected = {
    settings: "open-settings", crons: "open-crons", reminders: "open-reminders", "switch-mode": "toggle-explorer",
    "select-sessions": "select-sessions", "select-files": "select-files", "select-diff": "select-diff",
    "focus-prompt": "focus-prompt", "new-session": "new-session", "fork-session": "fork-session",
    "rename-session": "rename-session", "pin-session": "toggle-pin", "unread-session": "mark-unread",
    "close-session": "close-session", "filter-sessions": "focus-filter", find: "find", "find-history": "find-sessions",
    "new-file": "new-file", "open-file": "open-file", "go-to-file": "go-to-file", "save-file": "save-file",
    "save-file-as": "save-file-as", "close-file": "close-file", "word-wrap": "toggle-word-wrap",
    "find-in-files": "find-in-files",
  };
  for (const command of [...commandsFor(), ...commandsFor({ mode: "files" })]) {
    if (!expected[command.id]) continue;
    let calls = 0;
    const event = `birdsong:${expected[command.id]}`;
    const listener = () => calls++;
    events.addEventListener(event, listener);
    command.run();
    events.removeEventListener(event, listener);
    assert.equal(calls, 1, command.id);
  }
});

test("fuzzy search matches names and aliases, preferring visible names with correct highlights", () => {
  const commands = commandsFor();
  assert.deepEqual(rankCommands(commands, "  ").map(({ command }) => command), commands);
  assert.equal(rankCommands(commands, "FiNd HiStOrY")[0].command.id, "find-history");
  assert.equal(rankCommands(commands, "preferences")[0].command.id, "settings");
  assert.deepEqual(rankCommands(commands, "preferences")[0].positions, []);
  assert.equal(rankCommands(commands, "zzzzzz").length, 0);
  const [hit] = rankCommands(commands, "pns");
  assert.equal(hit.command.id, "pin-session");
  assert.equal(hit.positions.map((at) => hit.command.label[at]).join("").toLowerCase(), "pns");
  const competing = [
    { id: "alias", label: "Other", aliases: "save", run() {} },
    { id: "name", label: "Save File", run() {} },
  ];
  assert.equal(rankCommands(competing, "save")[0].command.id, "name");
});

test("keyboard selection skips disabled results, wraps, and handles zero executable matches", () => {
  const results = [
    { command: { id: "disabled", disabled: "Unavailable" } },
    { command: { id: "one" } },
    { command: { id: "two" } },
  ];
  assert.equal(nextCommandId(results, null, 1), "one");
  assert.equal(nextCommandId(results, null, -1), "two");
  assert.equal(nextCommandId(results, "one", -1), "two");
  assert.equal(nextCommandId(results, "two", 1), "one");
  assert.equal(nextCommandId(results.slice(0, 1), null, 1), null);
  assert.equal(nextCommandId([], null, -1), null);
});
