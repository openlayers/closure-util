var fs = require('fs');
var http = require('http');
var path = require('path');
var url = require('url');

var async = require('async');
var handlebars = require('handlebars');
var log = require('npmlog');
var send = require('send');



/**
 * Server constructor.
 * @param {Object} config Server config.
 * @constructor
 */
var Server = exports.Server = function Server(config) {
  this.manager_ = config.manager;
  this.root_ = config.root || process.cwd();

  this.loaderPath_ = config.loaderPath || '/@';

  // allow override
  if (config.getMain) {
    this.getMain = config.getMain;
  }

  /**
   * Cached handlebars templates.
   * @type {Object.<string, Template>}
   * @private
   */
  this.templates_ = {};
};


/**
 * Compile the template and provide it to the callback.
 * @param {string} name Template name.
 * @param {function(Error, Template)} callback Callback.
 * @private
 */
Server.prototype.getTemplate_ = function(name, callback) {
  var template = this.templates_[name];
  var self = this;
  if (template) {
    process.nextTick(function() {
      callback(null, template);
    });
  } else {
    fs.readFile(path.join(__dirname, '..', 'templates', name),
        function(err, data) {
          if (err) {
            return callback(err);
          }
          var template = handlebars.compile(String(data));
          self.templates_[name] = template;
          callback(null, template);
        });
  }
};


/**
 * Render the template to the response with the provided context.
 * @param {string} name Template name.
 * @param {Object} context Data.
 * @param {http.ServerResponse} res Response.
 * @private
 */
Server.prototype.renderTemplate_ = function(name, context, res) {
  var types = {
    '.js': 'application/javascript; charset=utf-8',
    '.html': 'text/html; charset=utf-8'
  };
  this.getTemplate_(name, function(err, template) {
    if (err) {
      res.statusCode = 500;
      return res.end('Cannot find index template');
    }
    res.writeHead(200, {
      'Content-Type': types[path.extname(name)] || 'text/plain'
    });
    res.end(template(context));
  });
};


/**
 * Determine if an incoming request is for the script loader.  By default,
 * paths starting with '/@' will be handled by the loader.
 * @param {http.IncomingRequest} req Request.
 * @return {boolean|string} This request should be handled by the loader.
 * @private
 */
Server.prototype.useLoader_ = function(req) {
  var match = false;
  if (typeof this.loaderPath_ === 'string') {
    match = req.url.indexOf(this.loaderPath_) === 0 ? this.loaderPath_ : false;
  } else {
    var matches = req.url.match(this.loaderPath_);
    match = matches && matches[0];
  }
  return match;
};


/**
 * Get script path from an incoming request.
 * @param {http.IncomingRequest} req Request.
 * @return {string} Script path.
 * @private
 */
Server.prototype.getPath_ = function(req) {
  return url.parse(req.url).pathname.substring(this.loaderPath_.length);
};


/**
 * Get the path to the main script from an incoming request.  By default, the
 * main path is taken from the 'main' query string parameter.  For requests
 * with a referer, the path is assumed to be relative to the referer.  For
 * requests without a referer, the path is assumed to be relative to the server
 * root.
 * @param {http.IncomingRequest} req Request.
 * @return {string} Path to main script.
 */
Server.prototype.getMain = function(req) {
  var main;
  var query = url.parse(req.url, true).query;
  if (query.main) {
    var from = this.root_;
    var referer = req.headers.referer;
    if (referer) {
      from = path.join(from, path.dirname(url.parse(referer).pathname));
    }
    main = path.resolve(from, query.main);
  }
  return main;
};


/**
 * Get entries representing all items in a directory.
 * @param {string} dir Path to directory.
 * @param {function(error, Array)} callback Callback.
 */
function getEntries(dir, callback) {
  async.waterfall([
    fs.readdir.bind(fs, dir),
    function(items, done) {
      var paths = items.map(function(item) {
        return path.join(dir, item);
      });
      async.map(paths, fs.stat, function(err, stats) {
        if (err) {
          return done(err);
        }
        var entries = items.map(function(item, index) {
          var isDir = stats[index].isDirectory();
          return {
            path: item + (isDir ? '/' : ''),
            name: item,
            dir: isDir
          };
        });
        done(null, entries);
      });
    }
  ], callback);
}


/**
 * Handle errors from static server.
 * @param {http.IncomingRequest} req Request.
 * @param {http.ServerResponse} res Response.
 * @param {Error} err Error.
 * @private
 */
Server.prototype.handleStaticError_ = function(req, res, err) {
  var self = this;
  if (err.status === 404 && req.url.slice(-1) === '/') {
    // directory listing
    var pathname = url.parse(req.url).pathname;
    var dir = path.join(this.root_, pathname);
    if (dir.indexOf(this.root_) !== 0) {
      res.statusCode = 403;
      res.end('Outside root');
    } else {
      getEntries(dir, function(err, entries) {
        if (err) {
          res.statusCode = 500;
          return void res.end(err.message);
        }
        if (pathname !== '/') {
          entries.unshift({
            path: '..',
            name: '..',
            dir: true
          });
        }
        self.renderTemplate_('index.html', {
          path: pathname,
          entries: entries
        }, res);
      });
    }
  } else {
    res.statusCode = err.status || 500;
    res.end(err.message);
  }
};


/**
 * Start the server.
 * @param {number=} opt_port The port (default is 3000).
 */
Server.prototype.start = function(opt_port) {
  var port = opt_port || 3000;
  var manager = this.manager_;
  var root = this.root_;
  var self = this;
  var server = http.createServer(function(req, res) {
    if (req.method === 'GET') {
      var parts = url.parse(req.url, true);
      var pathname = parts.pathname;
      var match = self.useLoader_(req);
      if (match) {
        // managed script
        var name = self.getPath_(req);
        if (!name) {
          // request for loader
          var main = self.getMain(req);
          if (main && !manager.getScript(main)) {
            res.statusCode = 500;
            return res.end('Main script not in manager paths: ' + main);
          }
          var deps = manager.getDependencies(main);
          var paths = deps.map(function(s) {return match + s.name;});
          self.renderTemplate_('load.js', {paths: JSON.stringify(paths)}, res);
        } else {
          var script = manager.getScript(name);
          if (!script) {
            res.writeHead(404, {});
            res.end('Script not being managed: ' + name);
          } else {
            res.writeHead(200, {
              'Content-Type': 'application/javascript',
              'Content-Length': script.source.length
            });
            res.end(script.source);
          }
        }
      } else {
        // assume static
        send(req, pathname)
            .root(root)
            .on('error', self.handleStaticError_.bind(self, req, res))
            .pipe(res);
      }
    } else {
      res.writeHead(405, {});
      res.end('Not allowed');
    }
  });
  server.listen(port, function() {
    log.info('server', 'Server listening: http://localhost:%d', port);
  });
};
