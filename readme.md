# Closure Util

Utilities for working with Closure Library projects.

## API

### <a id="manager">`new Manager(config)`</a>

A script manager parses scripts for dependencies and watches those scripts for changes, updating dependencies as scripts are added, modified, or deleted.  A manager is used in conjunction with a [server](#server) for providing a debug loader during development.

 * **config.lib** - `string|Array.<string>` A list of [path patterns](https://github.com/isaacs/minimatch) for your library scripts (e.g. `'lib/**/*.js'`).  Note that path delimters in these patterns should always be forward slashes (even on Windows).
 * **config.main** - `string|Array.<string>` Patterns for your main script(s).

The manager is an [event emitter](http://nodejs.org/api/events.html#events_class_events_eventemitter) that emits the following events:

 * **ready** - The manager is ready (all scripts parsed and dependencies resolved).
 * **error** - Listeners will be called with an `Error` instance representing what went wrong.

### <a id="server">`new Server(config)`</a>

Create a development server providing a script loader and static assets.

 * **config.manager** - `Manager` A script manager.
 * **config.root** - `string` Path to root directory for scripts and static assets (default is `process.cwd()`).
 * **config.loader** - `string` URL path for script loader.

```js
var closure = require('closure-util');

var manager = new closure.Manager({
  lib: ['path/to/app/src/**/*.js']
  main: 'path/to/app/examples/*.js'
});
manager.on('error', function(e) {throw e});
manager.on('ready', function() {
  var server = new closure.Server({
    manager: manager,
    root: 'path/to/app', // static resources will be served from here
    loader: '/examples/lib.js' // the script loader will be provided here
    // this assumes the main script can be derived from the query string like:
    // <script src='lib.js?main=example-1.js'></script>
    // this can be customized by providing a getMain method that accepts a
    // request object and returns the path to the main script
  });
  server.listen(3000);
});
```

### <a id="getdependencies">`getDependencies(config, callback)`</a>

The `getDependencies` function generates a list of script paths in dependency order.

 * **config** - `Object` A configuration object of the same form as the [manager config](#manager-config).
 * **callback** - `function(Error, Array.<string>)` Called with a list of script paths in dependency order (or a parsing error).

### <a id="compile">`compile(options, [jvm], callback)`</a>

The `compile` function drives the Closure Compiler.

 * **options** - `Object` [Options](compiler-options.txt) for the compiler (without the `--` prefix).  E.g. the `--output_wrapper` option could be specified with `{output_wrapper: '(function(){%output%})();'}`.  For options that can be specified multiple times, provide an array of values (e.g. `{js: ['one.js', 'two.js']}`).  For options that are flags (no value), provide a boolean (e.g. `{use_types_for_optimization: true}`).
 * **jvm** - `Array.<string>` Optional arguments for the JVM.  If this argument is absent (if the function is called with two arguments), `['-server', '-XX:+TieredCompilation']` will be used as JVM arguments.  To use [different arguments](https://code.google.com/p/closure-compiler/wiki/FAQ#What_are_the_recommended_Java_VM_command-line_options?), provide an array.
 * **callback** - `function(Error, string)` Called with the compiler output (or any compilation error).

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
