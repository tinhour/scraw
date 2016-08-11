'Use strict';
var express = require('express');
var cheerio = require('cheerio');
var request = require("superagent");
var charsetCompoent = require('superagent-charset');
var superagent = charsetCompoent(request);
var iconv = require('iconv-lite');

var browserAgent = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2810.2 Safari/537.36',
}
var app = express();

app.use(function(req, res, next) {
  console.log(req.method, req.url);
  next();
})

app.get('/', function(req, res) {
  var usage = `<a href="/latestUpdate">/latestUpdate</a>
  <br/>
<a href="/searchBook?key=雪鹰领主">/searchBook?key=雪鹰领主</a>
  `
  res.send(usage);
})

app.get('/latestUpdate', function(req, res, next) {
  var url = req.query.url || 'http://www.shuyue.cc/';
  getPageContent(url, function(err, sres) {
    if (err) {
      res.send(err)
    } else {
      var r = analyseResult(sres.text)
      res.send(r);
    }
  })
});

app.get('/searchBook', function(req, res, next) {
  var key = req.query.key;
  Log("Serchkey", key)
  searchBook(key, function(err, sres) {
    if (err) {
      res.send(err)
    } else {
      var r = analyseResult(sres.text)
      res.send(r);
    }
  })
});

function Log(argument) {
  console.log.apply(this, arguments)
}

function getPageContent(url, callback) {
  var startTime = new Date();
  superagent.head(url).set(browserAgent).end(function(err, sres) {
    var endGetHeadTime = new Date();
    Log("get [%s] head cost time %ds", url, (endGetHeadTime - startTime) / 1000)
    if (err) {
      return callback(err);
    }
    var contentType = sres.header['content-type'];
    var characters = contentType.match(/charset=([\w]+)$/)[1] || "utf-8";
    superagent.get(url).set(browserAgent).charset(characters)
      .end(function(err, sres) {
        if (err) {
          return callback(err);
        }
        var endGetPageTime = new Date();
        Log("get[%s] page cost time %ds", url, (endGetPageTime - endGetHeadTime) / 1000)
        callback(null, sres)
      })
  })
}

function searchBook(key, callback) {
  var startTime = new Date();
  var url = 'http://www.shuyue.cc/Search.aspx';
  var buf = iconv.encode(key, 'gb2312');
    var changedKey = "";
    for (var i = 0; i < buf.length; i++) {
      changedKey += '%' + buf[i].toString(16)
    }
    superagent.post(url).set(browserAgent).set({
      "Content-Type": "application/x-www-form-urlencoded"
    }).send('BookName=' + changedKey).charset("gb2312")
    .end(function(err, sres) {
      if (err) {
        return callback(err);
      }
      var endGetPageTime = new Date();
      Log("post [%s] page cost time %ds", url, (endGetPageTime - startTime) / 1000)
      callback(null, sres)
    })  
}

function analyseResult(html) {
  var $ = cheerio.load(html);
  var containTable = null;
  var result = []
  Log($("body").text())
  $('table').each(function(idx, element) {
    var tableText = $(element).text();
    if (/最新章节/.test(tableText) && /更新时间/.test(tableText)) {
      containTable = element;
      return;
    }
  })
  if (containTable) {
    $(containTable).children("tr").each(function(i, element) {
      var tdEle = $(element).children("td");
      var item = {
        name: $(tdEle).eq(0).text().trim(),
        link: $(tdEle).eq(0).children("a").attr("href"),
        newsPost: $(tdEle).eq(1).text().trim(),
        updateTie: $(tdEle).eq(2).text().trim()
      }
      result.push(item);
    })
    return {
      data: result
    }
  } else {
    return {
      error: "no result"
    }
  }
}

var server = app.listen(3003, function() {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Scraw App listening at http://%s:%s', host, port);
});