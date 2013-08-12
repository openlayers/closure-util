# Closure Util

Utilities for working with Closure Library projects.

## Plans

### Debug Server

**Status:** groundwork laid

The debug server provides a script loader that loads library files (your application and Closure Library) in dependency order.  The server can be configured to watch for changes to library files, triggering a reload to pages using the script loader.  The server can also be configured to serve other static assets and can be used as middleware in an existing application or as a standalone server.

### Replacement for `depswriter.py`

**Status:** groundwork laid

The package can be used in other Node applications to write `deps.js` files.  A standalone utility provides the same functionality.

## Currently

See the [tests](test/spec) for details about what works.  Currently, the package exports a `Manager` for working with scripts and resolving dependencies.

```js
var Manager = require('closure-util').Manager;

var manager = new Manager({
  paths: ['path/to/one/lib/**/*.js', 'path/to/another/lib/**/*.js', 'main.js'],
});
manager.on('ready', function() {
  var dependencies = manager.getDependencies('main.js');
  // now you've got a list of scripts in dependency order
});
```

## Development

Setup:

    npm install

Run tests:

    npm test

Run tests continuously during development:

    npm start

[![Current Status](https://secure.travis-ci.org/tschaub/closure-util.png?branch=master)](https://travis-ci.org/tschaub/closure-util)
