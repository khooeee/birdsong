import { getAppSettingsCache, patchAppSettings, subscribeAppSettings } from "../settings/appSettingsCache";

/** One saved wrap preference for every file, including tabs that are currently hidden. */
export const wordWrapPreference = {
  getSnapshot(): boolean {
    return getAppSettingsCache().editorWordWrap;
  },

  subscribe: subscribeAppSettings,

  toggle(): void {
    void patchAppSettings({ editorWordWrap: !wordWrapPreference.getSnapshot() }).catch(console.error);
  },
};
