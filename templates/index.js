(function(global) {
  global.CLOSURE_DEFINES = {
    'goog.ENABLE_DEBUG_LOADER': false
  };
  global.CLOSURE_NO_DEPS = true;

  var paths = {{{ paths }}};
  for (var i = 0, ii = paths.length; i < ii; ++i) {
    document.write(
        '<script type="text/javascript" src="' + paths[i] + '"></script>');
  }
}(this));
