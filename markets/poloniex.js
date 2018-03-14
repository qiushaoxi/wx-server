const superagent = require('superagent');
const config = require("../config.json");
const swap = require("../lib/pair.js").swap;
const Pair = require("../lib/pair.js").Pair;
const common = require('../tools/common');
const logger = common.getLogger("poloniex");
const cache = require('../tools/cache');


const interval = config.interval;
const depthSize = config.depth;
const position = config.position.BTC;
const url = "https://poloniex.com/public";

/**
 * 计算特定深度均价
 * @param {*} group 报价数组
 * @param {*} depth 报价深度
 * @param {*} position 头寸
 */
function averagePrice(group, depth, position) {

    let amount = 0;
    let average = 0;
    let total = 0;
    for (let i = 0; i < depth && amount < position; i++) {
        //zb深度数组每一项包含数量和价格，0是价格，1是数量
        amount += group[i][1];
        total += group[i][0] * group[i][1]
        average = total / amount;
    }
    return average;
}

//调用 rest api
//currencyPair=BTC_NXT&depth=10
function call(market, symbol) {
    let pair = new Pair("BTC", symbol, "poloniex");
    superagent.get(url)
        .query({
            "command": "returnOrderBook",
            "currencyPair": market,
            "depth": depthSize
        })
        .end(function (err, res) {
            if (err) {
                logger.error("http error :" + err);
            } else if (res.statusCode != 200) {
                logger.error("status code :" + res.statusCode);
                return;
            } else {
                let depth = common.safelyParseJSON(res.text);
                let middlePrice = (1 * depth.asks[0][0] + 1 * depth.bids[0][0]) / 2;
                let tokenPosition = position / middlePrice;
                let buyPrice = averagePrice(depth.asks, depthSize, tokenPosition);
                let sellPrice = averagePrice(depth.bids, depthSize, tokenPosition);
                pair.buyPrice = buyPrice;
                pair.sellPrice = sellPrice;
                cache.insertPair(pair);
                //反转价格对
                if (symbol == "BTS") {
                    cache.insertPair(swap(pair));
                }
            }
        });
}

//轮询获取最新价格
setInterval(() => {
    call("BTC_BTS", "BTS");
    call("BTC_ETH", "ETH");
    call("BTC_LTC", "LTC");
    call("BTC_STEEM", "STEEM");
}, interval);
