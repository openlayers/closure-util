var path = require('path');

var download = require('get-down');
var log = require('npmlog');
var fse = require('fs-extra');

var util = require('./lib/util');
var config = require('./lib/config');


/**
 * Configurable log level.
 * @type {string}
 */
log.level = config.get('log_level');


function maybeDownload(alias, url, callback) {
  var dir = util.getDependency(alias, url);

  fse.exists(dir, function(exists) {
    if (exists) {
      log.verbose('install', 'Skipping ' + url);
      log.verbose('install', 'To force download delete ' + dir);
      callback(null, dir);
    } else {
      fse.mkdirp(dir, function(err) {
        if (err) {
          return callback(err);
        }
        log.info('install', 'Downloading ' + url);
        var dl = download(url, {dest: dir, extract: true});

        dl.on('progress', function(state) {
          if (state.retry) {
            var delay = Math.round(state.timeout / 1000) + 's';
            log.info('install', 'Download failed, retrying again in ' + delay);
          } else {
            var progress = Math.floor(state.received / 1024) + 'K';
            if (state.percent) {
              progress = state.percent + '% (' + progress + ')';
            }
            log.info('install', 'Received ' + progress);
          }
        });

        dl.once('end', function(dest) {
          log.info('install', 'Download complete: ' + dest);
          callback(null, dest);
        });

        dl.on('error', function(err) {
          fse.remove(dir, function(rimrafErr) {
            if (rimrafErr) {
              log.error('install', rimrafErr);
            }
            callback(err);
          });
        });
      });
    }
  });

}

maybeDownload('compiler', config.get('compiler_url'), function(err, dir) {
  if (err) {
    log.error('install', err.message);
    return process.exit(1);
  }
});
