const superagent = require('superagent');
const config = require('./config.json');
const mail = require('./tools/mail');
const zbMarket = require('./markets/zb');
const btsMarket = require('./markets/bts');
const aexMarket = require('./markets/aex');

const interval = config.interval;
const alarmMargin = config.margin;
var zbPair = zbMarket.zbPair;
var innerPair = btsMarket.innerPair;
var aexPair = aexMarket.aexPair;
var pairs = [zbPair, innerPair, aexPair];

process.on('uncaughtException', function (err) {
    console.log('Caught exception: ' + err);
});

function getMargin(src, des) {
    let margin = (des.sellPrice - src.buyPrice) / src.buyPrice;
    return margin.toFixed(4);
}

setInterval(() => {
    console.log("<=======================================================>");
    console.log("Mail Flag:", mail.flag);
    //显示各市场价格
    for (let i = 0; i < pairs.length; i++) {
        pair = pairs[i];
        if (pair.buyPrice && pair.sellPrice) {
            console.log(pair.market);
            console.log("buy:", pair.buyPrice.toFixed(4), "sell", pair.sellPrice.toFixed(4));
        }
    }
    console.log("<------------------------------------------------->");
    //计算各市场差价
    for (let i = 0; i < pairs.length; i++) {
        let src = pairs[i];
        if (!src.buyPrice || !src.sellPrice) {
            continue;
        }
        for (let j = 0; j < pairs.length; j++) {
            let des = pairs[j];
            if (!des.buyPrice || !des.sellPrice) {
                continue;
            }
            if (i == j) {
                continue;
            }
            let margin = getMargin(src, des);
            console.log(src.market + " => " + des.market + " : " + margin);
            if (margin > alarmMargin) {
                let subject = src.market + " buy: " + src.buyPrice + " , " + des.market + " sell: " + des.sellPrice;
                mail.sendMail(subject);
            }
        }
        console.log("<------------------------------------------------->");
    }
}, interval);

exports.pairs = pairs;