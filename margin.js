const config = require('./config.json');
const mail = require('./tools/mail');
const sms = require('./tools/sms');
const common = require("./tools/common");
const logger = common.getLogger('margin');
const mongoUtils = require('./tools/mongo');

//config
const interval = config.interval;
const alarmMargin = config.margin;

var flag = true;

process.on('uncaughtException', function (err) {
    logger.error('Caught exception: ' + err);
}); 

function getMargin(src, des) {
    let margin = (des.sellPrice - src.buyPrice) / src.buyPrice;
    return margin.toFixed(4);
}

// 时间戳检查，检查价格有效性
const checkTime = function (Timestamp) {
    return !(Date.now() - Timestamp.getTime() > 5000)
    //差5秒则无效
}

//发送邮件后关闭发邮件功能，等待一段时间后开启。平台 : @var(p1)  与平台 : @var(p2) 差值 : @var(percent) % .
const sendNotification = function (bestMargin, message, symbol) {
    if (flag) {
        let subject = ("token:" + symbol + " " + bestMargin.srcMarket + " => " + bestMargin.desMarket + " Margin : " + (bestMargin.margin * 100).toFixed(2) + '%');
        mail.sendMail(subject, message);
        sms.sendSMS(bestMargin.srcMarket, bestMargin.desMarket, bestMargin.margin);
        flag = false;
        setTimeout(() => {
            flag = true;
        }, config.mail_timeout);
    }
}

const watchQC = function () {
    setInterval(() => {
        mongoUtils.getPair("ZB", "BitCNY", "QC")
            .then((pair) => {
                let margin = pair.sellPrice - 1;
                if (margin > config.margin) {
                    sendNotification(margin, "QC有差价", "QC");
                }
                margin = 1 - pair.buyPrice;
                if (margin > config.margin) {
                    sendNotification(margin, "QC有差价", "QC");
                }
            });
    }, interval);
}

const watchMargin = function (symbol) {

    let markets = config.market[symbol];
    setInterval(() => {
        //获取价格对
        let promises = [];
        for (let i = 0; i < markets.length; i++) {
            promises.push(mongoUtils.getPair(markets[i], symbol, "BitCNY"));
        }
        Promise.all(promises)
            .then((pairs) => {
                let hasMargin = false;
                let bestMargin = {
                    "margin": 0,
                    "srcMarket": "",
                    "desMarket": ""
                };
                for (let i = 0; i < pairs.length; i++) {
                    let src = pairs[i];
                    if (!src || !src.buyPrice || !src.sellPrice || !checkTime(src.timestamp)) {
                        logger.warn(src, src.timestamp.getTime(), "src price error.");
                        continue;
                    }
                    for (let j = 0; j < pairs.length; j++) {
                        let des = pairs[j];
                        if (!des || !des.buyPrice || !des.sellPrice || !checkTime(des.timestamp)) {
                            logger.warn(des, des.timestamp.getTime(), "des price error.");
                            continue;
                        }
                        if (i == j) {
                            continue;
                        }
                        let margin = getMargin(src, des);
                        //差价写入mongodb
                        mongoUtils.insertMargin(src.market, des.market, symbol, margin);
                        //
                        if (margin > 0) {
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
                }

                //hasMargin = true;//for test
                //如果有显著差价，提醒
                if (hasMargin) {
                    sendNotification(bestMargin, "text", symbol);
                }
            });

    }, interval);
}

for (var key in config.market) {
    watchMargin(key);
}
//watchQC();