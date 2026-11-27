import { LineIcon } from "../icons/LineIcon";

/** House mark for the Home row. */
export function HouseIcon() {
  return (
    <LineIcon className="rail-home-icon">
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 9.8V20h12V9.8" />
    </LineIcon>
  );
}
