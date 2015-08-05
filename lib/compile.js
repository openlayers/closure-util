var cp = require('child_process');
var path = require('path');

var log = require('npmlog');

var util = require('./util');

var fs = require('fs');
var flagfileName;


/**
 * Compile scripts.
 * @param {Object} options An object with optional `compile`, `cwd`, and `jvm`
 *     properties.
 * @param {function(Error, string)} callback Callback called with any
 *     compilation error or the result.
 */
exports = module.exports = function(options, callback) {
  options = options || {};
  if (!options.jvm) {
    options.jvm = ['-server', '-XX:+TieredCompilation'];
  }
  var compilerDir = util.getCompilerPath();
  var args = options.jvm.concat('-jar', path.join(compilerDir, 'compiler.jar'));

  // add all compile options
  if (options.compile) {
    var flagfileOptions = [];
    Object.keys(options.compile).forEach(function(key) {
      var value = options.compile[key];
      if (typeof value === 'boolean') {
        if (value) {
          flagfileOptions.push('--' + key);
        }
      } else {
        var values = Array.isArray(value) ? value : [value];
        for (var i = 0, ii = values.length; i < ii; ++i) {
          flagfileOptions.push('--' + key, values[i]);
        }
      }
    });
    flagfileName = path.join(compilerDir, 'flagfile_' + Date.now());
    fs.writeFileSync(flagfileName, flagfileOptions.join(' '));
    args.push('--flagfile=' + flagfileName);
  }

  var child = cp.spawn('java', args, {cwd: options.cwd || process.cwd()});

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
    if (flagfileName) {
      fs.unlinkSync(flagfileName);
    }
    callback(err, out.join(''));
  });
};
