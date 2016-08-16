'use strict';
var express = require('express');
var cheerio = require('cheerio');
var request = require("superagent");
var charsetCompoent = require('superagent-charset');
var superagent = charsetCompoent(request);
var iconv = require('iconv-lite');
var async = require('async');
var Log = require('./log.js').Log;
var config = require('./config');
var browserAgent = config.browserAgent;
var baseDomain = config.baseDomain;
var app = express();

app.use(function(req, res, next) {
  Log(req.method, req.url);
  next();
})

app.get('/', function(req, res) {
  var usage = `<style>
              a {
                  text-decoration: none;
                  line-height: 1.5em;
                  padding-left: 1em;
                  display: block;
              }</style>
     <a href="/latestUpdate">/latestUpdate3</a>
     <a href="/searchBookAsync?key=雪鹰领主">/searchBookAsync?key=雪鹰领主</a>
  `
  res.send(usage);
})

app.get('/latestUpdate', function(req, res, next) {
  var url = req.query.url || 'http://www.shuyue.cc/';
  getPageContent(url, function(err, sres) {
    if (err) {
      res.send(err)
    } else {
      var r = analyseListPage(sres.text)
      res.send(r);
    }
  })
});

function getBookListItem(bookName, list) {
  var thisItem;
  if (list && list.data) {
    for (var i in list.data) {
      if (list.data[i].name == bookName && list.data[i].link) {
        thisItem = list.data[i];
        break;
      }
    }
  }
  return thisItem;
}

app.get('/searchBookAsync', function(req, res, next) {
  var bookName = req.query.key;
  Log("Serchkey", bookName);
  async.waterfall([
    function(callback) {
      searchBook(bookName, callback);
    },
    function(bookName, sres, callback) {
      searchBookResultProcess(bookName, sres, callback);
    },
    function(bookName, listLink, callback) {
      getItemList(bookName, listLink, callback)
    },
    function(bookName, r, callback) {
      async.doUntil(
        function(callback) {
          if (r && r.data && r.data.length > 2) {
            var item = r.data.splice(1, 1);
            if (!item) {
              callback({
                error: "所有章节出错:" + bookName + ""
              })
            } else {
              getArticlContent(bookName, item[0].name, baseDomain + item[0].link, callback)
            }
          } else {
            callback({
              error: "没有章节:" + bookName + ""
            })
          }
        },
        function(result) {
          return !!result.data
        },
        function(err, d) {
          callback(err, d)
        }
      )
    }
  ], function(err, result) {
    if (err) {
      res.send(err)
    } else {
      res.send(result)
    }

  });
})

function getPageContent(url, callback) {
  var startTime = new Date();
  superagent.get(url).set(browserAgent).charset()
    .end(function(err, sres) {
      if (err) {
        Log("getPageContent [%s] error: %s", url, err)
        return callback(err);
      }
      var endGetPageTime = new Date();
      Log("get [%s] page cost time %ds", url, (endGetPageTime - startTime) / 1000)
      callback(null, sres)
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
        err.myInfo = "search failed!"
        return callback(err);
      }
      var endGetPageTime = new Date();
      Log("post [%s] page cost time %ds", url, (endGetPageTime - startTime) / 1000)
      callback(null, key, sres)
    })
}

function searchBookResultProcess(bookName, sres, callback) {
  var r = analyseListPage(sres.text);
  var thisList = getBookListItem(bookName, r);
  Log("searchResult", thisList)
  if (!thisList) {
    callback({
      error: "未找到书本:《" + bookName + "》"
    })
  } else {
    callback(null, bookName, thisList)
  }
}

function getItemList(bookName, listLink, callback) {
  var pageListLink = baseDomain + listLink.link;
  getPageContent(pageListLink, function(err, sres) {
    if (err) {
      callback(err)
    } else {
      var r = analyseItemPage(sres.text);
      callback(null, bookName, r)
    }
  })
}

function getArticlContent(bookName, articleTitle, src, callback) {
  getPageContent(src, function(err, sres) {
    if (err) {
      callback(err)
    } else {
      var targetSrc = analyseContentPage(sres.text)
      Log("targetSrc", targetSrc)
      if (targetSrc.error) {
        callback(null, targetSrc)
      } else {
        getPageContent(targetSrc.data, function(err, sres) {
          if (err) {
            callback(null, err)
          } else {
            var r = analyseArticleContent(sres.text)
            r.bookName = bookName;
            r.artilceTitle = articleTitle;
            callback(null, r);
          }
        })
      }
    }
  })
}

function analyseListPage(html) {
  var $ = cheerio.load(html);
  var containTable = null;
  var result = []
  for (var idx = 0; idx < $('table').length; idx++) {
    var element = $('table')[idx]
    var tableText = $(element).text();
    if (/更新时间/.test(tableText)) {
      containTable = element;
      break;
    }
  }
  // Log("contain>table",$(containTable).text())
  if (containTable) {
    $(containTable).children("tr").each(function(i, element) {
      var tdEle = $(element).children("td");
      var item = {
        name: $(tdEle).eq(0).text().trim(),
        link: $(tdEle).eq(1).children("a").attr("href"),
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

function analyseItemPage(html) {
  var $ = cheerio.load(html);
  var containTable = null;
  var result = []
  for (var idx = 0; idx < $('table').length; idx++) {
    var element = $('table')[idx]
    var tableText = $(element).text();
    if (/更新时间/.test(tableText)) {
      containTable = element;
      break;
    }
  }
  // Log($("containTable").text())
  if (containTable) {
    $(containTable).children("tr").each(function(i, element) {
      var tdEle = $(element).children("td");
      var item = {
        link: $(tdEle).eq(0).children("a").attr("href"),
        name: $(tdEle).eq(0).text().trim(),
        updateTie: $(tdEle).eq(3).text().trim()
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

function analyseContentPage(html) {
  var $ = cheerio.load(html);
  var targetSrc = $("frame[src^='http']").attr("src");
  if (!targetSrc) {
    return {
      error: "no frame contains main"
    }
  } else {
    return {
      data: targetSrc
    }
  }
}

function analyseArticleContent(html) {
  var $ = cheerio.load(html);
  var content = $("[id*='content']");
  //readercontainer site:m.dajiadu.net
  Log("content length:", content.length)
  if (!content.length) {
    return {
      error: "not found conent"
    }
  } else {
    return {
      data: content.text().trim()
    }
  }
}


var server = app.listen(3003, function() {
  var host = server.address().address;
  var port = server.address().port;
  Log('Scraw App listening at http://%s:%s', host, port);
});