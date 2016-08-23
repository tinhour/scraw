'use strict';
var express = require('express');
var cheerio = require('cheerio');
var request = require("superagent");
var charsetCompoent = require('superagent-charset');
var superagent = charsetCompoent(request);
var iconv = require('iconv-lite');
var async = require('async');
var Log = require('./log.js').Log;
var config = require('./config').config;
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
                  display: block;
              }</style>
     <h4>usage:</h4>
     <a href="/latestUpdate">/latestUpdate</a>
     <a href="/searchBookAsync?key=雪鹰领主">/searchBookAsync?key=雪鹰领主</a>
     <a href="/searchBook?key=光脑武尊">/searchBook?key=光脑武尊</a>
     <a href="/searchBook?key=光脑">/searchBook?key=光脑</a>
     <a href="/searchBookFromqidian?bookName=雪鹰领主">/searchBookFromqidain?bookName=雪鹰领主</a>
     <a href="/searchBookFromCfwx?bookName=光脑武尊">/searchBookFromqidain?bookName=光脑武尊</a>
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

//search book from guangwang qidian/shumeng/zhuyue
//search this book from outsie novel site

app.get("/searchBookFromqidian",function(req,res,next){
  var bookName = req.query.bookName;
  searchBook_qidian(bookName,function(err,r){
    res.send(err||r)
  })
})

app.get('/searchBook', function(req, res, next) {
  var bookName = req.query.key;
  Log("Serchkey", bookName);
  searchBook_all(bookName,processSearchResult)

  function processSearchResult(err,result){
    //res.send(err)
    res.send(err||result)
  }
})

function searchBook_all(bookName, callback) {
  async.each(config.bookSites, _searchBook, function(err) {
    callback(err ,config.bookSites)

  });
  function _searchBook(booksite, callback) {
    var startTime = new Date();
    var searchPage = booksite.searchPage;
    var method = booksite.searchMethod;
    var charset = booksite.searchKeyCode || "utf-8";
    var searchQuery = booksite.searchQuery;
    var buf = iconv.encode(bookName, charset);
    var decodeSearchKey = "";
    for (var j = 0; j < buf.length; j++) {
      decodeSearchKey += '%' + buf[j].toString(16)
    }
    searchQuery = searchQuery.replace(/{key}/, decodeSearchKey);
    superagent[method.toLowerCase()](searchPage)
      .send(searchQuery).set(browserAgent)
      .end(function(err, sres) {
        if (err) {
          err.myInfo = "search [" + bookName + "] at [" + searchPage + "] failed!"
          return callback(err);
        }
        var endGetPageTime = new Date();
        Log("[%s] %s cost %ds", method, searchPage, (endGetPageTime - startTime) / 1000)
        booksite.searchResult = sres;
        callback(null, bookName, sres)
      });
  }
}

function searchBook_qidian(bookName,callback){
  //http://se.qidian.com/?kw=%E7%A7%91%E6%8A%80%E4%B9%8B%E9%97%A8
  var url= config.qidianSearchUrl+"?kw="+bookName;
  getPageContent(url, function(err, sres) {
    if (err) {
      callback(err)
    } else {
      var $ = cheerio.load(sres.text);
      var r=$("#result-list li").html();
      var bookItem=analyse_qidianSearchResult(bookName,sres.text);
      if(bookItem.length ==1){
        
        getMenuPage_qidian(bookItem[0].firstPageLink,function(err,r){
          for(var i in r){
            bookItem[0][i]=r[i];
          }
          //callback(bookItem)
          getMenu_qidian(r[i],function(err,r){
            for(var i in r){
              bookItem[0][i]=r[i];
            }
            callback(bookItem)
          })
        })
      }else{
        callback(null,bookItem);
      }
    }
  })
}

function analyse_qidianSearchResult(bookName,html){
  var $ = cheerio.load(html);
  var li=$("#result-list li");
  var r=[]
  for(var i=0;i<li.length;i++){
    var item=li[i],thisBookName=$(item).find("h4>a").text().trim();
    r.push({
    firstPageLink:$(item).find("h4>a").attr("href"),
    bookName:thisBookName,
    author:$(item).find(".author>a.name").text().trim(),
    type:$(item).find(".author>a").eq(1).text().trim(),
    status:$(item).find(".author>span").text().trim(),
    subject:$(item).find(".intro").text().trim(),
    latestUpdate:$(item).find(".update>a").text().replace(/最新更新\s*/,"").trim(),
    latestUpdateTime:$(item).find(".update>span").text().trim()
    })
    if(thisBookName == bookName) break;
  }
  return r;
}

function getMenuPage_qidian(firstPageUrl,callback){
  getPageContent(firstPageUrl, function(err, sres) {
    if (err) {
      callback(err)
    } else {
      var $ = cheerio.load(sres.text);
      var a=$("div.book_pic div.opt li>a").eq(0)
      if(a.text().trim()=="点击阅读"){
        callback(null,{menuUrl:a.attr("href")}) 
      }else{
        callback({error:"没有找到点击阅读by $(\"div.book_pic div.opt li>a\")"})
      }
    }
  })
}

function getMenu_qidian(menuPageUrl,callback){
  getPageContent(menuPageUrl, function(err, sres) {
    if (err) {
      callback(err)
    } else {
      var $ = cheerio.load(sres.text);
      var lis=$("#content li");
      var articleTitle=[];
      for(var i=0;i<lis.length;i++){
        var item=$(lis[i])
        var article={chapterTitle:item.text()}
        articleTitle.push(item.text())
      }
      if(articleTitle.length>0){
         callback(null,{articleTitle:articleTitle})
      }else{
        callback({error:"没有找到目录by $(\"#content li\") at:"+menuPageUrl})
      }
    }
  })
}

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