const mongodb = require('mongodb');
const assert = require('assert');
const config = require('../config.json');
const log4js = require('log4js');
const logger = log4js.getLogger('mongo');
logger.level = config.loggerLevel;

// insert into mongo
const url = config.mongodb.url;
const dbName = config.mongodb.dbName;
const collectionPairs = "pairs";
const collectionMargins = "margins";

var db;

// Initialize connection once
mongodb.MongoClient.connect(url, function (err, database) {
    if (err) {
        logger.error("mongodb error", err);
    }
    db = database.db(dbName);;
});

const insertPair = function (pair) {
    let collection = db.collection(collectionPairs);
    let id = new mongodb.ObjectID();

    let newPair = pair;
    newPair._id = id;
    newPair.timestamp = new Date(Date.now());

    collection.insertOne(newPair, function (err, result) {
        if (err) {
            logger.error("mongodb error", err);
        }
    });
}

const insertMargin = function (srcMarket, desMarket, token, margin) {
    let collection = db.collection(collectionMargins);
    let id = new mongodb.ObjectID();

    let newObj = {
        "_id": id,
        "srcMarket": srcMarket,
        "desMarket": desMarket,
        "token": token,
        "margin": margin,
        "timestamp": new Date(Date.now())
    };

    collection.insertOne(newObj, function (err, result) {
        if (err) {
            logger.error("mongodb error", err);
        }
    });
}

/**
 * 获得报价对
 * @param {string} market 报价市场
 * @param {string} quote 报价目标币种
 * @param {string} base 报价基础币种
 */
const getPair = function (market, quote, base) {
    //兼容上版本
    if (!quote) {
        quote = "BTS";
    }
    //
    let condition = { "market": market, "quote": quote };
    if (base) {
        condition.base = base;
    }
    return new Promise((resolve, reject) => {
        let collection = db.collection(collectionPairs);
        collection.findOne(condition, { "sort": [["_id", -1]] }, (function (err, docs) {
            if (err) {
                logger.error("mongodb error", err);
                reject(err);
            }
            logger.info("Found the following records");
            logger.info(docs);
            resolve(docs);
        }));
    });
}

const getMargin = function (srcMarket, desMarket, token) {
    return new Promise((resolve, reject) => {
        let collection = db.collection(collectionMargins);
        collection.findOne({ "srcMarket": srcMarket, "desMarket": desMarket, "token": token },
            { "sort": [["_id", -1]] }, (function (err, docs) {
                if (err) {
                    logger.error("mongodb error", err);
                    reject(err);
                }
                logger.info("Found margin");
                logger.info(docs);
                resolve(docs);
            }));
    });
}

exports.insertPair = insertPair;
exports.getPair = getPair;
exports.insertMargin = insertMargin;
exports.getMargin = getMargin;
