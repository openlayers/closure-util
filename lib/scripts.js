var path = require('path');

var acorn = require('acorn');
var fs = require('graceful-fs');

var like = require('./util').like;


/**
 * Statement identifying goog base (`var goog = goog || {}`).
 * @type {Object}
 */
var googNode = {
  type: 'VariableDeclaration',
  start: '*',
  end: '*',
  declarations: [
    {
      type: 'VariableDeclarator',
      start: '*',
      end: '*',
      id: {
        type: 'Identifier',
        start: '*',
        end: '*',
        name: 'goog'
      },
      init: {
        type: 'LogicalExpression',
        start: '*',
        end: '*',
        left: {
          type: 'Identifier',
          start: '*',
          end: '*',
          name: 'goog'
        },
        operator: '||',
        right: {
          type: 'ObjectExpression',
          start: '*',
          end: '*',
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
  start: '*',
  end: '*',
  expression: {
    type: 'CallExpression',
    start: '*',
    end: '*',
    callee: {
      type: 'MemberExpression',
      start: '*',
      end: '*',
      object: {
        type: 'Identifier',
        start: '*',
        end: '*',
        name: 'goog'
      },
      property: {
        type: 'Identifier',
        start: '*',
        end: '*',
        name: 'provide'
      },
      computed: false
    },
    arguments: [
      {
        type: 'Literal',
        start: '*',
        end: '*',
        value: '*',
        raw: '*'
      }
    ]
  }
};


/**
 * Statement with goog.require call.
 * @type {Object}
 */
var requireNode = {
  type: 'ExpressionStatement',
  start: '*',
  end: '*',
  expression: {
    type: 'CallExpression',
    start: '*',
    end: '*',
    callee: {
      type: 'MemberExpression',
      start: '*',
      end: '*',
      object: {
        type: 'Identifier',
        start: '*',
        end: '*',
        name: 'goog'
      },
      property: {
        type: 'Identifier',
        start: '*',
        end: '*',
        name: 'require'
      },
      computed: false
    },
    arguments: [
      {
        type: 'Literal',
        start: '*',
        end: '*',
        value: '*',
        raw: '*'
      }
    ]
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

  var ast;
  try {
    ast = acorn.parse(this.source);
  } catch (err) {
    var loc = err.loc;
    if (loc) {
      var lines = String(this.source).split(/\r\n|[\n\r\u2028\u2029]/);
      var line = lines[loc.line - 1].substring(0, loc.column + 4);
      var message = err.name + ': ' + err.message + '\n\n' +
          this.name + ':' + loc.line + '\n' +
          line + '\n' +
          (new Array(loc.column + 1)).join(' ') + '^';
      err.message = message;
      throw err;
    }
    throw err;
  }

  /**
   * AST
   * @type {Object}
   */
  this._ast = ast;

  /**
   * Provides array.
   * @type {Array.<string>}
   */
  this._provides = null;

  /**
   * Requires array.
   * @type {Array.<string>}
   */
  this._requires = null;

};


/**
 * Get provides.
 * @return {Array.<string>} List of arguments to goog.provide calls.
 */
Script.prototype._getProvides = function() {
  var base = false;
  var provides = this._ast.body.reduce(function(provides, statement) {
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
    if (!this._provides) {
      this._provides = this._getProvides();
    }
    return this._provides;
  }
});


/**
 * Get requires.
 * @return {Array.<string>} List of arguments to goog.require calls.
 */
Script.prototype._getRequires = function() {
  return this._ast.body.reduce(function(requires, statement) {
    if (like(statement, requireNode)) {
      requires.push(statement.expression.arguments[0].value);
    }
    return requires;
  }, []);
};


Object.defineProperty(Script.prototype, 'requires', {
  enumerable: true,
  get: function() {
    if (!this._requires) {
      this._requires = this._getRequires();
    }
    return this._requires;
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
    var script;
    try {
      script = new Script({name: filename, source: source});
    } catch (err2) {
      return callback(err2);
    }
    callback(null, script);
  });
};
