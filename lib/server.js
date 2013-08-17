var fs = require('fs');
var http = require('http');
var path = require('path');
var url = require('url');

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
   * Cached handlebars template.
   * @type {Template}
   * @private
   */
  this.template_ = null;
};


/**
 * Compile the template and provide it to the callback.
 * @param {function(Error, Template)} callback Callback.
 * @private
 */
Server.prototype.getTemplate_ = function(callback) {
  var template = this.template_;
  var self = this;
  if (template) {
    process.nextTick(function() {
      callback(null, template);
    });
  } else {
    fs.readFile(path.join(__dirname, '..', 'templates', 'index.js'),
        function(err, data) {
          if (err) {
            return callback(err);
          }
          self.template = handlebars.compile(String(data));
          callback(null, self.template);
        });
  }
};


/**
 * Render the template to the response with the provided context.
 * @param {Object} context Data.
 * @param {http.ServerResponse} res Response.
 * @private
 */
Server.prototype.renderTemplate_ = function(context, res) {
  this.getTemplate_(function(err, template) {
    if (err) {
      res.statusCode = 500;
      return res.end('Cannot find index template');
    }
    res.writeHead(200, {
      'Content-Type': 'application/javascript'
    });
    res.end(template(context));
  });
};


/**
 * Determine if an incoming request is for the script loader.  By default,
 * paths starting with '/@' will be handled by the loader.
 * @param {http.IncomingRequest} req Request.
 * @return {boolean} This request should be handled by the loader.
 * @private
 */
Server.prototype.useLoader_ = function(req) {
  return req.url.indexOf(this.loaderPath_) === 0;
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
      if (self.useLoader_(req)) {
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
          var paths = deps.map(function(s) {return self.loaderPath_ + s.name;});
          self.renderTemplate_({paths: JSON.stringify(paths)}, res);
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
        send(req, pathname).root(root).pipe(res);
      }
    } else {
      res.writeHead(302, {});
      res.end('Not allowed');
    }
  });
  server.listen(port, function() {
    log.info('server', 'Server listening: http://localhost:%d', port);
  });
};
