'use strict';
exports.config = {
	baseDomain: "http://www.shuyue.cc/",
	browserAgent: {
		"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2810.2 Safari/537.36"
	},
	qidianSearchUrl: "http://se.qidian.com/",
	aoshiNovel: "http://www.23zw.com/SearchNovel/",
	bookSites: [{
		name: "起点",
		baseDomain: "http://www.qidian.com",
		searchPage: "http://se.qidian.com/",
		searchMethod: "GET",
		searchQuery: "type=xx&key={key}",
		listPage: "",
		detailPage: "",
		listPageCharpterSelect: "",
		detailPageContentSelect: "",
	}, {
		name: "舒阅",
		baseDomain: "http://www.shuyue.cc/",
		searchPage: "http://www.shuyue.cc/Search.aspx",
		searchMethod: "GET",
		searchQuery: "BookName={key}",
		searchKeyCode: "gb2312",
		listPage: "",
		detailPage: "",
		listPageCharpterSelect: "",
		detailPageContentSelect: "",
	}, {
		name: "傲世中文",
		baseDomain: "http://www.23zw.com",
		searchPage: "http://www.23zw.com/SearchNovel/",
		searchMethod: "GET",
		searchQuery: "t=articlename&k={key}",
		searchKeyCode: "gb2312",
		listPage: "",
		detailPage: "",
		listPageCharpterSelect: "",
		detailPageContentSelect: "",
	}, {
		name: "大家读书院",
		baseDomain: "http://www.dajiadu.net/",
		searchPage: "http://www.dajiadu.net/modules/article/searchab.php",
		searchMethod: "POST",
		searchQuery: "searchtype=articlename&searchkey={key}Submit=+%CB%D1+%CB%F7+",
		searchKeyCode: "gb2312",
		listPage: "",
		detailPage: "",
		listPageCharpterSelect: "",
		detailPageContentSelect: "",
	}, {
		name: "书迷楼",
		baseDomain: "http://www.shumilou.co/",
		searchPage: "http://www.shumilou.co/search.php",
		searchMethod: "GET",
		searchQuery: "skey={key}&sbt=搜索",
		listPage: "",
		detailPage: "",
		listPageCharpterSelect: "",
		detailPageContentSelect: "",
	}, {
		name: "飘天文学",
		baseDomain: "http://www.piaotian.net/",
		searchPage: "http://www.shumilou.co/search.php",
		searchMethod: "GET",
		searchQuery: "skey={key}&sbt=搜索",
		listPage: "",
		detailPage: "",
		listPageCharpterSelect: "",
		detailPageContentSelect: "",
	}, {
		name: "长风文学",
		baseDomain: "http://www.cfwx.net/",
		searchPage: "http://www.cfwx.net/modules/article/search.php",
		searchMethod: "GET",
		searchQuery: "searchkey={key}&searchtype=articlename",
		searchKeyCode: "gbk",
		listPage: "",
		detailPage: "",
		listPageCharpterSelect: "",
		detailPageContentSelect: "",
	}]
}