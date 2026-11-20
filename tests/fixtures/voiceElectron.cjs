// Electron for VoiceAgent tests: userData from the env, a fake keychain that decrypts any key file to "KEY".
exports.app = {
  getPath(name) {
    if (name !== 'userData' || !process.env.BIRDSONG_TEST_USER_DATA) {
      throw new Error('Test userData directory is not configured');
    }
    return process.env.BIRDSONG_TEST_USER_DATA;
  },
};
exports.safeStorage = {
  isAsyncEncryptionAvailable: async () => true,
  decryptStringAsync: async () => ({ result: 'KEY', shouldReEncrypt: false }),
};
exports.systemPreferences = {
  getMediaAccessStatus: () => 'granted',
};
