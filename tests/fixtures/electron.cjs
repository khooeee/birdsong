exports.app = {
  getPath(name) {
    if (name !== 'userData' || !process.env.BIRDSONG_TEST_USER_DATA) {
      throw new Error('Test userData directory is not configured');
    }
    return process.env.BIRDSONG_TEST_USER_DATA;
  },
};
