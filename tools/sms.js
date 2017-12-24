const crypto = require('crypto');
const config = require('../config.json');
const superagent = require('superagent');
const mail = require('./mail');

const url = "https://api.netease.im/sms/sendcode.action";

function sendSMS(message) {
    let appSecret = config.sms.appSecret;
    let timestamp = Math.ceil(Date.now() / 1000);
    let nonce = Math.random().toString();
    let token = config.wechat.token;
    var list = [appSecret, nonce, timestamp];
    console.log(list);
    let raw = list[0] + list[1] + list[2];
    console.log(raw);
    var sha1 = crypto.createHash('sha1');
    sha1.update(raw);
    let signature = sha1.digest('hex');
    console.log(signature);

    superagent.post(url)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .set('AppKey',config.sms.appKey)
    .set('CurTime',timestamp)
    .set('Nonce',nonce)
    .set('CheckSum',signature)
    .send('mobile=18918685093&code=9999')
    .end(function (err, res) {
        // 抛错拦截
        if (err) {
            //return throw Error(err);
        }
        // res.text 包含未解析前的响应内容
        console.log(res.text);
        let resJson = JSON.parse(tes.text);
        if(resJson.code == 200){
            console.log('send SMS ok.');
        } else {
            mail.sendMail('发送BTS提醒短信失败');
        }

    });
}
exports.sendSMS = sendSMS;
/* sendSMS(); */