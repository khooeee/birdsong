import { formatResumeTime } from "./formatResumeTime";
import "./sessionResumeIndicator.css";

/** Clock shown while this session is waiting to continue after a quota reset. */
export function SessionResumeIndicator({ resumeAt }: { resumeAt: number }) {
  const label = `Resumes automatically ${formatResumeTime(resumeAt)} after quota resets`;
  return (
    <span className="rail-resume" role="status" aria-label={label} data-tooltip={label} data-tooltip-side="right">
      <svg
        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    </span>
  );
}
