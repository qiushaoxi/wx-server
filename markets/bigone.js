const superagent = require('superagent');
const config = require("../config.json");
const Pair = require("../lib/pair.js").Pair;
const common = require('../tools/common');
const logger = common.getLogger("bigOne");
const cache = require('../tools/cache');


const interval = config.interval;
const position = config.position.BitCNY;
const btcPosition = config.position.BTC;

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
        amount += 1 * group[i].amount;
        total += 1 * group[i].price * group[i].amount
        average = total / amount;
    }
    return average;
}

function call(market, base, symbol) {
    //BTS-BNC
    let url = "https://api.big.one/markets/" + market + "/book";
    let bigOnePair = new Pair(base, symbol, "bigOne");

    superagent.get(url)
        .end(function (err, res) {
            if (err) {
                logger.error("http error :" + err);
            } else if (res.statusCode != 200) {
                logger.error("status code :" + res.statusCode);
                return;
            } else {
                let depthGroup = common.safelyParseJSON(res.text).data;
                let depthSize = depthGroup.asks.length;
                let middlePrice = (1 * depthGroup.asks[0].price + 1 * depthGroup.bids[0].price) / 2;
                let tokenPosition;
                if (base == "BTC") {
                    tokenPosition = btcPosition / middlePrice;
                } else {
                    tokenPosition = position / middlePrice;
                }
                let buyPrice = averagePrice(depthGroup.asks, depthSize, tokenPosition);
                let sellPrice = averagePrice(depthGroup.bids, depthSize, tokenPosition);
                bigOnePair.buyPrice = buyPrice;
                bigOnePair.sellPrice = sellPrice;

                cache.insertPair(bigOnePair);
            }
        });
}

//轮询获取最新价格
setInterval(() => {
    call("BTS-BNC", "BitCNY", "BTS");
    call("EOS-BNC", "BitCNY", "EOS");
    call("ETH-BNC", "BitCNY", "ETH");
    call("BTC-BNC", "BitCNY", "BTC");
    call("GXS-BNC", "BitCNY", "GXS");
    call("QTUM-BNC", "BitCNY", "QTUM");
    call("NEO-BTC", "BTC", "NEO");
    call("BTM-BTC", "BTC", "BTM");
    call("LTC-BTC","BTC","LTC");
}, interval);