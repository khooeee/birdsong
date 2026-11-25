import { powerMonitor, powerSaveBlocker } from "electron";

/** While on, stops the computer idle-sleeping on power; the display still sleeps, and so does a closed lid. */
export class KeepAwake {
  private on = false;
  private watching = false;
  private blocker: number | null = null;

  /** Call once the app is ready. */
  set(on: boolean): void {
    this.on = on;
    if (on) this.watchPower();
    this.update();
  }

  private watchPower(): void {
    if (this.watching) return;
    this.watching = true;
    powerMonitor.on("on-ac", () => this.update());
    powerMonitor.on("on-battery", () => this.update());
  }

  private update(): void {
    const block = this.on && !powerMonitor.isOnBatteryPower();
    if (block && this.blocker === null) {
      this.blocker = powerSaveBlocker.start("prevent-app-suspension");
    } else if (!block && this.blocker !== null) {
      powerSaveBlocker.stop(this.blocker);
      this.blocker = null;
    }
  }
}
