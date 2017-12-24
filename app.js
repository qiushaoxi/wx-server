'use strict';
var http = require('http');
var express = require('express');
var app = express();
var _ = require('lodash');
var crypto = require('crypto');
var price = require('./price.js');

/* app.options('*', cors());
app.use(cors());
//support parsing of application/json type post data
app.use(bodyParser.json());
//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({
  extended: false
})); */

app.use(function (req, res, next) {
  console.log(req);
  next();
});

var server = http.createServer(app).listen(80, function () { });
console.log('start');
server.timeout = 240000;

app.get('/test', (req, res) => {
  res.end('hello');
});

//微信验证端口
app.get('/', (req, res) => {
  console.log('torched.');
  let signature = req.query.signature;
  let echostr = req.query.echostr;
  let timestamp = req.query.timestamp;
  let nonce = req.query.nonce;
  let token = 'bts123';
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
  console.log('POST');
  let ToUserName = req.query.openid;//  是      接收方帐号（收到的OpenID）
  let FromUserName = 'gh_5650e9dd3c1c';//是     开发者微信号
  let CreateTime = 1513926999;//Date.now()/1000; //     是      消息创建时间 （整型）
  let MsgType = 'text';//是     text

  let pairs = price.pairs;
  let Content = "BTS 各市场价格\n";
  for(i=0;i<pairs.length;i++){
    Content += pairs[i].market+":\nbuy : " + pairs[i].buyPrice.toFixed(4) + " sell: " + pairs[i].sellPrice.toFixed(4);
  }

  let tmpStr = '<xml><ToUserName><![CDATA[' + ToUserName + ']]></ToUserName><FromUserName><![CDATA[' + FromUserName + ']]></FromUserName><CreateTime>' + CreateTime + '</CreateTime><MsgType><![CDATA[text]]></MsgType><Content><![CDATA[' + Content + ']]></Content></xml>';
  console.log(tmpStr);
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(tmpStr);
});
