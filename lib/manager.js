var EventEmitter = require('events').EventEmitter;
var path = require('path');
var util = require('util');

var async = require('async');
var Gaze = require('gaze').Gaze;
var log = require('npmlog');

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
   */
  this._scripts = {};

  /**
   * Cache of the sorted dependencies.
   * @type {Object.<string, Array.<Script>>}
   */
  this._dependencies = {};

  /**
   * Root for lib and main file patterns.
   * @type {string}
   */
  this._cwd = options.cwd || process.cwd();

  var lib = options.lib || [];
  if (!Array.isArray(lib)) {
    lib = [lib];
  }

  /**
   * Lib glob patterns.
   * @type {Array.<string>}
   */
  this._lib = lib;

  var main = options.main || [];
  if (!Array.isArray(main)) {
    main = [main];
  }

  /**
   * Main glob patterns.
   * @type {Array.<string>}
   */
  this._main = main;


  var self = this;
  process.nextTick(function() {
    self._processPaths(lib, function(err) {
      var more = main;
      if (options.closure) {
        var closure = path.join(__dirname, '..', 'bower_components',
            'closure-library');
        more = more.concat([
          path.join(closure, 'closure', 'goog', '**', '*.js'),
          path.join(closure, 'third_party', 'closure', 'goog', '**', '*.js')
        ]);
      }
      self._afterProcessPaths(err, function() {
        self._processPaths(more, self._afterProcessPaths.bind(self));
      });
    }, true);
  });

};
util.inherits(Manager, EventEmitter);


/**
 * Called after processing all paths.
 * @param {Error} err Any error during processing.
 * @param {function=} opt_more Additional function to call.
 */
Manager.prototype._afterProcessPaths = function(err, opt_more) {
  if (err) {
    log.verbose('manager', err);
    this.emit('error', err);
  } else {
    if (opt_more) {
      opt_more();
    } else {
      this._startWatch();
      this.emit('ready');
    }
  }
};


/**
 * Add a script to the manager.
 * @param {Script} script Script to add.
 */
Manager.prototype._addScript = function(script) {
  var name = script.name;
  if (this._scripts.hasOwnProperty(name)) {
    throw new Error('Script with same name already added: ' + name);
  }
  this._scripts[name] = script;
  this._dependencies = {};
};


/**
 * Get a list of scripts sorted in dependency order.
 * @param {string=} opt_main Optional main script (must already be included in
 *     currently managed paths).
 * @return {Array.<script>} List of scripts.
 */
Manager.prototype.getDependencies = function(opt_main) {
  var main = opt_main && path.resolve(opt_main);
  var scripts = this._scripts;
  if (main && !scripts.hasOwnProperty(main)) {
    throw new Error('Main script not currently managed: ' + main);
  }
  var mainKey = main || '*';
  if (!this._dependencies.hasOwnProperty(mainKey)) {
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
         * not be included unless explicitly required.  Any main scripts should
         * not be included unless explicitly required.
         */
        if (script.lib) {
          visit(script);
        }
      });
    }
    this._dependencies[mainKey] = dependencies;
  }
  return this._dependencies[mainKey];
};


/**
 * Get a script given the script name (typically path).
 * @param {string} name Script name.
 * @return {Script} The script (or null if not found).
 */
Manager.prototype.getScript = function(name) {
  return this._scripts[name] || null;
};


/**
 * Add all scripts from provided path patterns.
 * @param {Array.<string>} paths Paths patterns to process.
 * @param {function(Error)} done Callback.
 * @param {boolean=} opt_lib Library scripts.
 */
Manager.prototype._processPaths = function(paths, done, opt_lib) {
  var self = this;
  async.waterfall([
    function(callback) {
      globs(paths, {cwd: self._cwd}, callback);
    },
    function(paths, callback) {
      paths = paths.map(function(relative) {
        return path.resolve(self._cwd, relative);
      });
      async.map(paths, scripts.read, callback);
    },
    function(results, callback) {
      var err;
      try {
        results.forEach(function(script) {
          script.lib = !!opt_lib;
          self._addScript(script);
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
 */
Manager.prototype._startWatch = function() {
  var paths = this._lib.concat(this._main);
  var gaze = new Gaze(paths);
  gaze.on('changed', this._handleChanged.bind(this));
  gaze.on('added', this._handleChanged.bind(this));
  gaze.on('deleted', this._handleDeleted.bind(this));
};


/**
 * Handle script addition and modification.
 * @param {string} filepath Script path.
 */
Manager.prototype._handleChanged = function(filepath) {
  var old = this._scripts[filepath];
  var lib = old.lib;
  var self = this;
  scripts.read(filepath, function(err, script) {
    if (err) {
      log.verbose('manager', err);
      return self.emit('error', err);
    }
    script.lib = lib;
    log.verbose('manager', 'updated ' + filepath);
    delete self._scripts[filepath];
    self._addScript(script);
    self.emit('update');
  });
};


/**
 * Handle script removal.
 * @param {string} filepath Script path.
 */
Manager.prototype._handleDeleted = function(filepath) {
  delete this._scripts[filepath];
  this._dependencies = {};
  log.verbose('manager', 'deleted ' + filepath);
  this.emit('update');
};
