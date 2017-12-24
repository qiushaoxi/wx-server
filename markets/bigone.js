const superagent = require('superagent');
const config = require("../config.json");
const Pair = require("../lib/pair.js").Pair;

const interval = config.interval;
const position = config.position;
const url = "https://api.big.one/markets/BTS-BNC/book";

var bigOnePair = new Pair("BitCNY", "BTS", "bigOne");

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

function call() {
    superagent.get(url)
        .end(function (err, res) {
            // 抛错拦截
            if (err) {
                //return throw Error(err);
            }
            // res.text 包含未解析前的响应内容
            //console.log(res.text);
            let depthGroup = JSON.parse(res.text).data;
            let depthSize = depthGroup.asks.length;
            let middlePrice = (1 * depthGroup.asks[0].price + 1 * depthGroup.bids[0].price) / 2;
            let btsPosition = position / middlePrice;
            let buyPrice = averagePrice(depthGroup.asks, depthSize, btsPosition);
            let sellPrice = averagePrice(depthGroup.bids, depthSize, btsPosition);
            bigOnePair.buyPrice = buyPrice;
            bigOnePair.sellPrice = sellPrice;

        });
}

//轮询获取最新价格
setInterval(() => {
    call();
}, interval);

exports.bigOnePair = bigOnePair;