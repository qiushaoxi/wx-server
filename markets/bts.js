const WebSocket = require('ws');
const config = require("../config.json");
const Pair = require("../lib/pair.js").Pair;

const interval = config.interval;
const depthSize = config.depth;
const position = config.position;

const ws = new WebSocket('wss://openledger.hk/ws');

const CNY = "1.3.113";
const BTS = "1.3.0";
const CNY_PRECISION = 10000;
const BTS_PRECISION = 100000;

var sendMessage = { "id": 1, "method": "call", "params": [0, "get_limit_orders", [BTS, CNY, depthSize]] }
var innerPair = new Pair('bitCNY','BTS',"inner");

ws.on('open', function open() {
    setInterval(() => {
        ws.send(JSON.stringify(sendMessage))
    }, interval);

});

ws.on('message', function incoming(data) {
    let result = JSON.parse(data).result;
    //计算范围内均价
    let bts_amount_total = 0;
    let cny_amount_total = 0;

    for (let i = 0; i < depthSize & cny_amount_total < position; i++) {
        let bts_unit = result[i].sell_price.base.amount;
        let cny_unit = result[i].sell_price.quote.amount;
        let price = (cny_unit / CNY_PRECISION) / (bts_unit / BTS_PRECISION);

        let bts_amount = result[i].for_sale / BTS_PRECISION;
        let cny_amount = bts_amount * price;
        cny_amount_total += cny_amount;
        bts_amount_total += bts_amount;

        //console.log(price, '|', bts_amount, '|', cny_amount, '|', cny_amount_total);
    }
    let buyPrice = cny_amount_total / bts_amount_total;

    bts_amount_total = 0;
    cny_amount_total = 0;
    for (let i = 0; i < depthSize && cny_amount_total < position; i++) {
        let bts_unit = result[depthSize + i].sell_price.quote.amount;
        let cny_unit = result[depthSize + i].sell_price.base.amount;
        let price = (cny_unit / CNY_PRECISION) / (bts_unit / BTS_PRECISION);

        let cny_amount = result[depthSize + i].for_sale / CNY_PRECISION;
        let bts_amount = cny_amount / price;
        cny_amount_total += cny_amount;
        bts_amount_total += bts_amount;

        //console.log(cny_amount_total, '|', cny_amount, '|', bts_amount, '|', price);
    }
    let sellPrice = cny_amount_total / bts_amount_total;
    //console.log("Bitshares:");
    //console.log("buy:", buyPrice, "sell:", sellPrice);
    innerPair.buyPrice = buyPrice;
    innerPair.sellPrice = sellPrice;
});

exports.innerPair = innerPair;