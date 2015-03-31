var async = require('async');
var fse = require('fs-extra');
var log = require('npmlog');

var configfile = require('./configfile');
var closure = require('./index');
var config = require('./config');


/**
 * Configurable log level.
 * @type {string}
 */
log.level = config.get('log_level');


/**
 * Read the build configuration file.
 * @param {string} configFile Config file.
 * @param {function(Error, Object)} callback Called with the build
 *    configuration object or any error.
 */
function _readConfig(configFile, callback) {
  log.info('closure-util', 'Reading build config');
  configfile.readConfig(configFile, callback);
}


/**
 * Get the list of sources sorted in dependency order.
 * @param {Object} config Build configuration object.
 * @param {function(Error, Array.<string>)} callback Called with a
 *     list of paths or any error.
 */
function _getDependencies(config, callback) {
  log.info('closure-util', 'Getting Closure dependencies');
  var options = {
    lib: config.lib || config.src,
    cwd: config.cwd || process.cwd()
  };
  closure.getDependencies(options, function(err, paths) {
    if (err) {
      callback(err);
      return;
    }
    callback(null, config, paths);
  });
}


/**
 * Run the compiler.
 * @param {Object} config Build configuration object.
 * @param {Array.<string>} paths List of paths to source files.
 * @param {function(Error, string)} callback Called with the compiled output
 *     or any error.
 */
function _compile(config, paths, callback) {
  log.info('closure-util', 'Compiling ' + paths.length + ' sources');
  var options = {
    compile: config.compile,
    cwd: config.cwd || process.cwd(),
    jvm: config.jvm
  };
  options.compile.js = paths.concat(config.compile.js || []);
  closure.compile(options, callback);
}


/**
 * Write the compiled code to the output file.
 * @param {string} outputFile The output file.
 * @param {string} code The code to write to the output file.
 * @param {function(Error)} callback Called with the error if any.
 */
function _writeOutput(outputFile, code, callback) {
  log.info('closure-util', 'Writing compiled code to ' + outputFile);
  fse.outputFile(outputFile, code, callback);
}


/**
 * This module's main function. This function reads the build config
 * file, compliles the JavaScript code, and writes the compiled code
 * to the output file.
 * @param {string} configFile Config file path.
 * @param {string} ouputFile Output file path.
 * @param {function(Error)} callback Called when the compilation is
 *     finished or when any error occured.
 */
module.exports = function(configFile, outputFile, callback) {
  async.waterfall([
    _readConfig.bind(null, configFile),
    _getDependencies,
    _compile,
    _writeOutput.bind(null, outputFile)
  ], function(err) {
    if (err) {
      callback(err);
    } else {
      callback(null);
    }
  });
};
