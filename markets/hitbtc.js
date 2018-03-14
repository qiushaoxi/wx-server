const config = require("../config.json");
const swap = require("../lib/pair.js").swap;
const Pair = require("../lib/pair.js").Pair;
const common = require('../tools/common');
const logger = common.getLogger("hitbtc");
const cache = require('../tools/cache');


const interval = config.interval;
const depthSize = config.depth;
const url = "https://api.hitbtc.com/api/2/public/orderbook/";

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
        amount += 1 * group[i].size;
        total += 1 * group[i].price * group[i].size
        average = total / amount;
    }
    return average;
}

//调用 rest api
function call(base, quote) {
    let position = config.position[quote];
    //pair 里的base 和 quote 反了
    let symbol = base + quote;
    let pair = new Pair(quote, base, "hitbtc");
    common.agentGet(url + symbol)
        .query({
            "limit": depthSize
        })
        .end(function (err, res) {
            if (err) {
                logger.error("http error :" + err);
            } else if (res.statusCode != 200) {
                logger.error("status code :" + res.statusCode);
                return;
            } else {
                let depth = common.safelyParseJSON(res.text);
                let middlePrice = (1 * depth.ask[0].price + 1 * depth.bid[0].price) / 2;
                let tokenPosition = position / middlePrice;
                let buyPrice = averagePrice(depth.ask, depthSize, tokenPosition);
                let sellPrice = averagePrice(depth.bid, depthSize, tokenPosition);
                pair.buyPrice = buyPrice;
                pair.sellPrice = sellPrice;
                cache.insertPair(pair);
            }
        });
}

//轮询获取最新价格
setInterval(() => {
    call("EOS", "ETH");
    call("NEO", "ETH");
    call("STEEM", "BTC");
}, interval);
