const config = require("../config.json");
const swap = require("../lib/pair.js").swap;
const Pair = require("../lib/pair.js").Pair;
const common = require('../tools/common');
const logger = common.getLogger("binance");
const cache = require('../tools/cache');


const interval = config.interval;
const depthSize = config.depth;
//const position = config.position.BTC;
const url = "https://api.binance.com/api/v1/depth";

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
        //深度数组每一项包含数量和价格，0是价格，1是数量
        amount += 1 * group[i][1];
        total += 1 * group[i][0] * group[i][1]
        average = total / amount;
    }
    return average;
}

//调用 rest api
//currencyPair=BTC_NXT&depth=10
function call(base, quote) {
    //fix 修复额度量问题
    let position = config.position[quote];
    //pair 里的base 和 quote 反了
    let symbol = base + quote;
    let pair = new Pair(quote, base, "binance");
    common.agentGet(url)
        .query({
            "symbol": symbol,
            "limit": depthSize
        })
        .end(function (err, res) {
            if (err) {
                logger.error("http error :" + err);
            } else if (res.statusCode != 200) {
                logger.error("status code :" + res.statusCode);
                return;
            } else {
                let depth = JSON.parse(res.text);
                let middlePrice = (1 * depth.asks[0][0] + 1 * depth.bids[0][0]) / 2;
                let tokenPosition = position / middlePrice;
                let buyPrice = averagePrice(depth.asks, depthSize, tokenPosition);
                let sellPrice = averagePrice(depth.bids, depthSize, tokenPosition);
                pair.buyPrice = buyPrice;
                pair.sellPrice = sellPrice;
                cache.insertPair(pair);
                //反转价格对
                if (base == "BTS") {
                    cache.insertPair(swap(pair));
                }
            }
        });
}

//轮询获取最新价格
setInterval(() => {
    call("BTS", "BTC");
    call("BTS", "ETH");
    call("EOS", "ETH");
    call("NEO", "ETH");
    call("LTC", "BTC");
    call("XRP", "ETH");
    call("GXS", "ETH");
    call("QTUM", "ETH");
    call("YOYO", "ETH");
    call("DASH", "ETH");
}, interval);
