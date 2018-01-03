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

const insertPair = function (pair) {
    mongodb.MongoClient.connect(url, function (err, client) {
        assert.equal(null, err);
        const db = client.db(dbName);
        const collection = db.collection(collectionPairs);

        const id = new mongodb.ObjectID();

        let newPair = pair;
        newPair._id = id;
        newPair.timestamp = new Date(Date.now());

        collection.insertOne(newPair, function (err, result) {
            assert.equal(err, null);
            client.close();
        });
    });
}

const insertMargin = function (srcMarket, desMarket, token, margin) {
    mongodb.MongoClient.connect(url, function (err, client) {
        assert.equal(null, err);
        const db = client.db(dbName);
        const collection = db.collection(collectionMargins);

        const id = new mongodb.ObjectID();

        let newObj = {
            "_id": id,
            "srcMarket": srcMarket,
            "desMarket": desMarket,
            "token": token,
            "margin": margin,
            "timestamp": new Date(Date.now())
        };

        collection.insertOne(newObj, function (err, result) {
            assert.equal(err, null);
            client.close();
        });
    });
}

const getPair = function (market, quote) {
    //兼容上版本
    if(!quote){
        quote = "BTS";
    }
    //
    return new Promise((resolve, reject) => {
        mongodb.MongoClient.connect(url, function (err, client) {
            assert.equal(null, err);
            const db = client.db(dbName);
            const collection = db.collection(collectionPairs);
            collection.findOne({ "market": market, "quote": quote }, { "sort": [["_id", -1]] }, (function (err, docs) {
                assert.equal(err, null);
                logger.info("Found the following records");
                logger.info(docs);
                client.close();
                resolve(docs);
            }));
        });
    });
}

const getMargin = function (srcMarket, desMarket, token) {
    return new Promise((resolve, reject) => {
        mongodb.MongoClient.connect(url, function (err, client) {
            assert.equal(null, err);
            const db = client.db(dbName);
            const collection = db.collection(collectionMargins);
            collection.findOne({ "srcMarket": srcMarket, "desMarket": desMarket, "token": token },
                { "sort": [["_id", -1]] }, (function (err, docs) {
                    assert.equal(err, null);
                    logger.info("Found margin");
                    logger.info(docs);
                    client.close();
                    resolve(docs);
                }));
        });
    });
}

exports.insertPair = insertPair;
exports.getPair = getPair;
exports.insertMargin = insertMargin;
exports.getMargin = getMargin;
/* 
const insertDocuments = function (db, callback) {
    // Get the documents collection
    const collection = db.collection('documents');
    // Insert some documents
    collection.insertMany([
        { a: 1 }, { a: 2 }, { a: 3 }
    ], function (err, result) {
        assert.equal(err, null);
        assert.equal(3, result.result.n);
        assert.equal(3, result.ops.length);
        console.log("Inserted 3 documents into the collection");
        callback(result);
    });
}

const findDocuments = function (db, callback) {
    // Get the documents collection
    const collection = db.collection('documents');
    // Find some documents
    collection.find({}).toArray(function (err, docs) {
        assert.equal(err, null);
        console.log("Found the following records");
        console.log(docs)
        callback(docs);
    });
}

const indexCollection = function (db, callback) {
    db.collection('documents').createIndex(
        { "a": 1 },
        null,
        function (err, results) {
            console.log(results);
            callback();
        }
    );
}; */