const WebSocket = require('ws');
const config = require("../config.json");
const Pair = require("../lib/pair.js").Pair;
const cache = require('../tools/cache');
const common = require('../tools/common');


const interval = config.interval;
const depthSize = config.depth;

const url = 'wss://bitshares-api.wancloud.io/ws'; //wss://bit.btsabc.org/ws';

//> { "id": 1, "method": "call", "params": [0, "lookup_asset_symbols",[["CNY"]]] }
const CNY = "1.3.113";
const BTS = "1.3.0";
const OPEN_EOS = "1.3.1999";
const WWW_EOS = "1.3.2402";
const GDEX_EOS = "1.3.2635";
const GDEX_ETH = "1.3.2598";
const GDEX_BTC = "1.3.2241";
const GDEX_BTM = "1.3.2790";
const GDEX_NEO = "1.3.2919";
const GDEX_GXS = "1.3.3445";
const OPEN_BTC = "1.3.861";
const OPEN_ETH = "1.3.850";
const OPEN_STEEM = "1.3.973";
const YOYOW = "1.3.1093";
const YOYOW_PRECISION = 100000;
const BTM_PRECISION = 1000000;
const EOS_PRECISION = 1000000;
const ETH_PRECISION = 1000000;
const CNY_PRECISION = 10000;
const BTS_PRECISION = 100000;
const BTC_PRECISION = 100000000;
const NEO_PRECISION = 10000000;
const GXS_PRECISION = 1000000;
const STEEM_PRECISION = 1000;



//call(CNY,WWW_EOS,EOS_PRECISION,"EOS","WWW.EOS")
const call = function (base, target, precision, symbol, market) {

    let baseName, basePrecision;
    if (base == CNY) {
        baseName = 'BitCNY';
        basePrecision = CNY_PRECISION;
    } else if (base == BTS) {
        baseName = 'BTS';
        basePrecision = BTS_PRECISION;
    }

    let position = config.position[baseName];

    let ws = new WebSocket(url);

    let sendMessage = { "id": 1, "method": "call", "params": [0, "get_limit_orders", [target, base, depthSize]] }
    let innerPair = new Pair(baseName, symbol, market);

    ws.on('open', function open() {
        setInterval(() => {
            ws.send(JSON.stringify(sendMessage))
        }, interval);

    });

    ws.on('message', function incoming(data) {

        let result = common.safelyParseJSON(data).result;
        if (result.length == 0) {
            return;
        }
        //计算范围内均价
        let token_amount_total = 0;
        let base_amount_total = 0;
        //深度可能不到depthSize
        let sellDepth = 0;
        for (let i = 0; i < depthSize && base_amount_total < position && result[i].sell_price.quote.asset_id == base; i++) {
            let token_unit = result[i].sell_price.base.amount;
            let base_unit = result[i].sell_price.quote.amount;
            let price = (base_unit / basePrecision) / (token_unit / precision);

            let token_amount = result[i].for_sale / precision;
            let base_amount = token_amount * price;
            base_amount_total += base_amount;
            token_amount_total += token_amount;

            sellDepth++;

        }

        let buyPrice = base_amount_total / token_amount_total;

        //上面循环因为头寸退出，则计数器sellDepth还需要加
        while (result[sellDepth].sell_price.quote.asset_id == CNY) {
            sellDepth++;
        }

        token_amount_total = 0;
        base_amount_total = 0;
        for (let i = 0; i < depthSize && sellDepth + i < result.length && base_amount_total < position; i++) {
            let token_unit = result[sellDepth + i].sell_price.quote.amount;
            let base_unit = result[sellDepth + i].sell_price.base.amount;
            let price = (base_unit / basePrecision) / (token_unit / precision);

            let base_amount = result[sellDepth + i].for_sale / basePrecision;
            let token_amount = base_amount / price;
            base_amount_total += base_amount;
            token_amount_total += token_amount;

        }
        let sellPrice = base_amount_total / token_amount_total;

        innerPair.buyPrice = buyPrice;
        innerPair.sellPrice = sellPrice;
        innerPair.timestamp = Date.now();
        cache.insertPair(innerPair);

    });
}

call(CNY, WWW_EOS, EOS_PRECISION, "EOS", "WWW.EOS");
call(CNY, BTS, BTS_PRECISION, "BTS", "inner");
call(CNY, GDEX_EOS, EOS_PRECISION, "EOS", "GDEX.EOS");
call(CNY, GDEX_ETH, ETH_PRECISION, "ETH", "GDEX.ETH");
call(CNY, GDEX_BTC, BTC_PRECISION, "BTC", "GDEX.BTC");
call(CNY, GDEX_BTM, BTM_PRECISION, "BTM", "GDEX.BTM");
call(CNY, GDEX_NEO, NEO_PRECISION, "NEO", "GDEX.NEO");
call(CNY, YOYOW, YOYOW_PRECISION, "YOYO", "inner");
call(CNY, GDEX_GXS, GXS_PRECISION, "GXS", "GDEX.GXS");
call(CNY, OPEN_BTC, BTC_PRECISION, "BTC", "OPEN.BTC");
call(CNY, OPEN_ETH, ETH_PRECISION, "ETH", "OPEN.ETH");
call(CNY, OPEN_EOS, EOS_PRECISION, "EOS", "OPEN.EOS");
call(BTS, OPEN_STEEM, STEEM_PRECISION, "STEEM", "OPEN.STEEM");