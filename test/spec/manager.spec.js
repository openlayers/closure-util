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
          lib: path.join(fixtures, 'dependencies', '**/*.js')
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
          lib: path.join(fixtures, 'dependencies-main', '+(lib|goog)/**/*.js'),
          main: path.join(fixtures, 'dependencies-main', 'main-*.js')
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
          lib: path.join(fixtures, 'dependencies-main', '+(lib|goog)/**/*.js'),
          main: path.join(fixtures, 'dependencies-main', 'main-*.js')
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

      it('does not provide main scripts if not requested', function(done) {
        var manager = new Manager({
          lib: path.join(fixtures, 'dependencies-main', '+(lib|goog)/**/*.js'),
          main: path.join(fixtures, 'dependencies-main', 'main-*.js')
        });
        manager.on('error', done);
        manager.on('ready', function() {
          var dependencies = manager.getDependencies();
          var names = dependencies.map(function(s) {
            return path.basename(s.name);
          });
          assert.deepEqual(names.slice(0, 3),
              ['base.js', 'fuel.js', 'vehicle.js']);
          assert.include(names, 'boat.js');
          assert.include(names, 'car.js');
          assert.include(names, 'truck.js');
          assert.notInclude(names, 'main-boat.js');
          assert.notInclude(names, 'main-car.js');
          done();
        });
      });

      it('ignores files without requires or provides', function(done) {
        var manager = new Manager({
          lib: path.join(fixtures, 'dependencies-extra', '**/*.js')
        });
        manager.on('error', done);
        manager.on('ready', function() {
          var dependencies = manager.getDependencies();
          var names = dependencies.map(function(s) {
            return path.basename(s.name);
          });
          assert.deepEqual(names,
              ['base.js', 'parent.js', 'child.js']);
          done();
        });
      });

    });

  });
});
