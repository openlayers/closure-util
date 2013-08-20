# Closure Util

Utilities for working with Closure Library projects.

## Currently

See the [tests](test/spec) for details about what works.  Currently, the package exports a `Manager` for working with scripts and resolving dependencies.

Create a manager for dealing with script dependencies.

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

Create a development server providing a script loader and static assets.

```js
var Manager = require('closure-util').Manager;
var Server = require('closure-util').Server;

var manager = new Manager({
  paths: [
    'path/to/closure-library/closure/goog/**/*.js',
    'path/to/closure-library/third_party/closure/goog/**/*.js',
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
  server.start(3000);
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
