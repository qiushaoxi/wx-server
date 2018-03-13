const config = require('../config.json');
const log4js = require('log4js');
var logger = log4js.getLogger('price-notify');
logger.level = config.loggerLevel;

const getLogger = function (name) {
    let _logger = logger;
    if (name) {
        _logger = log4js.getLogger(name);
        _logger.level = config.loggerLevel;
    }
    return _logger;
}

function safelyParseJSON(json) {
    // This function cannot be optimised, it's best to
    // keep it small!
    let parsed

    try {
        parsed = JSON.parse(json)
    } catch (e) {
        // Oh well, but whatever...
        logger.error(e);
    }

    return parsed // Could be undefined!
}


module.exports = { safelyParseJSON, getLogger };