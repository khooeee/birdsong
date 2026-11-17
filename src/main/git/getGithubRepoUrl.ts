import { githubRemoteUrl } from "./githubRemoteUrl";
import { runGit } from "./runGit";

/** Read local remotes for the session folder, preferring origin. No network access. */
export async function getGithubRepoUrl(cwd: string): Promise<string | null> {
  try {
    const remotes = (await runGit(cwd, ["remote", "-v"])).split(/\r?\n/).flatMap((line) => {
      const match = /^(.+)\t(\S+) \(fetch\)$/.exec(line);
      if (!match) return [];
      const url = githubRemoteUrl(match[2]);
      return url ? [{ name: match[1], url }] : [];
    });
    return (remotes.find((remote) => remote.name === "origin") ?? remotes[0])?.url ?? null;
  } catch {
    return null;
  }
}
