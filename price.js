const superagent = require('superagent');
const config = require('./config.json');
const mail = require('./tools/mail');
//markets
const zbMarket = require('./markets/zb');
const btsMarket = require('./markets/bts');
const aexMarket = require('./markets/aex');
const bigOneMarket = require('./markets/bigone');
var zbPair = zbMarket.zbPair;
var innerPair = btsMarket.innerPair;
var aexPair = aexMarket.aexPair;
var bigOnePair = bigOneMarket.bigOnePair;

var pairs = [zbPair, innerPair, aexPair, bigOnePair];
var text = '';//微信文字

const interval = config.interval;
const alarmMargin = config.margin;

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

    //输出文字
    let Content = "BTS 各市场价格\n";
    Content += "==========\n";
    for (let i = 0; i < pairs.length; i++) {
        if (pairs[i].buyPrice && pairs[i].sellPrice) {
            Content += pairs[i].market + ":\nbuy : " + pairs[i].buyPrice.toFixed(4) + " sell: " + pairs[i].sellPrice.toFixed(4) + '\n';
        }
    }
    Content += "==========\n";
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
            Content += (src.market + " => " + des.market + " : " + (margin*100).toFixed(2)+'%');
            Content += '\n';
            if (margin > alarmMargin) {
                let subject = src.market + " buy: " + src.buyPrice + " , " + des.market + " sell: " + des.sellPrice;
                mail.sendMail(subject);
            }
        }
        Content += '----------\n';
    }

    text = Content;
    console.log(text);

}, interval);

exports.pairs = pairs;
exports.text = text;