//后台轮询差价
const margin = require('./margin');
//后台拼接价格对
const join = require('./tools/join.js');

//markets
const zbMarket = require('./markets/zb');
const btsMarket = require('./markets/bts');
//const aexMarket = require('./markets/aex');
const bigOneMarket = require('./markets/bigone');
const poloniexMarket = require('./markets/poloniex');
const binanceMarket = require('./markets/binance');
const gateioMarket = require('./markets/gateio');
const bitzMarket = require('./markets/bit-z');
const hitbtcMarket = require('./markets/hitbtc');
const bittrexMarket = require('./markets/bittrex');