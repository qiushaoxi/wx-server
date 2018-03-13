const common = require("../tools/common");
const logger = common.getLogger('join');
const cache = require('../tools/cache');
const Pair = require("../lib/pair.js").Pair;
const joinConfig = require("../configs/join.json");

/**
 * 没有直接交易对的币种，通过中间币种计算价格
 * @param {[]} queryPairs 
 */
function join(queryPairs) {
    if (queryPairs.length > 1) {
        let promises = [];
        let i = 0;
        for (; i < queryPairs.length - 1; i++) {
            if (queryPairs[i].quote != queryPairs[i + 1].base) {
                return;
            }
            promises.push(cache.getPair(queryPairs[i].market, queryPairs[i].quote, queryPairs[i].base));
        }
        promises.push(cache.getPair(queryPairs[i].market, queryPairs[i].quote, queryPairs[i].base));
        Promise.all(promises)
            .then((pairs) => {
                let buyPrice = 1;
                let sellPrice = 1;
                for (let i = 0; i < pairs.length; i++) {
                    buyPrice = buyPrice * pairs[i].buyPrice;
                    sellPrice = sellPrice * pairs[i].sellPrice;
                }
                let pair = new Pair(queryPairs[0].base, queryPairs[queryPairs.length - 1].quote,
                    queryPairs[queryPairs.length - 1].market, buyPrice, sellPrice);
                if (pair.buyPrice == 0 || pair.sellPrice == 0) {
                    return;
                }
                cache.insertPair(pair);
            });
    }
}

exports.join = join;

setInterval(() => {
    joinConfig.forEach((query) => {
        join(query);
    });
}, 1000); 