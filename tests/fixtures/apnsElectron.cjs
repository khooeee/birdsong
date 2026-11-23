// Electron for apnsKeyStore tests: userData from the env, safeStorage as a base64 round-trip.
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
  getSelectedStorageBackend: () => 'keychain',
  encryptStringAsync: async (value) => Buffer.from(String(value), 'utf8'),
  decryptStringAsync: async (buffer) => ({ result: buffer.toString('utf8'), shouldReEncrypt: false }),
};
