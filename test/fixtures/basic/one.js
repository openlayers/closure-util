ol.provide('basic.one');

ol.require('ol.asserts');
ol.require('ol.array');

var basic = {one: {}};


/**
 * Constructor.
 * @param {Array.<number>} things Things.
 * @constructor
 */
basic.one.Class = function(things) {

  /**
   * @type {Array.<number>}
   * @private
   */
  this.things_ = things;

};


/**
 * Do something for each thing.
 * @param {function()} fn Function to be called with each thing.
 */
basic.one.Class.prototype.forEach = function(fn) {
  ol.asserts.assert(!this.things_);
  ol.array.forEach(this.things_, fn);
};
