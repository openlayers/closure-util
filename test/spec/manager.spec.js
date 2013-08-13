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

      it('sorts lib scripts', function(done) {
        var manager = new Manager({
          paths: path.join(fixtures, 'dependencies', '**/*.js')
        });
        manager.on('error', done);
        manager.on('ready', function() {
          var dependencies = manager.getDependencies();
          var names = dependencies.map(function(s) {
            return path.basename(s.name);
          });
          assert.deepEqual(names,
              ['base.js', 'food.js', 'fruit.js', 'banana.js']);
          done();
        });
      });

      it('provides dependencies for a main script (car)', function(done) {
        var manager = new Manager({
          paths: path.join(fixtures, 'dependencies-main', '**/*.js')
        });
        manager.on('error', done);
        manager.on('ready', function() {
          var dependencies = manager.getDependencies(
              path.join(fixtures, 'dependencies-main', 'main-car.js'));
          var names = dependencies.map(function(s) {
            return path.basename(s.name);
          });
          assert.deepEqual(names,
              ['base.js', 'fuel.js', 'vehicle.js', 'car.js', 'main-car.js']);
          done();
        });
      });

      it('provides dependencies for a main script (boat)', function(done) {
        var manager = new Manager({
          paths: path.join(fixtures, 'dependencies-main', '**/*.js')
        });
        manager.on('error', done);
        manager.on('ready', function() {
          var dependencies = manager.getDependencies(
              path.join(fixtures, 'dependencies-main', 'main-boat.js'));
          var names = dependencies.map(function(s) {
            return path.basename(s.name);
          });
          assert.deepEqual(names,
              ['base.js', 'fuel.js', 'vehicle.js', 'boat.js', 'main-boat.js']);
          done();
        });
      });

    });

  });
});
