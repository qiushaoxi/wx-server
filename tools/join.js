const common = require("../tools/common");
const logger = common.getLogger('join');
const mongoUtils = require('../tools/mongo');
const Pair = require("../lib/pair.js").Pair;
const joinConfig = require("../configs/join.json");

// 时间戳检查，检查价格有效性
const checkTime = function (Timestamp) {
    return !(Date.now() - Timestamp.getTime() > 5000)
    //差5秒则无效
}

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
            promises.push(mongoUtils.getPair(queryPairs[i].market, queryPairs[i].quote, queryPairs[i].base));
        }
        promises.push(mongoUtils.getPair(queryPairs[i].market, queryPairs[i].quote, queryPairs[i].base));
        Promise.all(promises)
            .then((pairs) => {
                let buyPrice = 1;
                let sellPrice = 1;
                for (let i = 0; i < pairs.length; i++) {
                    //如果价格时间异常，放弃
                    if (!pairs[i] || !checkTime(pairs[i].timestamp)) {
                        logger.error(pairs, "price timeout");
                        return;
                    }
                    buyPrice = buyPrice * pairs[i].buyPrice;
                    sellPrice = sellPrice * pairs[i].sellPrice;
                }
                let pair = new Pair(queryPairs[0].base, queryPairs[queryPairs.length - 1].quote,
                    queryPairs[queryPairs.length - 1].market, buyPrice, sellPrice);
                mongoUtils.insertPair(pair);
            });
    }
}

exports.join = join;

setInterval(() => {
    joinConfig.forEach((query) => {
        join(query);
    });
}, 1000); 