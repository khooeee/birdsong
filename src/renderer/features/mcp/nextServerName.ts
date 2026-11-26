/** "server", else the first free "server-N"; agents treat case and `-`/`_` alike, so this does too. */
export function nextServerName(names: string[]): string {
  const taken = new Set(names.map((name) => name.toLowerCase().replaceAll("-", "_")));
  let name = "server";
  for (let n = 2; taken.has(name.replaceAll("-", "_")); n++) name = `server-${n}`;
  return name;
}
