const config = require('../config.json');
const log4js = require('log4js');
var logger = log4js.getLogger('price-notify');
logger.level = config.loggerLevel;

const getLogger = function (name) {
    let _logger = logger;
    if (name) {
        _logger.name = name;
    }
    return _logger;
}

exports.getLogger = getLogger;