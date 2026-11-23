/** APNs key stored in the app (encrypted), never sent to the renderer. */
export type ApnsKeyInfo = {
  hasKey: boolean;
  secure: boolean;
};
