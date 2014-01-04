var fs = require('fs');
var path = require('path');

var download = require('download');
var log = require('npmlog');
var rimraf = require('rimraf');

var util = require('./lib/util');
var config = require('./lib/config');


/**
 * Configurable log level.
 * @type {string}
 */
log.level = config.get('log_level');


function maybeDownload(url, callback) {
  var dir = util.getDependency(url);

  fs.exists(dir, function(exists) {
    if (exists) {
      log.verbose('install', 'Skipping ' + url);
      log.verbose('install', 'To force download delete ' + dir);
      callback(null, dir);
    } else {
      log.info('install', 'Downloading ' + url);
      var dl = download(url, dir, {extract: true});

      var length = 0;
      var time = Date.now();
      dl.on('data', function(chunk) {
        var now = Date.now();
        length += chunk.length;
        if (now - time > 5000) {
          log.info('install',
              'Received ' + Math.floor(length / 1024) + 'K bytes');
          time = now;
        }
      });

      dl.once('close', function() {
        log.info('install', 'Download complete: ' + dir);
        callback(null, dir);
      });

      dl.on('error', function(err) {
        rimraf(dir, function(rimrafErr) {
          if (rimrafErr) {
            log.error('install', rimrafErr);
          }
          callback(err);
        });
      });
    }
  });

}

maybeDownload(config.get('compiler_url'), function(err, dir) {
  if (err) {
    log.error('install', err.message);
    return process.exit(1);
  }
});
