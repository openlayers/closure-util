var path = require('path');

var scripts = require('../../lib/scripts');
var helper = require('../helper');

var assert = helper.assert;
var fixtures = path.join(__dirname, '..', 'fixtures');

describe('scripts', function() {

  describe('Script', function() {

    describe('constructor', function() {
      it('creates a Script instance', function() {
        var s = new scripts.Script({name: 'foo', source: 'bar'});

        assert.instanceOf(s, scripts.Script);
        assert.equal(s.name, 'foo');
        assert.equal(s.source, 'bar');
      });
    });

    describe('#parse()', function() {

      var script;
      before(function(done) {
        scripts.read(path.join(fixtures, 'basic', 'one.js'))
            .then(function(s) {
              script = s;
              done();
            })
            .fail(done);
      });

      it('returns an AST', function(done) {
        script.parse()
            .then(function(ast) {
              assert.equal(ast.type, 'Program');
              assert.lengthOf(ast.body, 3);
              done();
            })
            .fail(done);
      });

      it('resolves to the same AST on multiple calls', function(done) {
        script.parse()
            .then(function(ast) {
              assert.equal(ast.body[0].type, 'ExpressionStatement');

              var provide = ast.body[0].expression;
              assert.equal(provide.type, 'CallExpression');
              assert.equal(provide.callee.type, 'MemberExpression');
              assert.isFalse(provide.callee.computed);
              assert.isObject(provide.callee.object);
              assert.equal(provide.callee.object.type, 'Identifier');
              assert.equal(provide.callee.object.name, 'goog');
              assert.equal(provide.callee.property.type, 'Identifier');
              assert.equal(provide.callee.property.name, 'provide');

              var args = provide.arguments;
              assert.lengthOf(args, 1);
              assert.equal(args[0].type, 'Literal');
              assert.equal(args[0].value, 'basic.one');
              done();
            })
            .fail(done);
      });

    });

  });

  describe('read', function() {

    it('returns a promise that resolves to a script', function(done) {
      scripts.read(path.join(fixtures, 'basic', 'one.js'))
          .then(function(script) {
            assert.instanceOf(script, scripts.Script);
            done();
          })
          .fail(done);
    });

    it('returns a rejected promise for bogus path', function(done) {
      scripts.read('bogus path')
          .then(function(script) {
            done(new Error('Bogus path should not resolve to a script'));
          })
          .fail(function(err) {
            // success
            done();
          });
    });

  });

});
