/**
 * Previously, the config-chain package was used here.  This failed on Node
 * 0.11 - see https://github.com/dominictarr/config-chain/issues/18.
 *
 * The find and getEnv functions below are adapted from config-chain.  This
 * module doesn't provide equivalent functionality, but it does export a `get`
 * function that works similarly to config-chain's `get` (without the where
 * argument).
 */

var fs = require('fs');
var path = require('path');


function find() {
  var rel = path.join.apply(null, [].slice.call(arguments));

  function _find(start, rel) {
    var file = path.join(start, rel);
    try {
      fs.statSync(file);
    } catch (err) {
      if (path.dirname(start) !== start) {
        file = _find(path.dirname(start), rel);
      } else {
        // at the root
        file = undefined;
      }
    }
    return file;
  }
  return _find(__dirname, rel);
}

function getEnv(prefix, env) {
  env = env || process.env;
  var obj = {};
  var length = prefix.length;
  for (var key in env) {
    if (key.indexOf(prefix) === 0) {
      obj[key.substring(length)] = env[key];
    }
  }
  return obj;
}

// assign defaults
var config = require(path.join(__dirname, '..', 'default-config.json'));

// check for project settings
var configPath = find('closure-util.json');
if (configPath) {
  var projectConfig = require(configPath);
  for (var key in projectConfig) {
    config[key] = projectConfig[key];
  }
}

// check for evn vars
var env = getEnv('closure_');
for (var key in env) {
  config[key] = env[key];
}


/**
 * Get a config property.
 * @param {string} key The property name.
 * @return {*} The property value.
 */
exports.get = function(key) {
  return config[key];
};
