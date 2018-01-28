/**
 * bitshare-api关闭连接问题
 * bitshare-api获取交易成功推送问题
 * 模块化问题
 * 交易结果统计改进
 */
const common = require('./tools/common');
const logger = common.getLogger('robot');
const binanceAPI = require('./tools/binance');
const bitsharesAPI = require('./tools/bitshares');
const mongodbAPI = require('./tools/mongodb');
logger.level = "debug";
const mail = require('./tools/mail');
const sms = require('./tools/sms');
const config = require('./config.json');

//触发交易的利差
const triggerMargin = config.robot.triggerMargin;
//刷新价格时间间隔，毫秒
const intervalGap = config.robot.intervalGap;
//单次交易额度
const position = config.robot.position;//CNY
//为了成交调整价格挂单    
const adjust = config.robot.adjust;

//是否可交易，如果已经开启一个交易，那么flag=false知道交易结束
var flag = true;

var errorMailFlag = true;
const sendErrorMail = function (subject, message) {
    if (errorMailFlag) {
        errorMailFlag = false;
        mail.sendMail(subject, message);
        setTimeout(() => {
            errorMailFlag = true;
        }, 600000)
    }
}

var notifyMailFlag = true;
const sendNotifyMail = function (subject, message) {
    if (notifyMailFlag) {
        notifyMailFlag = false;
        mail.sendMail(subject, message);
        sms.sendSMS(subject, message, '');
        setTimeout(() => {
            notifyMailFlag = true;
        }, 600000)
    }
}

const checkTime = function (Timestamp) {
    return !(Date.now() - Timestamp > 5000)
    //差5秒则无效
}

/**
 * diraction : 1-(db, "binance", "GDEX.ETH", "ETH") , 2-(db, "GDEX.ETH", "binance", "ETH")
 * @param {*} diraction 
 */
const doTx = function (db, diraction) {

    return new Promise((resolve, reject) => {
        if (diraction != 1 && diraction != 2) {
            reject("error diraction");
        }
        let marginPromise;
        if (diraction == 1) {
            marginPromise = mongodbAPI.getMargin(db, "binance", "GDEX.ETH", "ETH");
        } else {
            marginPromise = mongodbAPI.getMargin(db, "GDEX.ETH", "binance", "ETH");
        }
        marginPromise
            .then((res) => {
                if (checkTime(res.timestamp)) {
                    if (res.margin > triggerMargin) {
                        if (flag) {
                            //差价出现，开始执行交易
                            flag = false;

                            let txLog = {};

                            // 获得市值
                            Promise.all([
                                mongodbAPI.getPair(db, "binance", "ETH", "BitCNY"),
                                mongodbAPI.getPair(db, "inner", "BTS", "BitCNY"),
                                mongodbAPI.getPair(db, "GDEX.ETH", "ETH", "BitCNY"),
                            ]).then((res) => {
                                let [binanceETH, BTS, GDEX_ETH] = res;

                                //检查时间有效
                                let allCheck = true;
                                for (let i in res) {
                                    if (!checkTime(res[i].timestamp)) {
                                        allCheck = false;
                                    }
                                }
                                if (allCheck) {
                                    let ethPrice, btsPrice;
                                    if (diraction == 1) {
                                        ethPrice = GDEX_ETH.sellPrice;
                                        btsPrice = BTS.buyPrice;
                                    } else {
                                        ethPrice = GDEX_ETH.buyPrice;
                                        btsPrice = BTS.sellPrice;
                                    }
                                    let ethAmount = position / ethPrice;
                                    let btsAmount = position / btsPrice;
                                    let cnyAmount = position;

                                    //
                                    let chainStorePromise = bitsharesAPI.getChainStore();
                                    //
                                    Promise.all([
                                        binanceAPI.binanceGetBalance("BTS"),
                                        binanceAPI.binanceGetBalance("ETH"),
                                        bitsharesAPI.getBalance(chainStorePromise, "BTS"),
                                        bitsharesAPI.getBalance(chainStorePromise, "CNY"),
                                        bitsharesAPI.getBalance(chainStorePromise, "GDEX.ETH"),
                                    ]).then((res) => {
                                        let [binanceBts, binanceEth, innerBts, innerCny, innerEth] = res;

                                        //记录交易前状态
                                        txLog.before = {
                                            "inner": {
                                                "BTS": innerBts,
                                                "GDEX.ETH": innerEth,
                                                "BitCNY": innerCny
                                            },
                                            "binance": {
                                                "BTS": binanceBts,
                                                "ETH": binanceEth
                                            },
                                            "total": {
                                                "BitCNY": innerCny,
                                                "BTS": binanceBts + innerBts,
                                                "ETH": binanceEth + innerEth
                                            }
                                        }

                                        //保证子弹足够
                                        let enoughFlag;
                                        let binanceAction;
                                        if (diraction == 1) {
                                            enoughFlag = (binanceBts >= btsAmount && innerCny >= cnyAmount && innerEth >= ethAmount);
                                            binanceAction = 'SELL';
                                        } else {
                                            enoughFlag = (binanceEth >= ethAmount && innerBts >= btsAmount && innerCny >= cnyAmount);
                                            binanceAction = 'BUY';
                                        }
                                        if (enoughFlag) {
                                            binanceAPI.binanceOrder("BTSETH", binanceAction, Math.floor(btsAmount))
                                                .then((res) => {
                                                    let resultEthAmount = 0;
                                                    let resultCnyAmount;
                                                    let innerTxPromises = [];
                                                    let fills = res.fills;
                                                    for (let i in fills) {
                                                        resultEthAmount += fills[i].qty * fills[i].price;
                                                    }
                                                    if (diraction == 1) {
                                                        //防止不够卖
                                                        if (innerEth < resultEthAmount) {
                                                            resultEthAmount = innerEth;
                                                        }
                                                        resultCnyAmount = resultEthAmount * ethPrice * (1 - adjust);
                                                        innerTxPromises = [
                                                            bitsharesAPI.createOrder(
                                                                chainStorePromise,
                                                                { amount: cnyAmount * bitsharesAPI.precisions.CNY, asset: "CNY" },
                                                                { amount: btsAmount * bitsharesAPI.precisions.BTS, asset: "BTS" }
                                                            ),
                                                            bitsharesAPI.createOrder(
                                                                chainStorePromise,
                                                                { amount: resultEthAmount * bitsharesAPI.precisions.ETH, asset: "GDEX.ETH" },
                                                                { amount: resultCnyAmount * bitsharesAPI.precisions.CNY, asset: "CNY" }
                                                            )
                                                        ]
                                                    } else {
                                                        resultCnyAmount = resultEthAmount * ethPrice * (1 + adjust);
                                                        innerTxPromises = [
                                                            bitsharesAPI.createOrder(
                                                                chainStorePromise,
                                                                { amount: btsAmount * bitsharesAPI.precisions.BTS, asset: "BTS" },
                                                                { amount: cnyAmount * bitsharesAPI.precisions.CNY, asset: "CNY" }
                                                            ),
                                                            bitsharesAPI.createOrder(
                                                                chainStorePromise,
                                                                { amount: resultCnyAmount * bitsharesAPI.precisions.CNY, asset: "CNY" },
                                                                { amount: resultEthAmount * bitsharesAPI.precisions.ETH, asset: "GDEX.ETH" }
                                                            )
                                                        ]
                                                    }
                                                    //内盘发起两笔交易
                                                    Promise.all(innerTxPromises).then((res) => {
                                                        logger.info("all done");

                                                        //等待成交结果
                                                        setTimeout(() => {
                                                            Promise.all([
                                                                binanceAPI.binanceGetBalance("BTS"),
                                                                binanceAPI.binanceGetBalance("ETH"),
                                                                bitsharesAPI.getBalance(chainStorePromise, "BTS"),
                                                                bitsharesAPI.getBalance(chainStorePromise, "CNY"),
                                                                bitsharesAPI.getBalance(chainStorePromise, "GDEX.ETH"),
                                                            ]).then((res) => {
                                                                let [binanceBts, binanceEth, innerBts, innerCny, innerEth] = res;
                                                                //记录交易后状态
                                                                txLog.after = {
                                                                    "inner": {
                                                                        "BTS": innerBts,
                                                                        "GDEX.ETH": innerEth,
                                                                        "BitCNY": innerCny
                                                                    },
                                                                    "binance": {
                                                                        "BTS": binanceBts,
                                                                        "ETH": binanceEth
                                                                    },
                                                                    "total": {
                                                                        "BitCNY": innerCny,
                                                                        "BTS": binanceBts + innerBts,
                                                                        "ETH": binanceEth + innerEth
                                                                    }
                                                                }

                                                                txLog.diff = {
                                                                    "BitCNY": txLog.after.total.BitCNY - txLog.before.total.BitCNY,
                                                                    "BTS": txLog.after.total.BTS - txLog.before.total.BTS,
                                                                    "ETH": txLog.after.total.ETH - txLog.before.total.ETH,
                                                                }
                                                                logger.info(txLog);
                                                                flag = true;
                                                                mongodbAPI.insertTxLog(db, txLog);
                                                                resolve(txLog);
                                                            })
                                                        }, 5000);
                                                    });
                                                })
                                        } else {
                                            logger.error("not enable token to move");
                                            sendNotifyMail("not enable token to move");
                                            flag = true;
                                            reject("not enable token to move");
                                        }
                                    });

                                } else {
                                    flag = true;
                                    logger.error("price too old");
                                    reject("not enable token to move");
                                }

                            });
                        }
                    }

                } else {
                    logger.error("margin too old");
                    reject("not enable token to move");
                }

            });
    });

}

//flag检查器，如果长时间占用，报错
var count = 0;
setInterval(() => {
    if (!flag) {
        count++;
        if (count > 60) {
            sendErrorMail("flag false too long");
            //强制设置为true，带商榷
            flag = true;
            count = 0;
        }
    } else {
        count = 0;
    }
}, 1000);

logger.info("start robot!");
//bitshares api 接口有连接需要优化，多次查询可以优化
mongodbAPI.getDB()
    .then((db) => {
        setInterval(() => {
            if (flag) {
                //binance => inner
                doTx(db, 1);
                // inner => binance
                doTx(db, 2);
            }
        }, intervalGap);
    });

