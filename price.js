const superagent = require('superagent');
const config = require('./config.json');
const mail = require('./tools/mail');
const sms = require('./tools/sms');
const log4js = require('log4js');
const logger = log4js.getLogger('price');
logger.level = config.loggerLevel;

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
    logger.error('Caught exception: ' + err);
});

function getMargin(src, des) {
    let margin = (des.sellPrice - src.buyPrice) / src.buyPrice;
    return margin.toFixed(4);
}

var flag = true; //发送邮件后关闭发邮件功能，等待一段时间后开启。平台 : @var(p1)  与平台 : @var(p2) 差值 : @var(percent) % .
var sendNotification = function (bestMargin, message) {
    if (flag) {
        let subject = (bestMargin.srcMarket + " => " + bestMargin.desMarket + " Margin : " + (bestMargin.margin * 100).toFixed(2) + '%');
        mail.sendMail(subject, message);
        sms.sendSMS(bestMargin.srcMarket, bestMargin.desMarket, bestMargin.margin);
        flag = false;
        setTimeout(() => {
            flag = true;
        }, config.mail_timeout);
    }
}

setInterval(() => {
    logger.info("<=======================================================>");
    logger.info("Notification Flag:", flag);
    //显示各市场价格

    //输出文字
    let hasMargin = false;
    let bestMargin = {
        "margin": 0,
        "srcMarket": "",
        "desMarket": ""
    };
    let tmpText = "BTS 各市场价格\n";
    tmpText += "==========\n";
    for (let i = 0; i < pairs.length; i++) {
        if (pairs[i].buyPrice && pairs[i].sellPrice) {
            tmpText += pairs[i].market + ":\nbuy : " + pairs[i].buyPrice.toFixed(4) + " sell: " + pairs[i].sellPrice.toFixed(4) + '\n';
        }
    }
    tmpText += "==========\n";
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
            if (margin > 0) {
                tmpText += (src.market + " => " + des.market + " : " + (margin * 100).toFixed(2) + '%');
                tmpText += '\n';
            }
            if (margin > alarmMargin) {
                hasMargin = true;
                if (margin > bestMargin.margin) {
                    bestMargin.margin = margin;
                    bestMargin.srcMarket = src.market;
                    bestMargin.desMarket = des.market
                }
            }
        }
        tmpText += '----------\n';
    }

    text = tmpText;
    logger.info(text);

    //如果有显著差价，提醒
    if (hasMargin) {
        sendNotification(bestMargin, text);
    }

}, interval);

exports.pairs = pairs;
exports.getText = function () { return text };