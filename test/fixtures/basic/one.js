// Top line comment.

goog.provide('basic.one');



/**
 * Constructor.
 * @param {Object} config Configuration object.
 * @constructor
 */
basic.one.Class = function(config) {

  /**
   * @type {Object}
   * @private
   */
  this.config_ = config;

};


/**
 * Get config.
 * @return {Object} Configuration object.
 */
basic.one.Class.prototype.getConfig = function() {
  return this.config_;
};
