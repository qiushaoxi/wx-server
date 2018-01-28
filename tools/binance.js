const crypto = require('crypto');
const superagent = require('superagent');
const config = require('../config.json');
const common = require('./common');
const logger = common.getLogger('binance-api');
const authConfig = require('../configs/auth.json');

const secret = authConfig.binance.secret;
const apiKey = authConfig.binance.apiKey;

String.prototype.addParams = function (name, value) {
    return this + "&" + name + "=" + value;
}

const getSignedQueryString = function (queryString) {
    let hmac = crypto.createHmac('sha256', secret);
    hmac.update(queryString);
    let signature = hmac.digest('hex');
    return queryString + '&signature=' + signature;
}

const binanceGetBalance = function (token) {
    return new Promise((resolve, reject) => {
        if (!token) {
            reject("not token input");
        }
        let raw = 'timestamp=' + Date.now();
        logger.info(raw);

        let params = getSignedQueryString(raw);
        logger.info(params)

        superagent
            .get('https://api.binance.com/api/v3/account?' + params)
            .set('X-MBX-APIKEY', apiKey)
            .set('accept', 'json')
            .end((err, res) => {
                let balances;
                try {
                    balances = JSON.parse(res.text).balances;
                    //console.info(balances)
                    for (let i in balances) {
                        if (balances[i].asset == token) {
                            resolve(1 * balances[i].free);
                        }
                    }
                    resolve(0);
                } catch (err) {
                    logger.error(res.text);
                    reject(err);
                }
            });
    });
}

const binanceGetOrder = function (symbol, orderId) {
    return new Promise((resolve, reject) => {
        if (!symbol || !orderId) {
            reject("input error");
        }
        let raw = ("symbol=" + symbol)
            .addParams('orderId', orderId)
            .addParams('timestamp', Date.now());

        logger.info(raw);

        let params = getSignedQueryString(raw);
        logger.info(params)

        superagent
            .get('https://api.binance.com/api/v3/order?' + params)
            .set('X-MBX-APIKEY', apiKey)
            .set('accept', 'json')
            .end((err, res) => {
                let result;
                try {
                    result = JSON.parse(res.text);
                    resolve(result);
                } catch (err) {
                    logger.error(res.text);
                    reject(err);
                }
            });
    });
}

/**
 * binanceOrder("BTSETH","SELL",100)
 * @param {string} symbol 
 * @param {string} direction 
 * @param {number} quantity 
 */
const binanceOrder = function (symbol, direction, quantity) {
    return new Promise((resolve, reject) => {
        let raw = ("symbol=" + symbol)
            .addParams('side', direction)
            .addParams('type', 'MARKET')
            .addParams('quantity', quantity)
            .addParams('newOrderRespType', 'FULL')
            .addParams('timestamp', Date.now());
        logger.info(raw);

        let params = getSignedQueryString(raw);
        logger.info(params)

        superagent
            .post('https://api.binance.com/api/v3/order?' + params)
            .set('X-MBX-APIKEY', apiKey)
            .set('accept', 'json')
            .end((err, res) => {
                // Calling the end function will send the request
                //"status":"FILLED"
                try {
                    let result = JSON.parse(res.text);
                    if (result.status == "FILLED") {
                        resolve(result)
                    } else {
                        reject(result);
                    }
                } catch (err) {
                    reject(err);
                }

            });
    });
}




/* binanceOrder("BTSETH", "SELL", 1)
    .then((res) => {
        let resultAmount = 0;
        let fills = res.fills;
        for (let i in fills) {
            resultAmount += fills[i].qty * fills[i].price;
        }
        console.log(resultAmount);
    })
 */
module.exports = { binanceOrder, binanceGetBalance, binanceGetOrder }

/* binanceGetBalance("BTS")
    .then((result) => {
        logger.info(result);
    }).catch((err) => {
        logger.error(err);
    }); */

/* binanceSell(0)
    .then((result) => {
        logger.info("OK", result);
    }).catch((err) => {
        logger.error(err);
    }); */