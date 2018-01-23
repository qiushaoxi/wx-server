const crypto = require('crypto');
const superagent = require('superagent');
const config = require('./config.json');

const secret = config.binance.secret;
const apiKey = config.binance.apiKey;

String.prototype.addParams = function (name, value) {
    return this + "&" + name + "=" + value;
}

let raw = "symbol=BTSETH"
    .addParams('side', 'SELL')
    .addParams('type', 'MARKET')
    .addParams('quantity', 0.1)
    .addParams('timestamp', Date.now());

console.log(raw);


var hmac = crypto.createHmac('sha256', secret);
hmac.update(raw);
var signature = hmac.digest('hex');

console.log(signature)

var params = raw + '&signature=' + signature;

console.log(params)

superagent
    .post('https://api.binance.com/api/v3/order?' + params)
    .set('X-MBX-APIKEY', apiKey)
    .set('accept', 'json')
    .end((err, res) => {
        // Calling the end function will send the request
        console.log(res.text);
        //"status":"FILLED"

    });