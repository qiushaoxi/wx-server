/**
 * Margin类
 * @param {*} srcMarket 
 * @param {*} desMarket 
 * @param {*} symbol 
 * @param {*} margin 
 */
function Margin(srcMarket, desMarket, symbol, margin) {

    this.srcMarket = srcMarket;
    this.desMarket = desMarket;
    this.symbol = symbol;
    this.margin = margin;
    this.timestamp = Date.now();

}

exports.Margin = Margin;