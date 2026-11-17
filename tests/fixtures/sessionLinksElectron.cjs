const { EventEmitter } = require("node:events");

exports.app = new EventEmitter();
exports.app.setAsDefaultProtocolClient = (...args) => {
  exports.registration = args;
  return true;
};
exports.handlers = new Map();
exports.ipcMain = { handle: (channel, handler) => exports.handlers.set(channel, handler) };
