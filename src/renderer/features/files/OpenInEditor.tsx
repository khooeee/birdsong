import { useState } from "react";
import { openInEditor } from "../explorer/openInEditor";
import { ipcErrorMessage } from "../../../shared/ipcErrorMessage";

/** Opens the file in File Explorer mode's editor; parent owns the surrounding `.file-open` row. */
export function OpenInEditor({ sessionId, filePath }: { sessionId: string; cwd: string; filePath: string }) {
  const [error, setError] = useState<string | null>(null);
  const open = async () => {
    setError(null);
    try {
      await openInEditor(sessionId, filePath);
    } catch (err) {
      setError(ipcErrorMessage(err));
    }
  };
  return (
    <>
      <button type="button" className="file-open-button" data-tooltip={`Open ${filePath} in Editor`} onClick={open}>
        Open in Editor
      </button>
      {error && <span className="file-open-error" role="alert">{error}</span>}
    </>
  );
}
