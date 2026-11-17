import { useEffect, useState, type RefObject } from "react";

export function useNearViewport(ref: RefObject<HTMLElement | null>): boolean {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { setNear(true); observer.disconnect(); }
    }, { root: node.closest(".git-diff-scroll"), rootMargin: "600px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);
  return near;
}
