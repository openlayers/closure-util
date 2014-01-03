var crypto = require('crypto');
var fs = require('fs');
var path = require('path');

var cc = require('config-chain');
var download = require('download');
var log = require('npmlog');

var conf = cc(
    cc.env('closure_util_'),
    cc.find('closure-util.json'),
    path.join(__dirname, 'default-config.json'),
    {
      deps: path.join(__dirname, '.deps')
    });


/**
 * Configurable log level.
 * @type {string}
 */
log.level = conf.get('log_level');


function maybeDownload(url, rootDir, prefix, callback) {
  var hash = crypto.createHash('sha1');
  hash.update(url);
  var dir = path.join(rootDir,
      prefix + '-' + hash.digest('hex').substring(0, 7));

  fs.exists(dir, function(exists) {
    if (exists) {
      log.verbose('install', 'Skipping ' + url);
      log.verbose('install', 'To force download delete ' + dir);
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
      });

      dl.on('error', function(err) {
        log.error('install', err);
        // TODO: delete dir
        process.exit(1);
      });
    }
  });

}

maybeDownload(conf.get('compiler_url'), conf.get('deps'), 'compiler',
    function(err, dir) {
      if (err) {
        log.error('install', err.message);
        return process.exit(1);
      }
    });
