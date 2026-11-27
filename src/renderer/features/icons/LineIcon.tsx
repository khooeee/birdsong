import type { ReactNode, SVGProps } from "react";

type LineIconProps = Omit<SVGProps<SVGSVGElement>, "width" | "height"> & {
  size?: number;
  children: ReactNode;
};

/** 24×24 outline icon frame (round caps, currentColor stroke). Extra props override the defaults. */
export function LineIcon({ size = 14, children, ...svg }: LineIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...svg}>
      {children}
    </svg>
  );
}
