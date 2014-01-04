var path = require('path');

var cc = require('config-chain');


/**
 * Configuration object.
 * @type {Object}
 */
module.exports = cc(
    cc.env('closure_util_'),
    cc.find('closure-util.json'),
    path.join(__dirname, '..', 'default-config.json'));
