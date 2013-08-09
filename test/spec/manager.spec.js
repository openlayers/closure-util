var path = require('path');

var async = require('async');

var scripts = require('../../lib/scripts');
var Manager = require('../../lib/manager').Manager;
var helper = require('../helper');

var assert = helper.assert;
var fixtures = path.join(__dirname, '..', 'fixtures');

describe('manager', function() {

  describe('Manager', function() {

    describe('constructor', function() {
      it('creates a Manager instance', function() {
        var manager = new Manager();

        assert.instanceOf(manager, Manager);
      });
    });

    describe('#getDependencies()', function() {

      it('sorts', function(done) {
        var manager = new Manager({
          patterns: path.join(fixtures, 'dependencies', '**/*.js')
        });
        manager.on('error', done);
        manager.on('ready', function() {
          var dependencies = manager.getDependencies();
          var names = dependencies.map(function(s) {
            return path.basename(s.name);
          });
          assert.deepEqual(names, ['food.js', 'fruit.js', 'banana.js']);
          done();
        });
      });

    });

  });
});
