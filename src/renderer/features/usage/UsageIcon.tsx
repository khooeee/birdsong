import { LineIcon } from "../icons/LineIcon";

/** A gauge: the Usage button in the rail footer. */
export function UsageIcon() {
  return (
    <LineIcon size={18}>
      <path d="M4.5 18a9 9 0 1 1 15 0" />
      <path d="m12 14 4-5" />
      <circle cx="12" cy="14" r="1.25" />
    </LineIcon>
  );
}
