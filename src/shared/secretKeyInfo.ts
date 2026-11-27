/** Whether a secret key (APNs, Inworld) is saved, and whether the OS keychain encrypts it. Never carries the key. */
export type SecretKeyInfo = {
  hasKey: boolean;
  secure: boolean;
};
