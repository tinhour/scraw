'Use strict';
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
var baseDomain= config.baseDomain;
var app = express();

app.use(function(req, res, next) {
  Log(req.method, req.url);
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
      var r = analyseListPage(sres.text)
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
      var r = analyseListPage(sres.text);
      var thisList;
      if (r.data) {
        for (var i in r.data) {
          if (r.data[i].name == key && r.data[i].link) {
            thisList = r.data[i];
            break;
          }
        }
      }
      Log("searchResult", thisList)
      if (!thisList) {
        res.send({
          error: "未找到书本:《" + key + "》"
        })
      } else {
        //todo get thisList.link to get the result list
        var pageListLink = baseDomain + thisList.link;
        getPageContent(pageListLink, function(err, sres) {
            if (err) {
              res.send(err)
            } else {
              var r = analyseItemPage(sres.text);
              //res.send(r);
              //console.log("get analyseItemPage",r)
              //todo goto artilce page ViewBook.aspx
              if (r && r.data && r.data.length > 2) {
                //todo analyse all links now just get first as newspost
                //TODO: use asyn to get corect page.
                var pageDetailLink = baseDomain + r.data[1].link;
                getPageContent(pageDetailLink, function(err, sres) {
                  if (err) {
                    res.send(err)
                  } else {
                    //todo anlaylise 
                    //Log("detail", sres.text);
                   var targetSrc= analyseContentPage(sres.text)
                     Log("targetSrc",targetSrc)
                     if(targetSrc.error){
                        res.send(targetSrc)
                     }else{
                        getPageContent(targetSrc.data,function (err,sres) {
                          if(err){
                            res.send(err)
                          }else{
                            // Log("true html:",sres.text)
                            //res.send(sres.text)
                            //todo anlayse true text
                            //content
                            var r=analyseArticleContent(sres.text)
                            r.artilceName=key;
                            res.send(r);
                          }
                        })
                     }
                  }
                })
              } else {
                res.send({
                  error: "没有章节:" + key + ""
                })
              }
            }
          })
          //res.send(thisList);
      }
    }
  })
});
function getPageContent(url, callback) {
  var startTime = new Date();
  superagent.get(url).set(browserAgent).charset()
      .end(function(err, sres) {
        if (err) {
          Log("getPageContent [%s] error: %s",url,err)
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
        return callback(err);
      }
      var endGetPageTime = new Date();
      Log("post [%s] page cost time %ds", url, (endGetPageTime - startTime) / 1000)
      callback(null, sres)
    })  
}

function analyseListPage(html) {
  var $ = cheerio.load(html);
  var containTable = null;
  var result = []
  for(var idx=0;idx<$('table').length;idx++){
    var element=$('table')[idx]
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
  for(var idx=0;idx<$('table').length;idx++){
    var element=$('table')[idx]
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
  var targetSrc=$("frame[src^='http']").attr("src");
  if(!targetSrc){
    return {
        error: "no frame contains main"
      }
  }else{
    return {
        data: targetSrc
      }
  }
}

function analyseArticleContent(html) {
  var $ = cheerio.load(html);
  var content = $("[id*='content']");
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