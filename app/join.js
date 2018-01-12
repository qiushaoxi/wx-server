const common = require("../tools/common");
const logger = common.getLogger('join');
const mongoUtils = require('../tools/mongo');
const Pair = require("../lib/pair.js").Pair;



function join(tokens, market) {
    if (tokens.length > 2) {
        let promises = [];
        for (let i = 0; i < tokens.length - 1; i++) {
            promises.push(mongoUtils.getPair(market, tokens[i + 1], tokens[i]));
        }
        Promise.all(promises)
            .then((pairs) => {
                let buyPrice = 1;
                let sellPrice = 1;
                for (let i = 0; i < pairs.length; i++) {
                    buyPrice = buyPrice * pairs[i].buyPrice;
                    sellPrice = sellPrice * pairs[i].sellPrice;
                }
                let pair = new Pair(tokens[0], tokens[tokens.length - 1], market, buyPrice, sellPrice);
                mongoUtils.insertPair(pair);
            });
    }
}

/* setTimeout(() => {
    join(["BitCNY", "BTC", "BTM"], "bigOne");
}, 4000);
 */

setInterval(() => {
    join(["BitCNY", "BTC", "BTM"], "bigOne");
    join(["BitCNY", "QC", "EOS"], "ZB");
    join(["BitCNY", "QC", "BTS"], "ZB");
    join(["BitCNY", "QC", "BTC"], "ZB");
    join(["BitCNY", "QC", "ETH"], "ZB");
}, 1000);