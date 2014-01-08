var cp = require('child_process');
var path = require('path');

var log = require('npmlog');

var config = require('./config');
var util = require('./util');


/**
 * Compile scripts.
 * @param {Array.<string>} files Paths to all scripts.
 * @param {Object} options Compiler options (same as compiler.jar options minus
 *     the '--' prefix).  For flags (options without a value), provide a
 *     boolean.  For options that appear multiple times, provide an array of
 *     values.
 * @param {function(Error, string)} callback Callback called with any
 *     compilation error or the result.
 */
exports = module.exports = function(files, options, callback) {
  var compilerDir = util.getDependency('compiler', config.get('compiler_url'));
  var args = ['-jar', path.join(compilerDir, 'compiler.jar')];

  // add all options
  if (options) {
    Object.keys(options).forEach(function(key) {
      var value = options[key];
      if (typeof value === 'boolean') {
        if (value) {
          args.push('--' + key);
        }
      } else {
        var values = Array.isArray(value) ? value : [value];
        for (var i = 0, ii = values.length; i < ii; ++i) {
          args.push('--' + key, values[i]);
        }
      }
    });
  }

  // add all files
  files.forEach(function(file) {
    args.push('--js', file);
  });

  log.silly('compile', 'java ' + args.join(' '));
  var child = cp.spawn('java', args);

  var out = [];
  child.stdout.on('data', function(chunk) {
    out.push(chunk.toString());
  });

  child.stderr.on('data', function(chunk) {
    log.error('compile', chunk.toString());
  });

  child.on('close', function(code) {
    var err = null;
    if (code !== 0) {
      err = new Error('Process exited with non-zero status, ' +
          'see log for more detail: ' + code);
    }
    callback(err, out.join(''));
  });
};
