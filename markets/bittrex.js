const config = require("../config.json");
const swap = require("../lib/pair.js").swap;
const Pair = require("../lib/pair.js").Pair;
const common = require('../tools/common');
const logger = common.getLogger("bittrex");
const cache = require('../tools/cache');


const interval = config.interval;
const depthSize = config.depth;
const url = "https://bittrex.com/api/v1.1/public/getorderbook";

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
        amount += 1 * group[i].Quantity;
        total += 1 * group[i].Rate * group[i].Quantity
        average = total / amount;
    }
    return average;
}

//调用 rest api
function call(base, quote) {
    let position = config.position[quote];
    //pair 里的base 和 quote 反了
    let symbol = quote + '-' + base;
    let pair = new Pair(quote, base, "bittrex");
    //?market=BTC-LTC&type=both
    common.agentGet(url)
        .query({
            "market": symbol,
            "type": 'both'
        })
        .end(function (err, res) {
            if (err) {
                logger.error("http error :" + err);
            } else if (res.statusCode != 200) {
                logger.error("status code :" + res.statusCode);
                return;
            } else {
                let depth = common.safelyParseJSON(res.text).result;
                let middlePrice = (1 * depth.sell[0].Rate + 1 * depth.buy[0].Rate) / 2;
                let tokenPosition = position / middlePrice;
                let buyPrice = averagePrice(depth.sell, depth.sell.length, tokenPosition);
                let sellPrice = averagePrice(depth.buy, depth.buy.length, tokenPosition);
                pair.buyPrice = buyPrice;
                pair.sellPrice = sellPrice;
                cache.insertPair(pair);
            }
        });
}

//轮询获取最新价格
setInterval(() => {
    call("ETH", "BTC");
    call("NEO", "BTC");
}, interval);
