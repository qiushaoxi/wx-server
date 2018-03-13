const superagent = require('superagent');
require('superagent-proxy')(superagent);
const config = require("../config.json");
const swap = require("../lib/pair.js").swap;
const Pair = require("../lib/pair.js").Pair;
const common = require('../tools/common');
const logger = common.getLogger("bit-z");
const cache = require('../tools/cache');


const interval = config.interval;
const depthSize = config.depth;
const url = "https://www.bit-z.com/api_v1/depth";

/**
 * 计算特定深度均价
 * @param {*} group 报价数组
 * @param {*} depth 报价深度
 * @param {*} position 头寸
 */
function averagePrice(group, depth, _position) {

    let amount = 0;
    let average = 0;
    let total = 0;
    for (let i = 0; i < depth && amount < _position; i++) {
        //zb深度数组每一项包含数量和价格，0是价格，1是数量
        amount += 1 * group[i][1];
        total += 1 * group[i][0] * group[i][1]
        average = total / amount;
    }
    return average;
}

//调用 rest api
//currencyPair=BTC_NXT&depth=10
function call(base, quote) {
    let position = config.position[quote];
    //pair 里的base 和 quote 反了
    let symbol = base + '_' + quote;
    let pair = new Pair(quote, base, "bit-z");
    superagent.get(url)
        //.proxy('http://127.0.0.1:1087')//本地测试代理
        .query({
            "coin": symbol
        })
        .end(function (err, res) {
            if (err) {
                logger.error("http error :" + err);
            } else if (res.statusCode != 200) {
                logger.error("status code :" + res.statusCode);
                return;
            } else {
                let depthGroup = common.safelyParseJSON(res.text).data;
                //报价数组ask是反的
                let middlePrice = (1 * depthGroup.asks[depthGroup.asks.length - 1][0] + 1 * depthGroup.bids[0][0]) / 2;
                let tokenPosition = position / middlePrice;
                let buyPrice = averagePrice(depthGroup.asks.reverse(), depthGroup.asks.length, tokenPosition);
                let sellPrice = averagePrice(depthGroup.bids, depthGroup.bids.length, tokenPosition);
                pair.buyPrice = buyPrice;
                pair.sellPrice = sellPrice;
                cache.insertPair(pair);
            }
        });
}

//轮询获取最新价格
setInterval(() => {
    call("GXS", "ETH");
}, interval);
