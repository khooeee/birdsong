/** Convert common GitHub clone URLs to a credential-free repository page. */
export function githubRemoteUrl(remote: string): string | null {
  const scp = /^(?:[^@\s/:]+@)?github\.com:([^?#\s]+)$/i.exec(remote.trim());
  try {
    const url = new URL(scp ? `ssh://git@github.com/${scp[1]}` : remote.trim());
    if (!["https:", "http:", "ssh:", "git:"].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase();
    if (host !== "github.com" && !(url.protocol === "ssh:" && host === "ssh.github.com")) return null;
    const path = url.pathname.replace(/\/$/, "").replace(/\.git$/i, "");
    const match = /^\/([a-z\d][a-z\d-]*)\/([a-z\d_.-]+)$/i.exec(path);
    if (!match || match[2] === "." || match[2] === "..") return null;
    return `https://github.com${path}`;
  } catch {
    return null;
  }
}
