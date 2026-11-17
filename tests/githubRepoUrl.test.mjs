import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { test } from "node:test";
import { createJiti } from "jiti";

const run = promisify(execFile);
const jiti = createJiti(import.meta.url);
const { githubRemoteUrl } = await jiti.import("../src/main/git/githubRemoteUrl.ts");
const { getGithubRepoUrl } = await jiti.import("../src/main/git/getGithubRepoUrl.ts");

async function fixture(t) {
  const root = await fs.mkdtemp(fileURLToPath(new URL(".github-repo-", import.meta.url)));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  // Keep non-repository fixtures from inheriting the enclosing project's remotes.
  const ceiling = process.env.GIT_CEILING_DIRECTORIES;
  process.env.GIT_CEILING_DIRECTORIES = path.dirname(root);
  t.after(() => {
    if (ceiling === undefined) delete process.env.GIT_CEILING_DIRECTORIES;
    else process.env.GIT_CEILING_DIRECTORIES = ceiling;
  });
  const repo = path.join(root, "repo");
  await fs.mkdir(repo);
  const git = async (...args) => (await run("git", args, { cwd: repo })).stdout;
  await git("init", "-b", "main");
  return { root, repo, git };
}

test("GitHub clone URLs become canonical HTTPS links without credentials or .git", () => {
  for (const remote of [
    "https://github.com/owner/repo.git", "https://github.com/owner/repo/",
    "http://github.com/owner/repo", "git@github.com:owner/repo.git",
    "github.com:owner/repo", "ssh://git@github.com/owner/repo.git",
    "ssh://git@SSH.GITHUB.COM:443/owner/repo.git", "git://github.com/owner/repo.git",
    "https://user:secret@github.com/owner/repo.git?token=secret#fragment",
  ]) assert.equal(githubRemoteUrl(remote), "https://github.com/owner/repo");
  assert.equal(githubRemoteUrl("git@github.com:Org-Name/my.repo_name.git"), "https://github.com/Org-Name/my.repo_name");
});

test("non-GitHub, local, malformed and non-repository URLs do not create title links", () => {
  for (const remote of [
    "", "/local/repo", "git@gitlab.com:owner/repo.git", "https://gitlab.com/owner/repo",
    "https://github.com.evil.test/owner/repo", "https://github.com@evil.test/owner/repo",
    "file://github.com/owner/repo", "javascript:alert(1)",
    "https://github.com/owner", "https://github.com/owner/repo/tree/main",
    "https://github.com/owner/...git", "not a URL",
  ]) assert.equal(githubRemoteUrl(remote), null, remote);
});

test("origin wins over other GitHub remotes and push-only URLs are ignored", async (t) => {
  const f = await fixture(t);
  await f.git("remote", "add", "aaa", "https://github.com/upstream/repo.git");
  await f.git("remote", "add", "origin", "git@github.com:owner/fork.git");
  await f.git("remote", "set-url", "--push", "origin", "https://github.com/another/push.git");
  assert.equal(await getGithubRepoUrl(f.repo), "https://github.com/owner/fork");
  await f.git("remote", "set-url", "origin", "https://gitlab.com/owner/repo.git");
  assert.equal(await getGithubRepoUrl(f.repo), "https://github.com/upstream/repo");
  await f.git("remote", "remove", "aaa");
  assert.equal(await getGithubRepoUrl(f.repo), null);
});

test("nested folders and linked worktrees resolve their repository; unavailable folders have no link", async (t) => {
  const f = await fixture(t);
  assert.equal(await getGithubRepoUrl(f.repo), null);
  assert.equal(await getGithubRepoUrl(f.root), null);
  assert.equal(await getGithubRepoUrl(path.join(f.root, "missing")), null);
  await f.git("remote", "add", "origin", "https://github.com/owner/repo.git");
  const nested = path.join(f.repo, "nested");
  await fs.mkdir(nested);
  assert.equal(await getGithubRepoUrl(nested), "https://github.com/owner/repo");
  await f.git("-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "--allow-empty", "-qm", "Initial");
  const worktree = path.join(f.root, "worktree");
  await f.git("worktree", "add", "--detach", worktree);
  assert.equal(await getGithubRepoUrl(worktree), "https://github.com/owner/repo");
});
