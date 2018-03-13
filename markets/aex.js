const superagent = require('superagent');
const config = require("../config.json");
const Pair = require("../lib/pair.js").Pair;
const common = require('../tools/common');
const logger = common.getLogger("aex");
const cache = require('../tools/cache');


const interval = config.interval;
const position = config.position.BitCNY;
const url = "https://api.aex.com/depth.php";

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
        amount += group[i][1];
        total += group[i][0] * group[i][1]
        average = total / amount;
    }
    return average;
}

function call(base, target, symbol) {
    let aexPair = new Pair("BitCNY", symbol, "AEX");
    superagent.get(url)
        .query({
            "mk_type": base,
            "c": target
        })
        .end(function (err, res) {
            if (err) {
                logger.error("http error :" + err);
            } else if (res.statusCode != 200) {
                logger.error("status code :" + res.statusCode);
                return;
            } else {
                let depthGroup = JSON.parse(res.text);
                let depthSize = depthGroup.asks.length;
                let middlePrice = (depthGroup.asks[0][0] + depthGroup.bids[0][0]) / 2;
                let btsPosition = position / middlePrice;
                let buyPrice = averagePrice(depthGroup.asks, depthSize, btsPosition);
                let sellPrice = averagePrice(depthGroup.bids, depthSize, btsPosition);
                aexPair.buyPrice = buyPrice;
                aexPair.sellPrice = sellPrice;

                cache.insertPair(aexPair);
            }
        });
}

//轮询获取最新价格
setInterval(() => {
    call("bitcny", "bts", "BTS");
    call("bitcny", "eth", "ETH");
    call("bitcny", "ltc", "LTC");
    call("bitcny", "xrp", "XRP");
    call("bitcny", "btc", "BTC");
    call("bitcny", "dash", "DASH");
}, interval);
