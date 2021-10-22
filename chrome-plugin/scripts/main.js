var receiveURL = "";
var accountList = ""; //获取账号列表接口
var selfbuildResumeSiteList = []; //网站列表
var md5 = null;

//加载config.js中的配置信息
$.ajaxSetup({ async: false, cache: false });

$.getScript("/scripts/config.js", function () {
  receiveURL = receiveUrl;
  accountList = accountList;
});

$.getScript("/scripts/md5.js", function () {
  md5 = hex_md5;
});

$.getScript("/scripts/resumeSiteList.js", function () {
  selfbuildResumeSiteList = buildResumeSiteList.filter(function (v, i) {
    return v.subName == "智联招聘";
  });
});

$.ajaxSetup({ async: true });

(function ($) {
  "use strict";

  var app = angular.module("jd_util", ["ui.bootstrap"]);

  app.value("loginStatus", false);

  app
    .factory(
      "resumeSiteService",
      function ($http, $q, $window, $timeout, loginStatus) {
        return {
          //设置本地内存中的登录状态
          updateLoginStatus: function (cache) {
            loginStatus = cache;
          },

          //取得登录状态
          getLoginStatus: function () {
            return loginStatus;
          },
          //获取账号列表接口
          getAccountList: function () {
            return accountList;
          },

          //退出方法
          logout: function () {
            var deferred = $q.defer();
            $timeout(function () {
              deferred.resolve(true);
            }, 500);
            return deferred.promise;
          },
        };
      }
    )
    .controller(
      "resumeSiteController",
      function (
        $scope,
        $http,
        $timeout,
        $interval,
        $window,
        resumeSiteService
      ) {
        $scope.accountList = resumeSiteService.getAccountList();
        $scope.version = chrome.app.getDetails().version;
        $scope.resumeSiteList = []; //网站列表
        $scope.resumeSiteAccountList = {}; //账号列表

        //更改登录状态，请求网站列表
        var validateSession = function () {
          $timeout(function () {
            updateLoginStatus(true);
          }, 500);
        };
        validateSession();

        //更新插件的登录状态
        var updateLoginStatus = function (login) {
          resumeSiteService.updateLoginStatus(login);
          if (login) {
            buildResumeSiteList();
          } else {
            $scope.resumeSiteAccountList = {};
            window.location.href = "login.html";
          }
          $scope.logoutButton.title = login ? "注销" : "关闭";
          $scope.logoutButton.close = !login;
          $scope.alerts = [];
        };

        //构建网站列表信息
        var buildResumeSiteList = function () {
          if (selfbuildResumeSiteList.length) {
            angular.forEach(selfbuildResumeSiteList, function (item) {
              var resumeSite = {
                title: item.subName,
                url: item.remark,
                siteTypeCd: item.subCd,
              };
              $scope.resumeSiteList.push(resumeSite);
            });
            buildResumeSiteAccountList();
          } else {
            $scope.resumeSiteList = [];
          }
        };

        //构建网站账号列表信息
        var buildResumeSiteAccountList = function (siteTypeCd) {
          let data = {
            time: Date.parse(new Date()),
            sign: md5(
              Date.parse(new Date()) +
                md5("api-headhunter-opt-key").toUpperCase()
            ).toUpperCase(),
            channel_type: "01",
          };
          $.ajax({
            url: $scope.accountList,
            data: data,
            cache: false,
            type: "POST",
            success: function (res) {
              if (res.code == 200 && res.data && res.data.length) {
                const resumeSiteAccountList = res.data;
                angular.forEach(resumeSiteAccountList, function (obj) {
                  if ($scope.resumeSiteAccountList[obj.siteTypeCd]) {
                    $scope.resumeSiteAccountList[obj.siteTypeCd].push(obj);
                  } else {
                    $scope.resumeSiteAccountList[obj.siteTypeCd] = [obj];
                  }
                });
              }
              $scope.$apply();
            },
            error: function () {
              sendResponse({ code: -1, msg: "获取账号信息失败" });
            },
          });
        };

        //登录第三方招聘网站前的校验处理
        //  resumeSite：第三方网站实体对象
        //  resumeSiteAccount：第三方网站登录账号实体对象
        $scope.validateResumeSiteLogin = function (
          resumeSite,
          resumeSiteAccount,
          fedBackType
        ) {
          if (resumeSite.siteTypeCd != "01" && fedBackType > 0) {
            $scope.alert("只有智联招聘支持反馈。");
            return;
          } else {
            chrome.storage.sync.get("options", function (item) {
              $scope.options = item.options || {};
              $scope.options["fedBackType"] = fedBackType;
              chrome.storage.sync.set($scope.options);
            });
          }
          //验证是否设置时间段
          //目前智联（01），58（03）选择验证时间段
          if (
            resumeSite.siteTypeCd == "01" ||
            resumeSite.siteTypeCd == "03" ||
            resumeSite.siteTypeCd == "07" ||
            resumeSite.siteTypeCd == "08" ||
            resumeSite.siteTypeCd == "09"
          ) {
            chrome.storage.sync.get("options", function (item) {
              if (
                typeof item.options == "undefined" ||
                typeof item.options[resumeSite.siteTypeCd] == "undefined" ||
                item.options[resumeSite.siteTypeCd]["dateScope"] == null
              ) {
                $scope.alert("请设置时间段。");
              } else {
                resumeSiteLogin(resumeSite, resumeSiteAccount);
              }
            });
          } else {
            resumeSiteLogin(resumeSite, resumeSiteAccount);
          }
        };

        //登录第三方招聘网站
        function resumeSiteLogin(resumeSite, resumeSiteAccount) {
          chrome.runtime.sendMessage(
            {
              jd: "openURL",
              url: resumeSite.url,
              siteTypeCd: resumeSite.siteTypeCd,
              siteAccountInfo: {
                version: $scope.version, //版本
                resumeSiteUid: resumeSiteAccount.doumi_user_id, //账号的uid
                siteLoginAccount: resumeSiteAccount.account, //账号
                siteLoginPassword: "", //密码
                siteVipName: resumeSiteAccount.account_name, //网站vip名称
                receiveURL: receiveURL, //接受简历的url
                saveToDb: resumeSiteAccount.saveToDb || 1,
                siteTypeCd: resumeSite.siteTypeCd, //账号类型 01：智联
                siteSecurityPolicy: resumeSiteAccount.securityPolicy || "",
              },
            },
            function (response) {
              if (response.msg) {
                $scope.alerts[0] = { msg: response.msg, type: "danger" };
              } else {
              }
              $scope.$apply();
            }
          );
        }

        $scope.alerts = [];
        // 消息方法
        $scope.alert = function (msg, type) {
          $scope.alerts[0] = { msg: msg, type: type };
        };

        //关闭消息方法
        $scope.closeAlert = function (index) {
          $scope.alerts.splice(index, 1);
        };

        //登录按钮属性定义
        $scope.logoutButton = {
          close: !resumeSiteService.getLoginStatus(),
          title: resumeSiteService.getLoginStatus() ? "注销" : "关闭",
        };

        //退出登录方法
        $scope.logout = function () {
          resumeSiteService.logout().then(function (res) {
            if (res) {
              updateLoginStatus(false);
            }
          });
        };

        //获取插件 选项设置的内容
        chrome.storage.sync.get("options", function (item) {
          $scope.options = item.options || {};
        });

        //插件 选项设置的内容
        //作用：存储插件时间的设置
        $scope.setOption = function (resumeSite, value) {
          var siteTypeCd = resumeSite.siteTypeCd;
          if ($scope.options == null || $scope.options == "undefined") {
            $scope.options = {};
          }

          if (
            $scope.options[siteTypeCd] == null ||
            $scope.options[siteTypeCd] == "undefined"
          ) {
            $scope.options[siteTypeCd] = {};
          }

          $scope.options[siteTypeCd]["dateScopeTime"] = moment()
            .subtract(value - 1, "days")
            .format("YYYY/MM/DD");
          $scope.options[siteTypeCd]["dateScope"] = value;

          chrome.storage.sync.set($scope.options);
          $scope.alerts[0] = {
            msg:
              resumeSite.title + "简历下载时间区间设置为" + value + "日内完成",
            siteTypeCd: "success",
          };

          chrome.storage.sync.get("options", function (item) {
            item.options = $scope.options;
            chrome.storage.sync.set(item);
          });
        };
      }
    );
  angular.bootstrap(document, ["jd_util"]);
})(jQuery);
