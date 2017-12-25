const mongodb = require('mongodb');
const assert = require('assert');
const config = require('../config.json');

// insert into mongo
const url = config.mongodb.url;
const dbName = config.mongodb.dbName;
const collectionName = config.mongodb.collectionName;

const insertPair = function (pair) {
    mongodb.MongoClient.connect(url, function (err, client) {
        assert.equal(null, err);
        //console.log("Connected successfully to server");
        const db = client.db(dbName);
        const collection = db.collection(collectionName);

/*         collection.findOne({}, { "sort": [["_id", -1]] }, (function (err, docs) {
            assert.equal(err, null);
            console.log("Found the following records");
            console.log(docs._id);
        })); */

        const id = new mongodb.ObjectID()//.createFromTime(Date.now());

        let newPair = pair;
        newPair._id = id;

        collection.insertOne(newPair, function (err, result) {
            assert.equal(err, null);
            //console.log("Inserted 1 documents into the collection");
            client.close();
        });
    });
}
exports.insertPair = insertPair;
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