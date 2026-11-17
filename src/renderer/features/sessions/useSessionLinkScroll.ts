import { useLayoutEffect, useRef } from "react";

/** Consume each link once the target transcript is loaded and visible. */
export function useSessionLinkScroll(
  target: { sessionId: string } | null,
  activeSessionId: string | undefined,
  loaded: boolean,
  visible: boolean,
  pinToBottom: () => void,
): void {
  const handled = useRef<typeof target>(null);
  useLayoutEffect(() => {
    if (!target || target === handled.current || target.sessionId !== activeSessionId || !loaded || !visible) return;
    pinToBottom();
    handled.current = target;
  }, [target, activeSessionId, loaded, visible, pinToBottom]);
}
