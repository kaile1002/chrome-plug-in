var remoteURL = '';
var receiveURL = '';
var receiveFileURL = '';
var selfbuildResumeSiteList=[];//网站列表
var selfresumeSiteAccountList=[];//网站账号
var md5=null;

//加载config.js中的配置信息
$.ajaxSetup({async: false, cache: false});

$.getScript("/scripts/config.js", function () {
    remoteURL = remoteUrl;
    receiveURL = receiveUrl;
    receiveFileURL = receiveFileUrl;
    
});

$.getScript("/scripts/md5.js", function () {
    md5 = hex_md5;
});

$.getScript("/scripts/resumeSiteList.js", function () {
    selfbuildResumeSiteList = buildResumeSiteList;
    selfresumeSiteAccountList = resumeSiteAccountList;
});

$.ajaxSetup({async: true});

(function ($) {
    'use strict';

    var app = angular.module('jd_util', ['ui.bootstrap']);

    app.value('loginStatus', false);

    app.factory('resumeSiteService', function ($http, $q, $window, loginStatus) {
        return {
            //设置本地内存中的登录状态
            cacheLoginStatus: function (cache) {
                loginStatus = cache;
            },

            //取得登录状态
            getLoginStatus: function () {
                return loginStatus;
            },

            //获取登录地址
            getRemoteURL: function () {
                return remoteURL;
            },

            //退出方法
            logout: function () {
                var deferred = $q.defer();
                $http.post(remoteURL + '/logout', {}).success(function (data) {
                    deferred.resolve(data);
                    window.location.href = "login.html";
                }).error(function (data) {
                    deferred.reject(data);
                });
                return deferred.promise;
            },

            //根据网站类型 获取招聘网站账号信息列表
            getResumeSiteAccountList: function (siteTypeCd) {
                var deferred = $q.defer();
                $http.get(remoteURL + '/rp/resumesite/getResumeSiteAccountList?siteTypeCd=' + (siteTypeCd || '')).success(function (data) {
                    deferred.resolve(data);
                }).error(function (data) {
                    deferred.reject(data);
                });
                return deferred.promise;
            },

            //获取招聘网站信息列表
            getResumeSiteList: function () {
                var deferred = $q.defer();
                $http.get(remoteURL + '/rp/resumesite/getResumeSiteList').success(function (data) {
                    deferred.resolve(data);
                }).error(function (data) {
                    deferred.reject(data);
                });
                return deferred.promise;
            }
        };
    }).controller('resumeSiteController', function ($scope, $http, $timeout, $interval, $window, resumeSiteService) {
            $scope.remoteURL = resumeSiteService.getRemoteURL();
            $scope.version = chrome.app.getDetails().version;
            $scope.newVersion = $scope.version;

            

            //构建网站账号列表信息
            var buildResumeSiteAccountList = function (siteTypeCd) {
                if (selfresumeSiteAccountList.length) {
                    //按各个第三方网站的编号存放各自网站的登录账号
                    $scope.resumeSiteAccountList = [];

                    angular.forEach(selfresumeSiteAccountList, function (obj) {
                        if ($scope.resumeSiteAccountList[obj.siteTypeCd]) {
                            $scope.resumeSiteAccountList[obj.siteTypeCd].push(obj);
                        } else {
                            $scope.resumeSiteAccountList[obj.siteTypeCd] = [obj];
                        }
                    });
                } else {
                    $scope.resumeSiteAccountList = [];
                }
                return;
                resumeSiteService.getResumeSiteAccountList(siteTypeCd).then(function (data) {
                    if (data) {
                        //按各个第三方网站的编号存放各自网站的登录账号
                        $scope.resumeSiteAccountList = [];

                        angular.forEach(data, function (obj) {
                            if ($scope.resumeSiteAccountList[obj.siteTypeCd]) {
                                $scope.resumeSiteAccountList[obj.siteTypeCd].push(obj);
                            } else {
                                $scope.resumeSiteAccountList[obj.siteTypeCd] = [obj];
                            }
                        });
                    } else {
                        $scope.resumeSiteAccountList = [];
                    }
                });
            };

            //构建网站列表信息
            var buildResumeSiteList = function () {
                $scope.resumeSiteList = [];
                if (selfbuildResumeSiteList.length) {
                    angular.forEach(selfbuildResumeSiteList, function (item) {
                        var resumeSite = {title: item.subName, url: item.remark, siteTypeCd: item.subCd};
                        $scope.resumeSiteList.push(resumeSite);
                    });
                }
                console.log('resumeSiteListresumeSiteList',$scope.resumeSiteList);

                buildResumeSiteAccountList();
                return
                resumeSiteService.getResumeSiteList().then(function (data) {
                    $scope.resumeSiteList = [];

                    if (data) {
                        angular.forEach(data, function (item) {
                            var resumeSite = {title: item.subName, url: item.remark, siteTypeCd: item.subCd};
                            $scope.resumeSiteList.push(resumeSite);
                        });
                    }

                    buildResumeSiteAccountList();
                });
            };

            /**
             * 验证插件的会话状态
             场景1、 瑞聘未启动 ，登录插件时
             result： 插件报错，检测到系统访问异常
             场景2、瑞聘已启动 ，有效用户登录插件时
             result：插件正常显示招聘网站列表
             场景3、瑞聘已启动 ，有效用户登录插件后，瑞聘停止
             result：插件检测到系统访问异常，转到插件登录页面
             场景4、瑞聘已启动 ，有效用户登录插件后，瑞聘设定该用户无效
             result：插件检测到系统访问异常，转到插件登录页面
             场景5、瑞聘已启动 ，无效用户登录插件时
             result：插件检测到系统访问异常，转到插件登录页面
             */
            var validateSession = function () {
                $timeout(function(){
                    updateLoginStatus(true)
                //构造简历网站列表
                buildResumeSiteList();
                },1000)
                
                return
                //先从缓存总获取登录状态是否有效
                if (resumeSiteService.getLoginStatus()) {
                    console.log("A 获取缓存登录状态为有效");
                    window.location.href = "main.html";
                    //判断当前用户状态是否有效
                    $http.get($scope.remoteURL + '/cmn/heartbeat/validateSession').then(function (response) {
                        if (response.status !== 200) {
                            console.log("B 服务器响应状态异常，更新用户状态为无效");
                            //服务器响应状态异常，更新用户状态为无效
                            updateLoginStatus(false);
                        } else if (response.status === 200 && response.data === "true") {
                            console.log("C session验证通过，更新登录状态为有效");
                            //session验证通过，更新登录状态为有效
                            updateLoginStatus(true);
                            //构造简历网站列表
                            buildResumeSiteList();
                        }
                    });
                } else {
                    console.log("D 获取缓存登录状态为无效");
                    //判断当前用户状态是否有效
                    $http.get($scope.remoteURL + '/cmn/heartbeat/validateSession').then(function (response) {
                        if (response.status == 200 && response.data == "true") {
                            console.log("E session验证通过，更新登录状态为有效");
                            //session验证通过，更新登录状态为有效
                            updateLoginStatus(true);
                        } else {
                            console.log("F 瑞聘服务正常，用户不存在，转到登录页面");
                            //瑞聘服务正常，用户不存在，转到登录页面
                            window.location.href = "login.html";
                        }
                    }, function () {
                        console.log("F 瑞聘服务异常，转到登录页面");
                        //瑞聘服务异常，用户不存在，转到登录页面
                        window.location.href = "login.html";
                    });
                }
            };

            //更新插件的登录状态
            var updateLoginStatus = function (login) {
                resumeSiteService.cacheLoginStatus(login);
                if (login) {
                    buildResumeSiteList();
                } else {
                    $scope.resumeSiteAccountList = [];
                }
                $scope.logoutButton.title = login ? '注销' : '关闭';
                $scope.logoutButton.close = !login;
                $scope.alerts = [];
            };

            //验证插件的会话状态
            validateSession();

            //定时验证插件的会话状态(15分钟)
            // $interval(validateSession, 1000 * 30 * 30);

            //登录第三方招聘网站前的校验处理
            //  resumeSite：第三方网站实体对象
            //  resumeSiteAccount：第三方网站登录账号实体对象
            $scope.validateResumeSiteLogin = function (resumeSite, resumeSiteAccount, fedBackType) {
                if (resumeSite.siteTypeCd != '01' && fedBackType > 0) {
                    $scope.alert('只有智联招聘支持反馈。');
                    return;
                } else {
                    chrome.storage.sync.get("options", function (item) {
                        $scope.options = item.options || {};
                        $scope.options['fedBackType'] = fedBackType;
                        chrome.storage.sync.set($scope.options);
                    });
                }
                //验证是否设置时间段
                //目前验证智联，58、汇博、大佛山、中国人才热线和中华英才网
                if (resumeSite.siteTypeCd == '01' || resumeSite.siteTypeCd == '03' || resumeSite.siteTypeCd == '07' || resumeSite.siteTypeCd == '08' || resumeSite.siteTypeCd == '09') {
                    chrome.storage.sync.get("options", function (item) {
                        if (typeof item.options == 'undefined' ||
                            typeof item.options[resumeSite.siteTypeCd] == 'undefined' ||
                            item.options[resumeSite.siteTypeCd]['dateScope'] == null) {
                            $scope.alert('请设置时间段。');
                        } else {
                            resumeSiteLogin(resumeSite, resumeSiteAccount);
                        }
                    })
                } else {
                    resumeSiteLogin(resumeSite, resumeSiteAccount);
                }
            };

            //登录第三方招聘网站
            function resumeSiteLogin(resumeSite, resumeSiteAccount) {
                console.log('第三方网站',resumeSite)
                console.log('第三方网站账号',resumeSiteAccount)
                chrome.runtime.sendMessage(
                    {
                        jd: 'openURL',
                        url: resumeSite.url,
                        siteTypeCd: resumeSite.siteTypeCd,
                        remoteURL: $scope.remoteURL,
                        siteAccountInfo: {
                            version: $scope.version,
                            resumeSiteUid: resumeSiteAccount.uid,
                            siteLoginAccount: resumeSiteAccount.siteLoginAccount,
                            siteLoginPassword: resumeSiteAccount.siteLoginPassword,
                            siteVipName: resumeSiteAccount.siteVipName,
                            receiveURL: receiveURL,
                            receiveFileURL: receiveFileURL,
                            operationLogURL: operationLogURL,
                            saveToDb: resumeSiteAccount.saveToDb,
                            siteSecurityPolicy: resumeSiteAccount.securityPolicy
                        }
                    },
                    function (response) {
                        if (response.msg) {
                            $scope.alerts[0] = {msg: response.msg, type: 'danger'};
                        } else {
                            $scope.alerts = [];

                            //发送登录信息
                            $http.get(remoteURL + '/rp/resumesite/resumeSiteLogin?resumeSiteUid=' + resumeSiteAccount.uid);
                        }
                        $scope.$apply();
                    }
                );
            }

            $scope.alerts = [];
            // 消息方法
            $scope.alert = function (msg, type) {
                $scope.alerts[0] = {'msg': msg, 'type': type};
            };

            //关闭消息方法
            $scope.closeAlert = function (index) {
                $scope.alerts.splice(index, 1);
            };

            //登录按钮属性定义
            $scope.logoutButton = {
                'close': !resumeSiteService.getLoginStatus(),
                'title': resumeSiteService.getLoginStatus() ? '注销' : '关闭'
            };

            //退出登录方法
            $scope.logout = function () {
                resumeSiteService.logout().then(function (res) {
                    updateLoginStatus(false);
                });
            };

            //获取插件 选项设置的内容
            chrome.storage.sync.get("options", function (item) {
                $scope.options = item.options || {};
            });

            //插件 选项设置的内容
            $scope.setOption = function (resumeSite, value) {
                var siteTypeCd = resumeSite.siteTypeCd;
                if ($scope.options == null || $scope.options == 'undefined') {
                    $scope.options = {};
                }

                if ($scope.options[siteTypeCd] == null || $scope.options[siteTypeCd] == 'undefined') {
                    $scope.options[siteTypeCd] = {};
                }

                $scope.options[siteTypeCd]['dateScopeTime'] = moment().subtract(value - 1, 'days').format('YYYY/MM/DD');
                $scope.options[siteTypeCd]['dateScope'] = value;

                chrome.storage.sync.set($scope.options);
                $scope.alerts[0] = {msg: resumeSite.title + '简历下载时间区间设置为' + value + '日内完成', siteTypeCd: 'success'};

                chrome.storage.sync.get("options", function (item) {
                    item.options = $scope.options;
                    chrome.storage.sync.set(item);
                });
            }
        }
    );
    angular.bootstrap(document, ['jd_util']);
})(jQuery);
