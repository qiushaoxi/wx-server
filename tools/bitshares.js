/* import {Apis} from "bitsharesjs-ws";
import {ChainStore, FetchChain, PrivateKey, TransactionHelper, Aes, TransactionBuilder} from "bitsharesjs"; */
const Apis = require('bitsharesjs-ws').Apis;
const ChainStore = require('bitsharesjs').ChainStore;
const FetchChain = require('bitsharesjs').FetchChain;
const PrivateKey = require('bitsharesjs').PrivateKey;
const TransactionHelper = require('bitsharesjs').TransactionHelper;
const Aes = require('bitsharesjs').Aes;
const TransactionBuilder = require('bitsharesjs').TransactionBuilder;
const common = require('./common');
var logger = common.getLogger('bitshares-api');
const config = require('../config.json');
const authConfig = require('../configs/auth.json');
logger.level = "info";

const precisions = {
    "BTS": 100000,
    "CNY": 10000,
    "ETH": 1000000,
    "GDEX.ETH": 1000000,
    "EOS": 1000000
}

const wss_url = "wss://bitshares-api.wancloud.io/ws";
const account = authConfig.bitshares.account;
const privKey = authConfig.bitshares.privKey;
const expirationS = config.bitshares.expirationS;
const pKey = PrivateKey.fromWif(privKey);

const transfer = function (toAccount, sendAmount, memo) {
    let fromAccount = account;
    return new Promise((resolve, reject) => {
        Apis.instance(wss_url, true)
            .init_promise.then((res) => {
                logger.info("connected to:", res[0].network_name, "network");

                ChainStore.init().then(() => {

                    let memoSender = fromAccount;

                    Promise.all([
                        FetchChain("getAccount", fromAccount),
                        FetchChain("getAccount", toAccount),
                        FetchChain("getAccount", memoSender),
                        FetchChain("getAsset", sendAmount.asset),
                        FetchChain("getAsset", sendAmount.asset)
                    ]).then((res) => {
                        // logger.info("got data:", res);
                        let [fromAccount, toAccount, memoSender, sendAsset, feeAsset] = res;

                        // Memos are optional, but if you have one you need to encrypt it here
                        let memoFromKey = memoSender.getIn(["options", "memo_key"]);
                        logger.info("memo pub key:", memoFromKey);
                        let memoToKey = toAccount.getIn(["options", "memo_key"]);
                        let nonce = TransactionHelper.unique_nonce_uint64();

                        let memo_object = {
                            from: memoFromKey,
                            to: memoToKey,
                            nonce,
                            message: Aes.encrypt_with_checksum(
                                pKey,
                                memoToKey,
                                nonce,
                                memo
                            )
                        }

                        let tr = new TransactionBuilder()

                        tr.add_type_operation("transfer", {
                            fee: {
                                amount: 0,
                                asset_id: feeAsset.get("id")
                            },
                            from: fromAccount.get("id"),
                            to: toAccount.get("id"),
                            amount: { amount: sendAmount.amount, asset_id: sendAsset.get("id") },
                            memo: memo_object
                        })

                        tr.set_required_fees().then(() => {
                            tr.add_signer(pKey, pKey.toPublicKey().toPublicKeyString());
                            logger.info("serialized transaction:", tr.serialize());
                            tr.broadcast(() => {
                                logger.info("transaction done");
                                resolve();
                            }).catch((err) => {
                                logger.error(err);
                                reject(err);
                            });
                        })
                    });
                });
            });

    });
}

const transferBTS = function (toAccount, amount, memo) {
    return transfer(toAccount, { amount: amount * precisions.BTS, asset: "BTS" }, memo);
}

const transferCNY = function (toAccount, amount, memo) {
    return transfer(toAccount, { amount: amount * precisions.CNY, asset: "CNY" }, memo);
}

const createOrder = function (chainStorePromise, sellAmount, buyAmount) {
    let orderAccount = account;
    return new Promise((resolve, reject) => {
        chainStorePromise.then(() => {
            Promise.all([
                FetchChain("getAccount", orderAccount),
                FetchChain("getAsset", sellAmount.asset),
                FetchChain("getAsset", buyAmount.asset)
            ]).then((res) => {
                // logger.info("got data:", res);
                let orderAccount = res[0];
                let sellAsset = res[1];
                let feeAsset = sellAsset;
                let buyAsset = res[2];

                let tr = new TransactionBuilder()

                tr.add_type_operation("limit_order_create", {
                    fee: {
                        amount: 0,
                        asset_id: feeAsset.get("id")
                    },
                    seller: orderAccount.get("id"),
                    amount_to_sell: { amount: Math.floor(sellAmount.amount), asset_id: sellAsset.get("id") },
                    min_to_receive: { amount: Math.floor(buyAmount.amount), asset_id: buyAsset.get("id") },
                    expiration: Math.floor(Date.now() / 1000) + expirationS,
                    fill_or_kill: false
                })

                tr.set_required_fees().then(() => {
                    tr.add_signer(pKey, pKey.toPublicKey().toPublicKeyString());
                    logger.info("serialized transaction:", tr.serialize());
                    tr.broadcast(() => {
                        logger.info("transaction done");
                        resolve();
                    }).catch((err) => {
                        logger.error(err);
                        reject(err);
                    });
                })
            });
        });
    });
}

const createOrder2 = function (sellAmount, buyAmount) {
    let orderAccount = account;
    return new Promise((resolve, reject) => {
        Apis.instance(wss_url, true)
            .init_promise.then((res) => {
                logger.info("connected to:", res[0].network_name, "network");

                ChainStore.init().then(() => {
                    Promise.all([
                        FetchChain("getAccount", orderAccount),
                        FetchChain("getAsset", sellAmount.asset),
                        FetchChain("getAsset", buyAmount.asset)
                    ]).then((res) => {
                        // logger.info("got data:", res);
                        let orderAccount = res[0];
                        let sellAsset = res[1];
                        let feeAsset = sellAsset;
                        let buyAsset = res[2];

                        let tr = new TransactionBuilder()

                        tr.add_type_operation("limit_order_create", {
                            fee: {
                                amount: 0,
                                asset_id: feeAsset.get("id")
                            },
                            seller: orderAccount.get("id"),
                            amount_to_sell: { amount: sellAmount.amount, asset_id: sellAsset.get("id") },
                            min_to_receive: { amount: buyAmount.amount, asset_id: buyAsset.get("id") },
                            expiration: Math.floor(Date.now() / 1000) + 20,
                            fill_or_kill: false
                        })

                        tr.set_required_fees().then(() => {
                            tr.add_signer(pKey, pKey.toPublicKey().toPublicKeyString());
                            logger.info("serialized transaction:", tr.serialize());
                            tr.broadcast(() => {
                                logger.info("transaction done");
                                resolve();
                            }).catch((err) => {
                                logger.error(err);
                                reject(err);
                            });
                        })
                    });
                });
            });

    });
}


const getInstancePromise = function () {
    return Apis.instance(wss_url, true).init_promise;
}


const getChainStore = function () {
    return Apis.instance(wss_url, true).init_promise
        .then(() => {
            return ChainStore.init();
        });
}

const getBalance = function (chainStorePromise, token) {
    return new Promise((resolve, reject) => {
        let precision = precisions[token];
        if (!precision) {
            reject("wrong token name.");
        }
        chainStorePromise.then(() => {
            Promise.all([
                FetchChain("getAccount", account),
                FetchChain("getAsset", token)
            ]).then((res) => {
                let [tempAccount, tempAsset] = res;
                let balance = ChainStore.getAccountBalance(tempAccount, tempAsset.get("id"));
                resolve(balance / precision);
            });
        });
    });
}


/**
 * get token balance with precision
 * @param {string} token 
 */
const getBalance2 = function (token) {
    return new Promise((resolve, reject) => {
        let precision = precisions[token];
        if (!precision) {
            reject("wrong token name.");
        }
        Apis.instance(wss_url, true)
            .init_promise.then((res) => {
                logger.info("connected to:", res[0].network_name, "network");

                ChainStore.init().then(() => {
                    //ChainStore.subscribe(updateState);
                    Promise.all([
                        FetchChain("getAccount", account),
                        FetchChain("getAsset", token)
                    ]).then((res) => {
                        let [tempAccount, tempAsset] = res;
                        let balance = ChainStore.getAccountBalance(tempAccount, tempAsset.get("id"));
                        resolve(balance / precision);
                    });
                });
            });
    });
}

module.exports = { transfer, transferBTS, transferCNY, createOrder, getBalance, precisions, getInstancePromise, getChainStore }
//transferBTS("imba", "qiushaoxi", 0.05, "test nodejs");
//create_order("imba", { amount: 0.5 * BTS_PRECISION, asset: "BTS" }, { amount: 5 * CNY_PRECISION, asset: "CNY" });