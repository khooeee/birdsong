import { formatResumeTime } from "../sessions/formatResumeTime";

/** Says when a session stopped by its usage limit continues by itself, with a way to call that off. */
export function ComposerResumeNotice({ resumeAt, onCancel }: { resumeAt: number; onCancel: () => void }) {
  return (
    <div className="composer-resume">
      Continues automatically {formatResumeTime(resumeAt)}
      {" · "}
      <button type="button" className="composer-meta-pick" onClick={onCancel}>Cancel</button>
    </div>
  );
}
