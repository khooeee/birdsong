import { railModeStore } from "../explorer/railModeStore";

/** Fork the session; from Files mode this goes back to Sessions so the fork's chat is shown. */
export function forkSession(id: string): void {
  railModeStore.set("sessions");
  void window.birdsong.forkSession(id).catch(console.error);
}
