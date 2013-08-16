var path = require('path');

var esprima = require('esprima');
var fs = require('graceful-fs');

var like = require('./util').like;


/**
 * Statement identifying goog base (`var goog = goog || {}`).
 * @type {Object}
 */
var googNode = {
  type: 'VariableDeclaration',
  declarations: [
    {
      type: 'VariableDeclarator',
      id: {
        type: 'Identifier',
        name: 'goog'
      },
      init: {
        type: 'LogicalExpression',
        operator: '||',
        left: {
          type: 'Identifier',
          name: 'goog'
        },
        right: {
          type: 'ObjectExpression',
          properties: []
        }
      }
    }
  ],
  kind: 'var'
};


/**
 * Statement with goog.provide call.
 * @type {Object}
 */
var provideNode = {
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


/**
 * Statement with goog.require call.
 * @type {Object}
 */
var requireNode = {
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
  var base = false;
  var provides = this.ast_.body.reduce(function(provides, statement) {
    if (like(statement, provideNode)) {
      provides.push(statement.expression.arguments[0].value);
    } else if (like(statement, googNode)) {
      base = true;
    }
    return provides;
  }, []);
  // special handling for goog base
  if (base) {
    if (provides.length > 0) {
      throw new Error('Base files should not provide namespaces.');
    }
    provides = ['goog'];
  }
  return provides;
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
    if (like(statement, requireNode)) {
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
 * @param {function(Error, Script)} callback Callback.
 */
exports.read = function(filename, callback) {
  filename = path.resolve(filename);
  fs.readFile(filename, function(err, source) {
    if (err) {
      return callback(err);
    }
    callback(null, new Script({name: filename, source: source}));
  });
};
