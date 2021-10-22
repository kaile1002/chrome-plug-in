var remoteURL = "";
var md5 = null;
//加载config.js中的配置信息
$.ajaxSetup({ async: false, cache: false });
$.getScript("/scripts/config.js", function () {
  remoteURL = "";
});

$.getScript("/scripts/md5.js", function () {
  console.log("dddddddddddd", hex_md5);
  md5 = hex_md5;
});

$.ajaxSetup({ async: true });

(function ($) {
  "use strict";

  //同步获取登录网站所有的cookies
  function synCookiesAccount(siteAccountInfo) {
    chrome.cookies.getAll(
      {
        domain: siteAccountInfo.domain,
      },
      function (cookies) {
        cookies.siteLoginAccount = siteAccountInfo.siteLoginAccount;
        $.ajax({
          method: "POST",
          url: remoteURL,
          data: $.param(cookies),
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }).success(function () {
          alert("发送成功");
        });
      }
    );
  }

  var config = {
    icon: {
      active: {
        path: {
          19: "../images/icon.png",
          38: "../images/icon.png",
        },
      },
      inactive: {
        path: {
          19: "../images/icon1.png",
          38: "../images/icon1.png",
        },
      },
    },
    mainURL: chrome.extension.getURL("login.html"),
    //激活的插件tabid
    activeIds: [],
    active: false,
    //通过插件tab打开的标签页。(根据type分类)
    activeHRTabIds: {},
    getHRTabIds: function () {
      var hrTabIds = [];
      for (var k in this.activeHRTabIds) {
        hrTabIds.push(this.activeHRTabIds[k]);
      }
      return hrTabIds;
    },
  };

  //构建网站账号信息
  var syncJDAccount = function (siteTypeCd, siteAccountInfo) {
    chrome.storage.sync.get("jdAccount", function (item) {
      if (!item.jdAccount) {
        item.jdAccount = {};
      }

      siteAccountInfo.login = false;
      siteAccountInfo.logout = false;

      item.jdAccount[siteTypeCd] = siteAccountInfo;
      chrome.storage.sync.set(item);
      chrome.storage.sync.get("jdAccount", function (item) {
        console.log('catch',item);
      });
    });
  };
  //更新tab的状态
  var updateTabStatus = function (active, callable) {
    config.active = active;
    if (!active) {
      config.activeIds = [];
      config.activeHRTabIds = {};
      chrome.storage.sync.remove("jdAccount");
    }
    //设置显示的icon图标
    chrome.browserAction.setIcon(
      active ? config.icon.active : config.icon.inactive,
      callable
    );
  };

  updateTabStatus(false);

  //查看智联简历
  setInterval(function () {
    chrome.tabs.query(
      {
        url: "*://rd.zhaopin.com/resumepreview/resume/viewone/*",
        status: "complete",
      },
      function (tabs) {
        if (tabs && tabs.length > 5) {
          for (var i = 0; i < tabs.length; i++) {
            chrome.tabs.remove(tabs[i].id);
          }
        }
      }
    );
  }, 1000);

  chrome.runtime.onMessage.addListener(function (
    request,
    sender,
    sendResponse
  ) {
    console.log("接收信息》》》》", request);
    function createNewTab(request) {
      chrome.tabs.create({ url: request.url }, function (tab) {
        config.activeHRTabIds[String(request.siteTypeCd)] = tab.id;
        syncJDAccount(String(request.siteTypeCd), request.siteAccountInfo);
      });
    }

    if (request.jd === "utilEnable") {
      sendResponse({
        farewell:
          config.active && config.getHRTabIds().indexOf(sender.tab.id) > -1,
      });
    } else if (request.jd === "openURL") {
      var res = {};
      if (config.activeHRTabIds[String(request.siteTypeCd)]) {
        res.msg = "不支持一个浏览器会话登录多个同类型帐号";
      } else {
        if (request.url.indexOf("58.com") > -1) {
          chrome.tabs.create(
            { url: "https://vip.58.com/logout" },
            function (tab) {
              setTimeout(function () {
                chrome.tabs.remove(tab.id);
                createNewTab(request);
              }, 3000);
            }
          );
        } else {
          createNewTab(request);
        }
      }
      sendResponse(res);
    } else if (request.jd === "saveCookie") {
      synCookiesAccount(request.siteAccountInfo);
    } else if (request.jd === "countTabs") {
      //查询是否有加载的查看简历页面
      chrome.tabs.query(
        { url: request.url, status: request.status },
        function (tabs) {
          sendResponse({ result: tabs.length });
        }
      );
    } else if (request.jd === "uploadResume") {
      console.log("通过接口发送数据》》》》");
      let data = {
        time: Date.parse(new Date()),
        sign: md5(
          Date.parse(new Date()) + md5("api-headhunter-opt-key").toUpperCase()
        ).toUpperCase(),
        data_str: request.data.data_str,
        channel_type: request.data.channel_type,
      };
      $.ajax({
        url: request.url,
        data: data,
        cache: false,
        type: "POST",
        success: function (res) {
          sendResponse(res);
        },
        error: function () {
          sendResponse({ code: -1, msg: "简历上传失败。网络问题。" });
        },
      });
    } else if (request.jd === "operationLog") {
      return;
      $.ajax({
        url: request.url,
        data: request.data,
        cache: false,
        type: "POST",
        success: function (res) {
          sendResponse(res);
        },
        error: function () {
          sendResponse({ code: -1, msg: "插件操作日志上传失败。网络问题。" });
        },
      });
    } else if (request.jd === "51jobDownload") {
      var options = request.options;
      var form = request.form;
      var xhr = new XMLHttpRequest();
      xhr.responseType = options.responseType || "text";
      xhr.open(form.type, form.action);
      xhr.onload = function (e) {
        if (this.readyState == 4) {
          var arraybuffer = xhr.response;
          var data = new Uint8Array(arraybuffer);
          var arr = [];
          for (var i = 0; i != data.length; ++i)
            arr[i] = String.fromCharCode(data[i]);
          var arrayString = arr.join("");
          sendResponse({ code: 0, msg: "", data: arrayString });
        } else {
          sendResponse({
            code: -1,
            msg: "简历下载失败:" + JSON.stringify(this.response),
          });
        }
      };
      xhr.onerror = function (ev) {
        sendResponse({
          code: -1,
          msg: "简历下载失败:" + JSON.stringify(this.response),
        });
      };
      var formData;
      if (form.datas) {
        formData = new FormData();
        for (var k in form.datas) {
          var inputParam = form.datas[k];
          formData.append(inputParam.name, inputParam.value);
        }
      }
      if (formData) {
        xhr.send(formData);
      } else {
        xhr.send();
      }
    } else {
      return false;
    }
    //异步
    return true;
  });
  chrome.tabs.onUpdated.addListener(function (tabid, changeInfo, tab) {
    if (tab.url === config.mainURL && config.activeIds.indexOf(tabid) === -1) {
      config.activeIds.push(tabid);
    } else if (
      tab.url.indexOf("cvsehire.51job.com") > -1 &&
      tab.status === "complete"
    ) {
      chrome.tabs.sendMessage(
        tab.id,
        { action: "processForm" },
        function (res) {
          chrome.tabs.remove(tab.id);
          delete config.closeTab;
          //通知前程无忧的简历列表页面下载完成，弹窗已关闭，可以继续操作下去了
          chrome.tabs.sendMessage(config.activeHRTabIds["02"], {
            action: "continue51job",
            form: res.form,
          });
        }
      );
    }
  });

  chrome.tabs.onRemoved.addListener(function (tabid) {
    if (config.activeIds.indexOf(tabid) > -1) {
      updateTabStatus(false, function () {
        window.localStorage.removeItem("login");
      });
    } else {
      for (var id in config.activeHRTabIds) {
        if (config.activeHRTabIds[id] === tabid) {
          delete config.activeHRTabIds[id];
          break;
        }
      }
    }
  });

  chrome.browserAction.onClicked.addListener(function () {
    if (config.active) {
      updateTabStatus(false, function () {
        chrome.runtime.reload();
        chrome.developerPrivate.reload(chrome.runtime.id, {
          failQuietly: true,
        });
      });
    } else {
      updateTabStatus(true, function () {
        chrome.tabs.create({ url: config.mainURL, selected: true });
      });
    }
  });

  chrome.downloads.onCreated.addListener(function (item) {
    var siteTypeCd;
    if (/cvsehire.51job.com\/Download.aspx/.test(item.url)) {
      siteTypeCd = "02";
    }
    if (siteTypeCd && config.active) {
      chrome.downloads.cancel(item.id);
    }
  });
})(jQuery);
