var express = require('express');
var cheerio = require('cheerio');
var request = require("superagent");
var charsetCompoent = require('superagent-charset');
var superagent = charsetCompoent(request);

var app = express();

app.use(function (req, res, next) {
  console.log(req.method,req.url);
  next();
})

app.get('/', function(req, res, next) {
  var browserAgent = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36',
  }
  var startTime = new Date();
  var url = req.query.url || 'http://www.shuyue.cc/';
  superagent.set(browserAgent).head(url).end(function(err, sres) {
    var endGetHeadTime = new Date();
    console.log("get [%s] head cost time %ds", url,(endGetHeadTime - startTime) / 1000)
    if (err) {
      return next(err);
    }
    var contentType = sres.header['content-type'];
    var characters = contentType.match(/charset=([\w]+)$/)[1] || "utf-8";

    superagent.set(browserAgent).get(url).charset(characters)
      .end(function(err, sres) {
        if (err) {
          return next(err);
        }
        var endGetPageTime = new Date();
        console.log("get[%s] page cost time %ds", url,(endGetPageTime - endGetHeadTime) / 1000)
        var $ = cheerio.load(sres.text);
        var items = [];
        $('table td.xt>a').each(function(idx, element) {
          var $element = $(element);
          items.push({
            text: $element.text(),
            href: $element.attr('href')
          });
        });
        res.send(items);
      })
  })
});


var server = app.listen(3003, function() {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Scraw App listening at http://%s:%s', host, port);
});