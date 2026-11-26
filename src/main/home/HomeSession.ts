import * as fs from "node:fs/promises";
import type { Session } from "../../shared/session";
import { getAppSettings } from "../appSettings";
import { createSession } from "../sessions/createSession";
import { openSession } from "../sessions/openSession";
import type { SessionDeps } from "../sessions/SessionDeps";
import { setSessionStatus } from "../sessions/setSessionStatus";
import { softCloseHost } from "../sessions/softCloseHost";
import { softCloseSession } from "../sessions/softCloseSession";

async function directory(cwd: string): Promise<boolean> {
  return !!(await fs.stat(cwd).catch(() => null))?.isDirectory();
}

const HOME_TITLE = "Home";

/**
 * The Home session: one chat pinned above every other session, in the folder and agent from Settings.
 * Replacing it closes the old chat (Find in History still has it) and starts an empty one.
 */
export class HomeSession {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly deps: SessionDeps) {}

  /** The open Home chat, if Home is on. */
  current(): Session | undefined {
    const { state } = this.deps;
    return state.homeId ? state.sessions.get(state.homeId) : undefined;
  }

  /** Match Home to Settings: start it, replace it after a folder or agent change, or close it when Home is off. */
  sync(): Promise<void> {
    return this.serial(async () => {
      const { state } = this.deps;
      const { homeCwd, homeAgent } = getAppSettings();
      const home = this.current();
      if (home ? home.cwd === homeCwd && home.agent === homeAgent : !homeCwd) {
        if (home && homeCwd && home.status !== "running" && !(await directory(homeCwd))) {
          setSessionStatus(state, home.id, "error", `Home folder not found: ${homeCwd}`);
        }
        return;
      }
      await this.replace(false);
    });
  }

  /** A new, empty Home chat in the same folder. */
  startFresh(): Promise<void> {
    return this.serial(() => this.replace(true));
  }

  /** Show Home, starting it first if needed. False when Home is off. */
  open(): Promise<boolean> {
    return this.serial(async () => {
      if (!getAppSettings().homeCwd) return false;
      if (!this.current()) await this.replace(true);
      const home = this.current();
      return home ? openSession(this.deps, home.id) : false;
    });
  }

  /** Close the current Home chat, then start one from Settings; the new one stays on screen if the old one was. */
  private async replace(focus: boolean): Promise<void> {
    const { state, persistence } = this.deps;
    const oldId = state.homeId;
    const onScreen = focus || (oldId !== null && state.activeTabId === oldId);
    state.homeId = null;
    if (oldId && state.sessions.has(oldId)) {
      await softCloseSession(softCloseHost(this.deps), oldId);
      state.emitSessions();
    }
    const { homeCwd, homeAgent } = getAppSettings();
    if (homeCwd) {
      const input = { agent: homeAgent, cwd: homeCwd, title: HOME_TITLE, pin: true };
      const session = await createSession(this.deps, input, onScreen, true);
      if (!(await directory(homeCwd)) && session.status !== "error") {
        setSessionStatus(state, session.id, "error", `Home folder not found: ${homeCwd}`);
      }
    } else {
      void persistence.persist();
    }
  }

  /** One change at a time, so a settings save and ⌘1 can't both start a Home chat. */
  private serial<T>(run: () => Promise<T>): Promise<T> {
    const next = this.queue.then(run, run);
    this.queue = next.catch(() => undefined);
    return next;
  }
}
