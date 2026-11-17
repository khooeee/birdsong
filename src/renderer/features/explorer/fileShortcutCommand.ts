import { modKey } from "../shortcuts/modKey";

const COMMANDS: Record<string, string> = {
  o: "birdsong:open-file",
  s: "birdsong:save-file",
  f: "birdsong:find-in-file",
  w: "birdsong:close-file",
  p: "birdsong:go-to-file",
  n: "birdsong:new-file",
};

/** Resolve file shortcuts before editor and session handlers receive the key. */
export function fileShortcutCommand(event: KeyboardEvent): string | undefined {
  if (modKey(event, "f", true)) return "birdsong:find-in-files";
  const key = Object.keys(COMMANDS).find((name) => modKey(event, name));
  return key ? COMMANDS[key] : undefined;
}
