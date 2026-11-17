import { useMemo } from "react";
import type { GitDiffFile, GitDiffRepository } from "../../../shared/gitDiff";
import { diffFileId } from "./diffFileId";
import { DiffFolderIcon } from "./DiffFolderIcon";

interface Tree {
  directories: Map<string, Tree>;
  files: GitDiffFile[];
}

function Directory({ tree, root, selected, onSelect }: {
  tree: Tree; root: string; selected: string; onSelect: (id: string) => void;
}) {
  return (
    <ul>
      {[...tree.directories].map(([name, child]) => (
        <li key={name}>
          <details open>
            <summary><DiffFolderIcon />{name}</summary>
            <Directory tree={child} root={root} selected={selected} onSelect={onSelect} />
          </details>
        </li>
      ))}
      {tree.files.map((file) => {
        const id = diffFileId(root, file.path);
        return (
          <li key={file.path}>
            <button type="button" className={selected === id ? "selected" : ""} title={file.path}
              aria-current={selected === id ? "true" : undefined} onClick={() => onSelect(id)}>
              <span className={`git-file-status status-${file.status}`}>{file.untracked ? "U" : file.status}</span>
              <span className="git-tree-name">{file.path.split("/").at(-1)}</span>
              <span className="git-tree-count"><b>+{file.additions}</b><em>−{file.deletions}</em></span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function DiffFileTree({ repository, selected, onSelect }: {
  repository: GitDiffRepository; selected: string; onSelect: (id: string) => void;
}) {
  const tree = useMemo(() => {
    const root: Tree = { directories: new Map(), files: [] };
    for (const file of repository.files) {
      let node = root;
      for (const segment of file.path.split("/").slice(0, -1)) {
        if (!node.directories.has(segment)) node.directories.set(segment, { directories: new Map(), files: [] });
        node = node.directories.get(segment)!;
      }
      node.files.push(file);
    }
    return root;
  }, [repository.files]);
  return (
    <div className="git-tree-repository">
      <div className="git-tree-root" title={repository.root}>
        <strong>{repository.root.split("/").at(-1)}</strong><span>{repository.files.length}</span>
      </div>
      <Directory tree={tree} root={repository.root} selected={selected} onSelect={onSelect} />
    </div>
  );
}
