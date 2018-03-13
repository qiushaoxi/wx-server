const gate = require("../lib/gateio");
const config = require("../config.json");
const Pair = require("../lib/pair.js").Pair;
const swap = require("../lib/pair.js").swap;
const common = require('../tools/common');
const logger = common.getLogger("gateio");
const cache = require('../tools/cache');

const interval = config.interval;
const position = config.position.BTC;

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
        //深度数组每一项包含数量和价格，0是价格，1是数量
        amount += 1 * group[i][1];
        total += 1 * group[i][0] * group[i][1]
        average = total / amount;
    }
    return average;
}

// 指定市场深度
const call = function (base, quote) {
    return new Promise((resolve, reject) => {
        //pair 里的base 和 quote 反了
        let symbol = base + '_' + quote;
        let pair = new Pair(quote, base, "gateio");

        gate.orderBook(symbol, function (res) {
            //console.log(res);
            let depthGroup = {};
            try {
                depthGroup = JSON.parse(res);
            } catch (err) {
                reject(err);
                logger.error(err, res);
            }
            if (depthGroup.result) {
                //报价数组ask是反的
                let middlePrice = (1 * depthGroup.asks[depthGroup.asks.length - 1][0] + 1 * depthGroup.bids[0][0]) / 2;
                let tokenPosition = position / middlePrice;
                let buyPrice = averagePrice(depthGroup.asks.reverse(), depthGroup.asks.length, tokenPosition);
                let sellPrice = averagePrice(depthGroup.bids, depthGroup.bids.length, tokenPosition);
                pair.buyPrice = buyPrice;
                pair.sellPrice = sellPrice;
                cache.insertPair(pair);
                //反转价格对
                if (base == "BTS") {
                    cache.insertPair(swap(pair));
                }
            }
        });
    })
}
//轮询获取最新价格
setInterval(() => {
    call('BTS', 'BTC');
    call('NEO', 'BTC');
    call('ETH', 'BTC');
    call('EOS', 'BTC');
    call('LTC', "BTC");
    call('GXS', 'BTC');
}, interval);