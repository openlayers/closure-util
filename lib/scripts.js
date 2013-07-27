var esprima = require('esprima');
var fs = require('q-io/fs');
var Q = require('q');

var like = require('./util').like;



/**
 * Script constructor.
 * @param {Object} config Script properties.
 * @constructor
 */
var Script = exports.Script = function Script(config) {

  /**
   * Script name.
   * @type {string}
   */
  this.name = config.name;

  /**
   * Script source.
   * @type {string}
   */
  this.source = config.source;

  /**
   * AST
   * @type {Object}
   * @private
   */
  this.ast_ = esprima.parse(this.source);

  /**
   * Provides array.
   * @type {Array.<string>}
   * @private
   */
  this.provides_ = null;

  /**
   * Requires array.
   * @type {Array.<string>}
   * @private
   */
  this.requires_ = null;

};


/**
 * Get provides.
 * @return {Array.<string>} List of arguments to goog.provide calls.
 * @private
 */
Script.prototype.getProvides_ = function() {
  return this.ast_.body.reduce(function(provides, statement) {
    var test = {
      type: 'ExpressionStatement',
      expression: {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          computed: false,
          object: {
            type: 'Identifier',
            name: 'goog'
          },
          property: {
            type: 'Identifier',
            name: 'provide'
          }
        },
        arguments: [{type: 'Literal', value: '*'}]
      }
    };
    if (like(statement, test)) {
      provides.push(statement.expression.arguments[0].value);
    }
    return provides;
  }, []);
};


Object.defineProperty(Script.prototype, 'provides', {
  enumerable: true,
  get: function() {
    if (!this.provides_) {
      this.provides_ = this.getProvides_();
    }
    return this.provides_;
  }
});


/**
 * Get requires.
 * @return {Array.<string>} List of arguments to goog.require calls.
 * @private
 */
Script.prototype.getRequires_ = function() {
  return this.ast_.body.reduce(function(requires, statement) {
    var test = {
      type: 'ExpressionStatement',
      expression: {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          computed: false,
          object: {
            type: 'Identifier',
            name: 'goog'
          },
          property: {
            type: 'Identifier',
            name: 'require'
          }
        },
        arguments: [{type: 'Literal', value: '*'}]
      }
    };
    if (like(statement, test)) {
      requires.push(statement.expression.arguments[0].value);
    }
    return requires;
  }, []);
};


Object.defineProperty(Script.prototype, 'requires', {
  enumerable: true,
  get: function() {
    if (!this.requires_) {
      this.requires_ = this.getRequires_();
    }
    return this.requires_;
  }
});


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
