import { formatResumeTime } from "./formatResumeTime";
import "./sessionResumeIndicator.css";
import { LineIcon } from "../icons/LineIcon";

/** Clock shown while this session is waiting to continue after a quota reset. */
export function SessionResumeIndicator({ resumeAt }: { resumeAt: number }) {
  const label = `Resumes automatically ${formatResumeTime(resumeAt)} after quota resets`;
  return (
    <span className="rail-resume" role="status" aria-label={label} data-tooltip={label} data-tooltip-side="right">
      <LineIcon>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </LineIcon>
    </span>
  );
}
