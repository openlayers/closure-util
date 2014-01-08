# Closure Util

Utilities for working with Closure Library projects.

## Currently

See the [tests](test/spec) for details about what works.  Currently, the package exports a `Manager` for resolving script dependencies and a `Server` for providing a development server.

Create a manager for dealing with script dependencies.

```js
var Manager = require('closure-util').Manager;

var manager = new Manager({
  paths: ['path/to/one/lib/**/*.js', 'path/to/another/lib/**/*.js', 'main.js']
});
manager.on('ready', function() {
  var dependencies = manager.getDependencies('main.js');
  // now you've got a list of scripts in dependency order
});
```

Create a development server providing a script loader and static assets.

```js
var Manager = require('closure-util').Manager;
var Server = require('closure-util').Server;

var manager = new Manager({
  closure: true,
  paths: [
    'path/to/app/src/**/*.js',
    'path/to/app/examples/*.js'
  ]
});
manager.on('error', function(e) {throw e});
manager.on('ready', function() {
  var server = new Server({
    manager: manager,
    root: 'path/to/app', // static resources will be served from here
    loaderPath: '/examples/lib.js' // the script loader will be provided here
    // this assumes the main script can be derived from the query string like:
    // <script src='lib.js?main=example-1.js'></script>
    // this can be customized by providing a getMain method that accepts a
    // request object and returns the path to the main script
  });
  server.listen(3000);
});
```

## Configuration

The `closure-util` package downloads the Closure Compiler and Closure Library when installed.  To use a different version of these resources, you can provide some basic configuration options before running `npm install`.  Your configuration options can come from a number of different sources.  The most straightforward way is to include a `closure-util.json` file in your project.  You can also provide configuration options via environemnt variables.  Environment variables have the `closure_` prefix in front of the options described below (e.g. `closure_log_level` to specify the `log_level` option).

Available configuration options (see `default-config.json` for default values):

 * `compiler_url` - URL for the compiler zip archive (e.g. `http://dl.google.com/closure-compiler/compiler-latest.zip`).
 * `library_url` - URL for the Closure Library zip archive (an archive for revision of the library can be downloaded by looking for the "Download zip" link in the [source browser](https://code.google.com/p/closure-library/source/browse/)).
 * `log_level` - Logging level.  Allowed values are `silly`, `verbose`, `info`, `warn`, and `error` (default is `info`).

Environment variables are given precedence over `closure-util.json` values.  For example, the following would set the logging level for the install regardless of the default or anything found in `closure-util.json`:

```
closure_log_level=verbose npm install
```

## Development

Setup:

    npm install

Run tests:

    npm test

Run tests continuously during development:

    npm start

[![Current Status](https://secure.travis-ci.org/openlayers/closure-util.png?branch=master)](https://travis-ci.org/openlayers/closure-util)
