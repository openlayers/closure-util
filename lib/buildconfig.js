var fs = require('graceful-fs');
var log = require('npmlog');

var config = require('./config');


/**
 * Configurable log level.
 */
log.level = config.get('log_level');


/**
 * Assert that a provided config object is valid.
 * @param {Object} config Build configuration object.
 */
function assertValidConfig(config) {
  if (!config.lib) {
    config.lib = config.src;
  }
  if (!Array.isArray(config.lib)) {
    throw new Error('Config "lib" must be an array');
  }
  if (typeof config.compile !== 'object') {
    throw new Error('Config "compile" must be an object');
  }
  if (config.jvm && !Array.isArray(config.jvm)) {
    throw new Error('Config "jvm" must be an array');
  }
}


/**
 * Read the build configuration file.
 * @param {string} configPath Path to config file.
 * @param {function(Error, Object)} callback Callback.
 */
exports.readConfig = function(configPath, callback) {
  fs.readFile(configPath, function(err, data) {
    if (err) {
      if (err.code === 'ENOENT') {
        err = new Error('Unable to find config file: ' + configPath);
      }
      callback(err);
      return;
    }
    var config;
    try {
      config = JSON.parse(String(data));
    } catch (err2) {
      callback(new Error('Trouble parsing config as JSON: ' +
          err2.message));
      return;
    }
    try {
      assertValidConfig(config);
    } catch (err3) {
      callback(err3);
      return;
    }
    callback(null, config);
  });
};
