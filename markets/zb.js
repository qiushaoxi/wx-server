const superagent = require('superagent');
const config = require("../config.json");
const pair = require("../lib/pair.js");
const Pair = pair.Pair;
const common = require('../tools/common');
const logger = common.getLogger("ZB");

const interval = config.interval;
const depthSize = config.depth;
const position = config.position.BitCNY;
const zbUrl = "http://api.zb.com/data/v1/depth";

/**
 * 计算特定深度均价
 * @param {*} group 报价数组
 * @param {*} depth 报价深度
 * @param {*} position 头寸
 */
function zbAveragePrice(group, depth, position) {

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

//调用 zb rest api
function zbCall(market, symbol) {
    let zbPair = new Pair("QC", symbol, "ZB");
    superagent.get(zbUrl)
        .query({
            "market": market,
            "size": depthSize
        })
        .end(function (err, res) {
            if (err) {
                logger.error("http error :" + err);
            } else if (res.statusCode != 200) {
                logger.error("status code :" + res.statusCode);
                return;
            } else {
                let zbDepth = JSON.parse(res.text);
                let middlePrice = (zbDepth.asks[0][0] + zbDepth.bids[0][0]) / 2;
                let tokenPosition = position / middlePrice;
                let buyPrice = zbAveragePrice(zbDepth.asks, depthSize, tokenPosition);
                let sellPrice = zbAveragePrice(zbDepth.bids, depthSize, tokenPosition);
                zbPair.buyPrice = buyPrice;
                zbPair.sellPrice = sellPrice;
                const mongoUtils = require('../tools/mongo');
                mongoUtils.insertPair(zbPair);
                if(symbol=="BitCNY"){
                    mongoUtils.insertPair(pair.swap(zbPair));
                }
            }
        });
}

//轮询获取最新价格
setInterval(() => {
    zbCall("bts_qc", "BTS");
    zbCall("eos_qc", "EOS");
    zbCall("eth_qc", "ETH");
    zbCall("btc_qc", "BTC");
    zbCall("bitcny_qc", "BitCNY");
}, interval);
