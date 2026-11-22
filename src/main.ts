import { app, BrowserWindow, dialog } from "electron";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { applyAppIcon } from "./main/lifecycle/applyAppIcon";
import { installAboutPanel } from "./main/lifecycle/installAboutPanel";
import { installExternalLinks } from "./main/lifecycle/installExternalLinks";
import { installNavigationGuard } from "./main/lifecycle/installNavigationGuard";
import { installPermissionGuard } from "./main/lifecycle/installPermissionGuard";
import { installImageProtocol } from "./main/images/installImageProtocol";
import { SessionManager } from "./main/sessions/SessionManager";
import { installQuitHandler } from "./main/lifecycle/installQuitHandler";
import { confirmQuit } from "./main/lifecycle/confirmQuit";
import { installSingleInstanceLock } from "./main/lifecycle/installSingleInstanceLock";
import { installSessionLinks } from "./main/lifecycle/installSessionLinks";
import { installStdioGuards } from "./main/lifecycle/installStdioGuards";
import { ControlServer } from "./main/control/ControlServer";
import { CronScheduler } from "./main/crons/CronScheduler";
import { runCron } from "./main/crons/runCron";
import { ReminderScheduler } from "./main/reminders/ReminderScheduler";
import { fireReminder } from "./main/reminders/fireReminder";
import { registerIpc } from "./main/registerIpc";
import { registerFileIpc } from "./main/files/registerFileIpc";
import type { SessionFileWatcher } from "./main/files/SessionFileWatcher";
import { confirmRendererUnsaved } from "./main/files/confirmRendererUnsaved";
import { buildAppMenu } from "./main/appMenu/buildAppMenu";
import { refreshSessionMenuItems } from "./main/appMenu/refreshSessionMenuItems";
import type { AppMenuOptions } from "./main/appMenu/AppMenuOptions";
import { VoiceAgent } from "./main/voice/VoiceAgent";
import { registerVoiceIpc } from "./main/voice/registerVoiceIpc";
import { shellEnv } from "./main/shellEnv/shellEnv";
import { errorMessage } from "./shared/errorMessage";
import { INITIAL_THEME_ARG } from "./shared/initialThemeArg";

installStdioGuards((error) => {
  if (app.isReady()) {
    dialog.showErrorBox(
      "A JavaScript error occurred in the main process",
      error.stack ?? String(error),
    );
  }
});

app.setName("Birdsong");
const userData = path.join(app.getPath("appData"), "Birdsong");
mkdirSync(userData, { recursive: true });
app.setPath("userData", userData);
installImageProtocol();

const sessions = new SessionManager();
let mainWindow: BrowserWindow | null = null;
const crons = new CronScheduler((job, at) => {
  if (!mainWindow) return;
  void runCron(sessions, job, at).catch((error) => {
    console.warn(`[crons] "${job.cron}" in ${job.cwd} failed:`, errorMessage(error));
  });
});
let fileWatcher: SessionFileWatcher | null = null;
const voice = new VoiceAgent({
  sessions,
  getWindow: () => mainWindow,
});
const control = new ControlServer(sessions, voice);
sessions.setObserver(voice.observer);
const reminders = new ReminderScheduler((reminder) =>
  fireReminder(reminder, { sessions, voice, getWindow: () => mainWindow }),
);

const railMode = () => sessions.getSettings().railMode;
const hasSessions = () => {
  const { pinned, unpinned } = sessions.list();
  return pinned.length + unpinned.length > 0;
};

function refreshMenus() {
  refreshSessionMenuItems(railMode(), hasSessions(), sessions.getSettings().editorWordWrap);
}

sessions.subscribe((channel) => {
  if (channel === "sessions:changed") refreshMenus();
});

const createWindow = async () => {
  await sessions.init();
  refreshMenus();
  const { theme } = sessions.getSettings();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: "Birdsong",
    // Matches --bg-1, so the window is already themed before the page paints.
    backgroundColor: theme === "light" ? "#ffffff" : "#12161a",
    icon: applyAppIcon(),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      additionalArguments: [`${INITIAL_THEME_ARG}${theme}`],
      contextIsolation: true,
      autoplayPolicy: "no-user-gesture-required",
      // Voice keeps talking and hearing while the window is hidden.
      backgroundThrottling: false,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  installExternalLinks(mainWindow.webContents);
  installNavigationGuard(mainWindow.webContents);
  installPermissionGuard(mainWindow.webContents.session);
  sessions.setWindow(mainWindow);

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
};

if (installSingleInstanceLock(() => mainWindow)) {
  installSessionLinks(sessions, () => mainWindow);
  // Agents start from the user's shell environment; read it while the window loads.
  void shellEnv.get();
  app.on("ready", () => {
    applyAppIcon();
    installAboutPanel();
    registerIpc({
      sessions,
      control,
      voice,
      getMainWindow: () => mainWindow,
      refreshMenus,
    });
    registerVoiceIpc(voice);
    fileWatcher = registerFileIpc(sessions);
    const menuOptions: AppMenuOptions = {
      getMainWindow: () => mainWindow,
      getRailMode: railMode,
      getHasSessions: hasSessions,
      getEditorWordWrap: () => sessions.getSettings().editorWordWrap,
    };
    buildAppMenu(menuOptions);
    void createWindow().then(() => {
      crons.start();
      reminders.start();
      void control.apply(sessions.getSettings());
    });
  });

  app.on("window-all-closed", () => app.quit());

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });

  installQuitHandler(
    async () =>
      (await confirmRendererUnsaved(mainWindow)) &&
      confirmQuit(mainWindow, sessions.runningChatCount()),
    async () => {
      voice.stop();
      fileWatcher?.dispose();
      crons.stop();
      reminders.stop();
      await sessions.disposeAll();
      await control.stop();
    },
  );
}
