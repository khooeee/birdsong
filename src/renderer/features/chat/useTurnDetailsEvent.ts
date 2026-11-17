import { useEffect } from "react";

type OpenRightRail = (turnId: string, focusEventId?: string) => void;

/** Toggle the right rail for `birdsong:turn-details` events (sent from main via preload). */
export function useTurnDetailsEvent(toggleRightRail: OpenRightRail): void {
  useEffect(() => {
    const onTurnDetails = (event: Event) => {
      const detail = (event as CustomEvent<{ turnId: string; eventId: string }>).detail;
      if (!detail?.turnId || !detail.eventId) return;
      toggleRightRail(detail.turnId, detail.eventId);
    };
    window.addEventListener("birdsong:turn-details", onTurnDetails);
    return () => window.removeEventListener("birdsong:turn-details", onTurnDetails);
  }, [toggleRightRail]);
}
