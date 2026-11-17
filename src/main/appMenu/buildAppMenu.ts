import { Menu, app } from "electron";
import type { AppMenuOptions } from "./AppMenuOptions";
import { fileMenu } from "./fileMenu";
import { refreshSessionMenuItems } from "./refreshSessionMenuItems";
import { sessionMenu } from "./sessionMenu";
import { SESSION_MENU_IDS } from "./sessionMenuIds";
import { commandMenuItem } from "./commandMenuItem";
import otterPrompt from "./otterPrompt.md?raw";

/** Build the application menu; session item state comes from getters. */
export function buildAppMenu(opts: AppMenuOptions): void {
  const win = () => opts.getMainWindow();
  const isMac = process.platform === "darwin";
  const sessionsMode = opts.getRailMode() === "sessions";
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" as const },
              { type: "separator" as const },
              {
                label: "Settings…",
                accelerator: "Cmd+,",
                click: () => {
                  win()?.webContents.send("settings:open");
                },
              },
              { type: "separator" as const },
              { role: "services" as const },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const },
            ],
          },
        ]
      : []),
    sessionMenu(win),
    fileMenu(win),
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        {
          label: "Paste Otter prompt",
          click: () => {
            void win()?.webContents.insertText(otterPrompt);
          },
        },
        { role: "selectAll" },
        { type: "separator" },
        {
          label: "Find",
          accelerator: "CmdOrCtrl+F",
          click: () => {
            win()?.webContents.send("find:open");
          },
        },
        {
          id: SESSION_MENU_IDS.findInHistory,
          label: "Find in History",
          enabled: sessionsMode,
          accelerator: "CmdOrCtrl+Shift+F",
          click: () => {
            win()?.webContents.send("find-sessions:open");
          },
        },
        // macOS has Settings… in the app menu; Linux has no app menu, so it lives here.
        ...(isMac
          ? []
          : [
              { type: "separator" as const },
              {
                label: "Settings…",
                accelerator: "Ctrl+,",
                click: () => {
                  win()?.webContents.send("settings:open");
                },
              },
            ]),
      ],
    },
    {
      label: "View",
      submenu: [
        commandMenuItem(win, "Command Palette…", "CmdOrCtrl+Shift+P", "birdsong:command-palette"),
        commandMenuItem(win, "Select Sessions Mode", "CmdOrCtrl+Shift+S", "birdsong:select-sessions"),
        { ...commandMenuItem(win, "Select Files Mode", "CmdOrCtrl+Shift+E", "birdsong:select-files"),
          id: "select-files-mode", enabled: opts.getHasSessions() },
        { ...commandMenuItem(win, "Select Diff Mode", "CmdOrCtrl+Shift+D", "birdsong:select-diff"),
          id: "select-diff-mode", enabled: opts.getHasSessions() },
        { type: "separator" },
        {
          id: "editor-word-wrap",
          label: "Word Wrap",
          type: "checkbox",
          checked: opts.getEditorWordWrap(),
          accelerator: "Alt+Z",
          click: () => {
            win()?.webContents.send("editor:toggle-word-wrap");
          },
        },
        { type: "separator" },
        { role: "reload", accelerator: "CmdOrCtrl+Shift+R" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      // No close role: it binds Cmd/Ctrl+W, which closes the active session in the renderer.
      submenu: [{ role: "minimize" }],
    },
    ...(isMac
      ? []
      : [
          {
            label: "Help",
            submenu: [{ label: `About ${app.name}`, click: () => app.showAboutPanel() }],
          },
        ]),
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  // The Session and File menus take their state from the mode here rather than in the template.
  refreshSessionMenuItems(opts.getRailMode(), opts.getHasSessions(), opts.getEditorWordWrap());
}
