/**
 * Pair 类，表示一个币种之间的交易对
 * @param {*} base 计价币种
 * @param {*} quote 标价币种
 * @param {*} market 交易市场
 * @param {*} buyPrice 买入价
 * @param {*} sellPrice 卖出价
 */
function Pair(base, quote, market, buyPrice, sellPrice) {

    this.base = base;
    this.quote = quote;
    this.market = market;
    this.buyPrice = buyPrice;
    this.sellPrice = sellPrice;
    this.timestamp = Date.now();

}

function swap(pair) {
    return newPair = new Pair(pair.quote, pair.base, pair.market, 1 / pair.sellPrice, 1 / pair.buyPrice)
}

exports.Pair = Pair;
exports.swap = swap;
