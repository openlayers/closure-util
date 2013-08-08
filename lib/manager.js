

/**
 * Script manager.
 * @constructor
 */
var Manager = exports.Manager = function Manager() {

  /**
   * Cache of managed scripts.
   * @type {Object.<string, Script}
   * @private
   */
  this.scripts_ = {};


  /**
   * Cache of the sorted dependencies.
   * @type {Array}
   * @private
   */
  this.dependencies_ = null;

};


/**
 * Add a script to the manager.
 * @param {Script} script Script to add.
 */
Manager.prototype.addScript = function(script) {
  var name = script.name;
  if (this.scripts_.hasOwnProperty(name)) {
    throw new Error('Script with same name already added: ' + name);
  }
  this.scripts_[name] = script;
  this.dependencies_ = null;
};


/**
 * Remove a script from the manager.
 * @param {Script} script Script to remove.
 */
Manager.prototype.removeScript = function(script) {
  var name = script.name;
  if (this.scripts_.hasOwnProperty(name)) {
    throw new Error('Script not being managed: ' + name);
  }
  delete this.scripts_[name];
  this.dependencies_ = null;
};


/**
 * Update a script already being manged.
 * @param {Script} script Script to update.
 */
Manager.prototype.updateScript = function(script) {
  var name = script.name;
  if (this.scripts_.hasOwnProperty(name)) {
    throw new Error('Script not being managed: ' + name);
  }
  this.scripts_[name] = script;
  this.dependencies_ = null;
};


/**
 * Get a list of scripts sorted in dependency order.
 * @return {Array.<script>} List of scripts.
 */
Manager.prototype.getDependencies = function() {
  if (!this.dependencies_) {
    var scripts = this.scripts_;
    var providesLookup = {};
    Object.keys(scripts).forEach(function(name) {
      var script = scripts[name];
      script.provides.forEach(function(provide) {
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
        dependencies.push(script);
      }
    };

    Object.keys(scripts).forEach(function(name) {
      visit(scripts[name]);
    });
    this.dependencies_ = dependencies;
  }
  return this.dependencies_;
};
