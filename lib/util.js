var glob = require('glob');

var async = require('async');
var lo = require('lodash');


/**
 * Test whether one object is like another.  In the test object, '*' is used
 * as a wildcard.  This is designed to compare AST nodes and does not work with
 * object values that are Date, RegExp, Number, String, or Boolean instances.
 *
 * @param {Object|Array|number|string} obj The candidate object.
 * @param {Object|Array|number|string} test The template used to test.
 * @return {boolean} The object matches the template.
 */
exports.like = function like(obj, test) {
  var is = false;
  if (test === '*') {
    is = obj !== undefined;
  } else if (Array.isArray(test)) {
    if (Array.isArray(obj) && test.length === obj.length) {
      is = test.every(function(t, i) {
        return like(obj[i], t);
      });
    }
  } else {
    // null, undefined, string, number, boolean
    is = Object.is(obj, test);
    if (!is && typeof test === 'object' && typeof obj === 'object') {
      // other object (excluding Date, RegExp, Number, String, Boolean)
      var testKeys = Object.keys(test);
      if (like(Object.keys(obj), testKeys)) {
        is = testKeys.every(function(key) {
          return like(obj[key], test[key]);
        });
      }
    }
  }
  return is;
};


/**
 * Generate an array of file names given an array of patterns.
 * @param {Array.<string>|string} patterns List of glob patterns or a single
 *     pattern.
 * @param {object} options Options to glob.
 * @param {function(Error, Array.<string>)} callback Callback.
 */
exports.globs = function(patterns, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (!Array.isArray(patterns)) {
    patterns = [patterns];
  }
  async.map(patterns, function(pattern, cb) {
    glob(pattern, options, cb);
  }, function(err, results) {
    callback(err, err ? null : lo.unique(lo.flatten(results)));
  });
};
