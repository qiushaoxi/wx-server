const Pair = require("../lib/pair.js").Pair;
const Margin = require("../lib/margin.js").Margin;

var cache = {};

function insertKey(type, key, value) {

    let uniKey = type + '-' + key;
    cache[uniKey] = value;

}

function getKey(type, key) {

    let uniKey = type + '-' + key;
    return cache[uniKey];

}

function insertPair(pair) {

    let key = pair.base + '-' + pair.quote + '-' + pair.market;
    insertKey('pair', key, pair);
    
}

function getPairSYNC(market, quote, base) {
    let key = base + '-' + quote + '-' + market;
    let value = getKey('pair', key);
    if (value) {
        return value;
    } else {
        //查询无结果，返回一个临时值
        return new Pair(base, quote, market, 9999999999, 0);
    }
}

function getPair(market, quote, base) {
    return new Promise((resolve, reject) => {
        let key = base + '-' + quote + '-' + market;
        let value = getKey('pair', key);
        if (value) {
            resolve(value);
        } else {
            //查询无结果，返回一个临时值
            resolve(new Pair(base, quote, market, 0, 0));
        }
    });

}

function insertMargin(srcMarket, desMarket, symbol, margin){
    let key = srcMarket + '-' + desMarket + '-' + symbol;
    insertKey('margin', key, new Margin(srcMarket,desMarket,symbol,margin));
}

function getMarginSYNC(srcMarket, desMarket, symbol) {
    let key = srcMarket + '-' + desMarket + '-' + symbol;
    let value = getKey('margin', key);
    if (value) {
        return value;
    } else {
        return new Margin(srcMarket, desMarket, symbol, 0);
    }
}

function getMargin(srcMarket, desMarket, symbol) {
    return new Promise((resolve, reject) => {
        let key = srcMarket + '-' + desMarket + '-' + symbol;
        let value = getKey('margin', key);
        if (value) {
            resolve(value);
        } else {
            resolve(new Margin(srcMarket, desMarket, symbol, -1));
        }
    });

}

module.exports = { insertMargin, insertPair, getMargin, getPair }

//测试
/* 
let p = new Pair('BTS', 'BTC', 'inner', 2, 1);

insertPair(p);
insertMargin(new Margin('AEX','inner','BTS',1));

console.log(cache);

console.log(getPair('inner', 'BTC', 'BTS'));
console.log(getPair('inner', 'ETH', 'BTS'));

console.log(getMargin('AEX','inner','BTS'));
console.log(getMargin('AEX','inner','ETH'));

p = new Pair('BTS', 'BTC', 'inner', 1.5, 1);
insertPair(p);

console.log(cache);

console.log(getPair('inner', 'BTC', 'BTS'));

 */