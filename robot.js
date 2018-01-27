/**
 * bitshare-api关闭连接问题
 * bitshare-api获取交易成功推送问题
 * 发送邮件失败问题
 * 模块化问题
 */
const common = require('./tools/common');
const logger = common.getLogger('robot');
const binanceAPI = require('./tools/binance');
const bitsharesAPI = require('./tools/bitshares');
const mongodbAPI = require('./tools/mongodb');
logger.level = "debug";
const mail = require('./tools/mail');

//触发交易的利差
const triggerMargin = 0.02;
//刷新价格时间间隔，毫秒
const intervalGap = 500;
//单次交易额度
const position = 500;//CNY
//为了成交调整价格挂单    
const adjust = 0.02;

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
        setTimeout(() => {
            notifyMailFlag = true;
        }, 600000)
    }
}

const checkTime = function (Timestamp) {
    return !(Date.now() - Timestamp > 5000)
    //差5秒则无效
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
                mongodbAPI.getMargin(db, "binance", "GDEX.ETH", "ETH")
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
                                            let ethAmount = (position / GDEX_ETH.sellPrice);
                                            let btsAmount = position / BTS.buyPrice;
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
                                                if (binanceBts >= btsAmount && innerCny >= cnyAmount && innerEth >= ethAmount) {

                                                    //1.币安卖出bts到eth,统计eth数量;2.内盘买入bts，内盘卖出gdex.eth,
                                                    binanceAPI.binanceOrder("BTSETH", "SELL", Math.floor(btsAmount))
                                                        .then((res) => {
                                                            let resultEthAmount = 0;
                                                            let fills = res.fills;
                                                            for (let i in fills) {
                                                                resultEthAmount += fills[i].qty * fills[i].price;
                                                            }
                                                            //防止不够卖
                                                            if (innerEth < resultEthAmount) {
                                                                resultEthAmount = innerEth;
                                                            }
                                                            let resultCnyAmount = resultEthAmount * GDEX_ETH.sellPrice * (1 - adjust);//
                                                            //console.log(resultAmount);
                                                            //内盘发起两笔交易
                                                            Promise.all([
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
                                                            ]).then((res) => {
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
                                                                    })
                                                                }, 5000);
                                                            });
                                                        })
                                                } else {
                                                    logger.error("not enable token to move");
                                                    sendNotifyMail("not enable token to move");
                                                    flag = true;
                                                }
                                            });

                                        } else {
                                            flag = true;
                                            logger.error("price too old");
                                        }

                                    });
                                }
                            }

                        } else {
                            logger.error("margin too old");
                        }

                    });

                //========================================================================================
                // inner => binance
                mongodbAPI.getMargin(db, "GDEX.ETH", "binance", "ETH")
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
                                            let ethAmount = (position / GDEX_ETH.buyPrice);
                                            let btsAmount = position / BTS.sellPrice;
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
                                                if (binanceEth >= ethAmount && innerBts >= btsAmount && innerCny >= cnyAmount) {
                                                    //if (binanceBts >= btsAmount && innerCny >= cnyAmount && innerEth >= ethAmount) {

                                                    //1.币安从eth买入bts,统计eth数量;2.内盘卖出bts，内盘买入gdex.eth,
                                                    binanceAPI.binanceOrder("BTSETH", "BUY", Math.floor(btsAmount))
                                                        .then((res) => {
                                                            let resultEthAmount = 0;
                                                            let fills = res.fills;
                                                            for (let i in fills) {
                                                                resultEthAmount += fills[i].qty * fills[i].price;
                                                            }
                                                            let resultCnyAmount = resultEthAmount * GDEX_ETH.buyPrice * (1 + adjust);
                                                            //console.log(resultAmount);
                                                            //内盘发起两笔交易
                                                            Promise.all([
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
                                                            ]).then((res) => {
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
                                                                    })
                                                                }, 5000);
                                                            });
                                                        })
                                                } else {
                                                    logger.error("not enable token to move");
                                                    sendNotifyMail("not enable token to move");
                                                    flag = true;
                                                }
                                            });

                                        } else {
                                            flag = true;
                                            logger.error("price too old");
                                        }

                                    });
                                }
                            }

                        } else {
                            logger.error("margin too old");
                        }

                    });


            }
        }, intervalGap);
    });


