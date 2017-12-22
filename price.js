const superagent = require('superagent');
const fs = require('fs');
const mailer = require('./mail.js');

const TOTAL_CNY = 20000; //搬砖数额
const depthSize = 10; //市场深度
const margin = 0.1;   //触发提醒利差
const interval = 1000; //轮询间隔
const MAIL_TIMEOUT = 1000 * 60 * 10; //邮件重启时间10分钟
var zbPair = {};
var innerPair = {};

process.on('uncaughtException', function (err) {
    console.log('Caught exception: ' + err);
});

// zb part
const zbUrl = "http://api.zb.com/data/v1/depth";

function zbAveragePrice(group, depth, range) {
    //计算均价
    let amount = 0;
    let average = 0;
    let total = 0;
    for (let i = 0; i < depth && amount < range; i++) {
        amount += group[i][1];
        total += group[i][0] * group[i][1]
        average = total / amount;
    }
    return average;
}

function zbCall() {
    superagent.get(zbUrl)
        .query({
            "market": "bts_qc",
            "size": depthSize
        })
        .end(function (err, res) {
            // 抛错拦截
            if (err) {
                //return throw Error(err);
            }
            // res.text 包含未解析前的响应内容
            //console.log(res.text);
            zbDepth = JSON.parse(res.text);
            let middlePrice = (zbDepth.asks[0][0] + zbDepth.bids[0][0]) / 2;
            let BTS_RANGE = TOTAL_CNY / middlePrice;
            let buyPrice = zbAveragePrice(zbDepth.asks, depthSize, BTS_RANGE);
            let sellPrice = zbAveragePrice(zbDepth.bids, depthSize, BTS_RANGE);
            //console.log("ZB:")
            //console.log("buy:", buyPrice, "sell:", sellPrice);
            zbPair.buyPrice = buyPrice;
            zbPair.sellPrice = sellPrice;

        });
}
//
setInterval(() => {
    zbCall();
}, interval);

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


// bitshares part
const WebSocket = require('ws');
const ws = new WebSocket('wss://openledger.hk/ws');

const CNY = "1.3.113";
const BTS = "1.3.0";
const CNY_PRECISION = 10000;
const BTS_PRECISION = 100000;

var sendMessage = { "id": 1, "method": "call", "params": [0, "get_limit_orders", [BTS, CNY, depthSize]] }

ws.on('open', function open() {
    setInterval(() => {
        ws.send(JSON.stringify(sendMessage))
    }, interval);

});

ws.on('message', function incoming(data) {
    let result = JSON.parse(data).result;
    //计算范围内均价
    let bts_amount_total = 0;
    let cny_amount_total = 0;

    for (let i = 0; i < depthSize & cny_amount_total < TOTAL_CNY; i++) {
        let bts_unit = result[i].sell_price.base.amount;
        let cny_unit = result[i].sell_price.quote.amount;
        let price = (cny_unit / CNY_PRECISION) / (bts_unit / BTS_PRECISION);

        let bts_amount = result[i].for_sale / BTS_PRECISION;
        let cny_amount = bts_amount * price;
        cny_amount_total += cny_amount;
        bts_amount_total += bts_amount;

        //console.log(price, '|', bts_amount, '|', cny_amount, '|', cny_amount_total);
    }
    let buyPrice = cny_amount_total / bts_amount_total;

    bts_amount_total = 0;
    cny_amount_total = 0;
    for (let i = 0; i < depthSize && cny_amount_total < TOTAL_CNY; i++) {
        let bts_unit = result[depthSize + i].sell_price.quote.amount;
        let cny_unit = result[depthSize + i].sell_price.base.amount;
        let price = (cny_unit / CNY_PRECISION) / (bts_unit / BTS_PRECISION);

        let cny_amount = result[depthSize + i].for_sale / CNY_PRECISION;
        let bts_amount = cny_amount / price;
        cny_amount_total += cny_amount;
        bts_amount_total += bts_amount;

        //console.log(cny_amount_total, '|', cny_amount, '|', bts_amount, '|', price);
    }
    let sellPrice = cny_amount_total / bts_amount_total;
    //console.log("Bitshares:");
    //console.log("buy:", buyPrice, "sell:", sellPrice);
    innerPair.buyPrice = buyPrice;
    innerPair.sellPrice = sellPrice;
});

//监控实时价格差
var mailFlag = true; //发送邮件后关闭发邮件功能，等待一段时间后开启。
var sendMail = function (subject) {
    if (mailFlag) {
        mailer.sendMail(subject);
        mailFlag = false;
        setTimeout(() => {
            mailFlag = true;
        }, MAIL_TIMEOUT);
    }
}

setInterval(() => {
    console.log("<=======================================================>");
    if (zbPair.buyPrice && zbPair.sellPrice && innerPair.buyPrice && innerPair.sellPrice) {
        console.log("ZB:");
        console.log("buy:", zbPair.buyPrice.toFixed(4), "sell", zbPair.sellPrice.toFixed(4));
        console.log("Bitshares:");
        console.log("buy:", innerPair.buyPrice.toFixed(4), "sell", innerPair.sellPrice.toFixed(4));
        console.log("<=======================================================>");
        console.log("Mail Flag:",mailFlag);
        console.log("<=======================================================>");

        let zb_to_bts_rate = (innerPair.sellPrice - zbPair.buyPrice) / zbPair.buyPrice;
        console.log("ZB => Bitshares:", zb_to_bts_rate.toFixed(4));
        if (zb_to_bts_rate > margin) {
            let subject = "ZB buy:" + zbPair.buyPrice + ",Bitshares sell:" + innerPair.sellPrice;
            sendMail(subject);
        }

        let bts_to_zb_rate = (zbPair.sellPrice - innerPair.buyPrice) / innerPair.buyPrice;
        console.log("Bitshares => ZB:", bts_to_zb_rate.toFixed(4));
        if (bts_to_zb_rate > margin) {
            let subject = "Bitshares buy:" + innerPair.buyPrice.toFixed(4) + ",ZB sell:" + zbPair.sellPrice.toFixed(4);
            sendMail(subject);
        }
    }
}, interval);

//测试邮件功能
/* setTimeout(() => {
    let subject = "ZB buy:" + zbPair.buyPrice.toFixed(4) + ",Bitshares sell:" + innerPair.sellPrice.toFixed(4);
    sendMail(subject);
    sendMail(subject);
    sendMail(subject);
}, 5000); */