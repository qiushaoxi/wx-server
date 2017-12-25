const crypto = require('crypto');
const config = require('../config.json');
const superagent = require('superagent');
const mail = require('./mail');

const url = "https://api.mysubmail.com/message/xsend.json";

function sendSMS(srcMarket, desMarket, margin) {
    let vars = { "p1": srcMarket, "p2": desMarket, "percent": margin * 100 };
    let sms = config.sms;
    sms.vars = vars;

    superagent.post(url)
        .type('form')
        .send(sms)
        .end(function (err, res) {
            // 抛错拦截
            if (err) {
                //return throw Error(err);
            }
            // res.text 包含未解析前的响应内容
            console.log(res.text);
            let resJson = JSON.parse(res.text);
            /* {
                "status": "success",
                "send_id": "3f95f5daea51433d4ee88f6cf6ce2867",
                "fee": 1,
                "sms_credits": "47"
            } */
            if (resJson.status == "success") {
                console.log('send SMS ok.');
            } else {
                mail.sendMail('发送BTS提醒短信失败');
            }

            if (resJson.sms_credits < 30) {
                mail.sendMail('短信余额小于30');
            }

        });
}
exports.sendSMS = sendSMS;
/* sendSMS("ZB", "inner", 0.3); */