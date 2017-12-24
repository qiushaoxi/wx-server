const superagent = require('superagent');
const config = require("../config.json");
const Pair = require("../lib/pair.js").Pair;

const interval = config.interval;
const depthSize = config.depth;
const position = config.position;
const zbUrl = "http://api.zb.com/data/v1/depth";
const market = "bts_qc";

var zbPair = new Pair("QC", "BTS", "ZB");

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
function zbCall() {
    superagent.get(zbUrl)
        .query({
            "market": market,
            "size": depthSize
        })
        .end(function (err, res) {
            // 抛错拦截
            if (err) {
                //return throw Error(err);
            }
            // res.text 包含未解析前的响应内容
            //console.log(res.text);
            let zbDepth = JSON.parse(res.text);
            let middlePrice = (zbDepth.asks[0][0] + zbDepth.bids[0][0]) / 2;
            let btsPosition = position / middlePrice;
            let buyPrice = zbAveragePrice(zbDepth.asks, depthSize, btsPosition);
            let sellPrice = zbAveragePrice(zbDepth.bids, depthSize, btsPosition);
            zbPair.buyPrice = buyPrice;
            zbPair.sellPrice = sellPrice;

        });
}

//轮询获取最新价格
setInterval(() => {
    zbCall();
}, interval);

/* setInterval(() => {
    console.log("ZB:")
    console.log("buy:", zbPair.buyPrice, "sell:", zbPair.sellPrice);
}, interval);
 */
//获取用户信息
/* superagent.get("https://trade.zb.com/api/getAccountInfo")
    .query({
        "accesskey": "73002a4c-725d-4e46-aa68-c08b535b023a",
        "method": "getAccountInfo",
        "sign": "请求加密签名串",
        "reqTime": new Date().getMilliseconds
    })
    .end(function (err, res) {
        // 抛错拦截
        if (err) {
            //return throw Error(err);
        }
        console.log(res.text);
    }) */
exports.zbPair = zbPair;