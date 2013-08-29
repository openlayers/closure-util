var compile = require('closurecompiler').compile;


/**
 * Compile scripts.
 * @param {Array.<string>} files Paths to all scripts.
 * @param {Object} options Compiler options (same as compiler.jar options minus
 *     the '--' prefix).
 * @param {function(Error, string)} callback Callback called with any
 *     compilation error or the result.
 */
exports = module.exports = function(files, options, callback) {
  compile(files, options, callback);
};
