'use strict';
const http = require('http');
const express = require('express');
const app = express();
const _ = require('lodash');
const crypto = require('crypto');
const config = require('./config.json');
const mongoUtils = require('./tools/mongo');
const fs = require('fs');
const path = require('path');
const common = require('./tools/common');
const logger = common.getLogger('notify main');

//后台轮询差价
const margin = require('./margin');
//后台拼接价格对
const join = require('./tools/join.js');

//markets
const zbMarket = require('./markets/zb');
const btsMarket = require('./markets/bts');
const aexMarket = require('./markets/aex');
const bigOneMarket = require('./markets/bigone');
const poloniexMarket = require('./markets/poloniex');


/* app.options('*', cors());
app.use(cors());
//support parsing of application/json type post data
app.use(bodyParser.json());
//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({
  extended: false
})); */

/* app.use(function (req, res, next) {
  //console.log(req);
  next();
});
 */

//静态资源
app.use(express.static(path.join(__dirname, 'public')));


var server = http.createServer(app).listen(config.server.port, function () { });
console.log('start on:' + config.server.port);
server.timeout = 240000;

app.get('/test', (req, res) => {
  res.end('hello');
});

app.get('/watch/:token', (req, res) => {
  let token = req.params.token;
  var promises = [];
  var list = config.market[token];
  for (let i = 0; i < list.length; i++) {
    promises.push(mongoUtils.getPair(list[i], token, "BitCNY"));
  }
  Promise.all(promises)
    .then((docs) => {
      //为前端访问
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.json(docs);
    })
});

app.get('/margin/:token', (req, res) => {
  let token = req.params.token;
  logger.info(token);
  var promises = [];
  var list = config.market[token];
  for (let i = 0; i < list.length; i++) {
    for (let j = 0; j < list.length; j++) {
      if (i == j) {
        continue;
      }
      promises.push(mongoUtils.getMargin(list[i], list[j], token));
    }
  }
  Promise.all(promises)
    .then((docs) => {
      //为前端访问
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.json(docs);
    })
});

//微信验证端口
app.get('/', (req, res) => {
  console.log('torched.');
  let signature = req.query.signature;
  let echostr = req.query.echostr;
  let timestamp = req.query.timestamp;
  let nonce = req.query.nonce;
  let token = config.wechat.token;
  var list = [token, timestamp, nonce];
  console.log(list);
  //对数组进行ascii排序
  list = _.sortBy(list, [function (o) { return o; }]);
  console.log(list);
  let raw = list[0] + list[1] + list[2];
  console.log(raw);
  var sha1 = crypto.createHash('sha1');
  sha1.update(raw);
  let local_signature = sha1.digest('hex');
  console.log(signature);
  console.log(local_signature);
  if (local_signature == signature) {
    res.end(echostr);
  }
  res.end('');
});

//微信用户回复接口
app.post('/', (req, res) => {
  //console.log('POST');
  let ToUserName = req.query.openid;//  是      接收方帐号（收到的OpenID）
  let FromUserName = config.wechat.account;//是     开发者微信号
  let CreateTime = 1513926999;//Date.now()/1000; //     是      消息创建时间 （整型）
  let MsgType = 'text';//是     text

  let pairs = price.pairs;
  let Content = price.getText();

  let tmpStr = '<xml><ToUserName><![CDATA[' + ToUserName + ']]></ToUserName><FromUserName><![CDATA[' + FromUserName + ']]></FromUserName><CreateTime>' + CreateTime + '</CreateTime><MsgType><![CDATA[text]]></MsgType><Content><![CDATA[' + Content + ']]></Content></xml>';
  console.log(tmpStr);
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(tmpStr);
});
