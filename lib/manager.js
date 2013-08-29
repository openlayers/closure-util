var EventEmitter = require('events').EventEmitter;
var path = require('path');
var util = require('util');

var async = require('async');
var Gaze = require('gaze').Gaze;

var globs = require('./util').globs;
var scripts = require('./scripts');



/**
 * Script manager.
 * @param {Object} options Manager options.
 * @constructor
 * @extends {EventEmitter}
 */
var Manager = exports.Manager = function Manager(options) {
  EventEmitter.call(this);
  options = options || {};

  /**
   * Cache of managed scripts.
   * @type {Object.<string, Script}
   * @private
   */
  this.scripts_ = {};

  /**
   * Cache of the sorted dependencies.
   * @type {Object.<string, Array.<Script>>}
   * @private
   */
  this.dependencies_ = {};

  var paths = options.paths || [];
  if (!Array.isArray(paths)) {
    paths = [paths];
  }

  /**
   * Lib glob patterns.
   * @type {Array.<string>}
   * @private
   */
  this.paths_ = paths;

  var self = this;
  process.nextTick(function() {
    self.processPaths_(paths, function(err) {
      if (options.closure) {
        var closure = path.join(__dirname, '..', 'bower_components',
            'closure-library');
        var more = [
          path.join(closure, 'closure', 'goog', '**', '*.js'),
          path.join(closure, 'third_party', 'closure', 'goog', '**', '*.js')
        ];
        self.afterProcessPaths_(err, function() {
          self.processPaths_(more, self.afterProcessPaths_.bind(self), true);
        });
      } else {
        self.afterProcessPaths_(err);
      }
    });
  });

};
util.inherits(Manager, EventEmitter);


/**
 * Called after processing all paths.
 * @param {Error} err Any error during processing.
 * @param {function=} opt_more Additional function to call.
 * @private
 */
Manager.prototype.afterProcessPaths_ = function(err, opt_more) {
  if (err) {
    this.emit('error', err);
  } else {
    if (opt_more) {
      opt_more();
    } else {
      this.startWatch_();
      this.emit('ready');
    }
  }
};


/**
 * Add a script to the manager.
 * @param {Script} script Script to add.
 * @private
 */
Manager.prototype.addScript_ = function(script) {
  var name = script.name;
  if (this.scripts_.hasOwnProperty(name)) {
    throw new Error('Script with same name already added: ' + name);
  }
  this.scripts_[name] = script;
  this.dependencies_ = {};
};


/**
 * Get a list of scripts sorted in dependency order.
 * @param {string=} opt_main Optional main script (must already be included in
 *     currently managed paths).
 * @return {Array.<script>} List of scripts.
 */
Manager.prototype.getDependencies = function(opt_main) {
  var main = opt_main && path.resolve(opt_main);
  var scripts = this.scripts_;
  if (main && !scripts.hasOwnProperty(main)) {
    throw new Error('Main script not currently managed: ' + main);
  }
  var mainKey = main || '*';
  if (!this.dependencies_.hasOwnProperty(mainKey)) {
    var providesLookup = {};
    var base = [];
    Object.keys(scripts).forEach(function(name) {
      var script = scripts[name];
      script.provides.forEach(function(provide) {
        if (provide === 'goog') {
          base.push(name);
        }
        if (providesLookup.hasOwnProperty(provide)) {
          throw new Error('Redundant provide "' + provide + '" ' +
              'in script: ' + name + ' - already provided by ' +
              providesLookup[provide].name);
        }
        providesLookup[provide] = script;
      });
    });

    var visited = {};
    var dependencies = [];

    // check for base
    if (base.length === 0) {
      throw new Error('Could not find base.js');
    } else if (base.length > 1) {
      throw new Error('Found more than one base: ' + base.join(' '));
    }

    // seed dependencies with base.js
    visited[base[0]] = true;
    dependencies[0] = scripts[base[0]];

    var visit = function(script) {
      if (!visited.hasOwnProperty(script.name)) {
        visited[script.name] = true;
        script.requires.forEach(function(require) {
          if (!providesLookup.hasOwnProperty(require)) {
            throw new Error('Unsatisfied dependency "' + require + '" ' +
                'in script: ' + script.name);
          }
          visit(providesLookup[require]);
        });
        // do not include scripts that neither provide nor require
        if (script.provides.length > 0 || script.requires.length > 0) {
          dependencies.push(script);
        }
      }
    };

    if (main) {
      visit(scripts[main]);
    } else {
      Object.keys(scripts).forEach(function(name) {
        var script = scripts[name];
        /**
         * Bundled closure library includes test and debug scripts that should
         * not be included unless explicitly required.
         */
        if (!script.bundled) {
          visit(script);
        }
      });
    }
    this.dependencies_[mainKey] = dependencies;
  }
  return this.dependencies_[mainKey];
};


/**
 * Get a script given the script name (typically path).
 * @param {string} name Script name.
 * @return {Script} The script (or null if not found).
 */
Manager.prototype.getScript = function(name) {
  return this.scripts_[name] || null;
};


/**
 * Add all scripts from provided path patterns.
 * @param {Array.<string>} paths Paths patterns to process.
 * @param {function(Error)} done Callback.
 * @param {boolean=} opt_bundled Bundled library scripts.
 * @private
 */
Manager.prototype.processPaths_ = function(paths, done, opt_bundled) {
  var self = this;
  async.waterfall([
    function(callback) {
      globs(paths, callback);
    },
    function(paths, callback) {
      async.map(paths, scripts.read, callback);
    },
    function(results, callback) {
      var err;
      try {
        results.forEach(function(script) {
          script.bundled = !!opt_bundled;
          self.addScript_(script);
        });
      } catch (e) {
        err = e;
      }
      callback(err);
    }
  ], done);
};


/**
 * Start watching managed file paths.
 * @private
 */
Manager.prototype.startWatch_ = function() {
  var gaze = new Gaze(this.paths_);
  gaze.on('changed', this.handleChanged_.bind(this));
  gaze.on('added', this.handleChanged_.bind(this));
  gaze.on('deleted', this.handleDeleted_.bind(this));
};


/**
 * Handle script addition and modification.
 * @param {string} filepath Script path.
 * @private
 */
Manager.prototype.handleChanged_ = function(filepath) {
  var self = this;
  scripts.read(filepath, function(err, script) {
    if (err) {
      return self.emit('error', err);
    }
    delete self.scripts_[filepath];
    self.addScript_(script);
    self.emit('update');
  });
};


/**
 * Handle script removal.
 * @param {string} filepath Script path.
 * @private
 */
Manager.prototype.handleDeleted_ = function(filepath) {
  delete this.scripts_[filepath];
  this.dependencies_ = {};
  this.emit('update');
};
