var esprima = require('esprima');
var fs = require('q-io/fs');
var Q = require('q');



/**
 * Script constructor.
 * @param {Object} config Script properties.
 * @constructor
 */
var Script = exports.Script = function Script(config) {
  this.name = config.name;
  this.source = config.source;

  this._ast = null;
  this._parseError = null;
};


/**
 * Parse the script.  Generates a promise that resolves to the AST.
 * The AST conforms to the Mozilla SpiderMonkey Parser API.
 * https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API
 *
 * @return {Promise} A promise that resolves to the AST.
 */
Script.prototype.parse = function() {
  var deferred = Q.defer();

  // check for cached values
  if (this._ast) {
    deferred.resolve(this._ast);
  } else if (this._parseError) {
    deferred.reject(this._parseError);
  } else {
    // parse
    try {
      this._ast = esprima.parse(this.source);
      deferred.resolve(this._ast);
    } catch (err) {
      this._parseError = err;
      deferred.reject(err);
    }
  }
  return deferred.promise;
};


/**
 * Read a script from a file.
 * @param {string} filename Path to file.
 * @return {Promise} A promise that resolves to a Script.
 */
exports.read = function(filename) {
  return fs.read(filename).then(function(source) {
    return new Script({name: filename, source: source});
  });
};
