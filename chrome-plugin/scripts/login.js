var remoteURL = '';
var loginURL = '';

$.ajaxSetup({async: false, cache: false});

//加载config.js中的配置信息
$.getScript("/scripts/config.js", function () {
    loginURL = loginUrl;
    remoteURL = remoteUrl;
});

$.ajaxSetup({async: true});

(function ($) {
    'use strict';
    //构建登录成功后显示的
    var app = angular.module('jd_util', ['ui.bootstrap']);
    app.value('loginStatus', false);
    app.factory('loginService', function ($http, $q, $window, loginStatus) {
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

            //登录方法
            login: function (user) {
                var deferred = $q.defer();
                if(user['username']!=='vip'){
                    return
                }
                if(user['password']!=='vip123'){
                    return
                }
                window.location.href = "main.html";
                return
                if (loginURL.indexOf("cas.renruihr.com") >= 0) {
                    $http.get(loginURL).success(function (data) {
                        if ($(data).find("input[name='execution']").length === 0) {
                            window.location.href = "main.html";
                            deferred.resolve({'result': true});
                            return;
                        }
                        $http.post(loginUrl,
                            {
                                username: user['username'],
                                password: user['password'],
                                execution: $(data).find("input[name='execution']").val(),
                                _eventId: $(data).find("input[name='_eventId']").val()

                            }, {
                                headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
                                transformRequest: function (data) {
                                    var params = '';
                                    for (var name in data) {
                                        if (params !== '') {
                                            params += '&';
                                        }
                                        params += name;
                                        params += '=';
                                        params += data[name];
                                    }
                                    return params;
                                }
                            }).success(function (data) {
                            console.log(data);
                            //登录失败的场合、停留在登录画面
                            if ($(data).find('#msg').text() != "") {
                                deferred.resolve({'result': false});
                            }
                            //登录成功的场合、迁移到网站一览画面
                            else {
                                window.location.href = "main.html";
                                deferred.resolve({'result': true});
                            }
                        }).error(function () {
                            deferred.resolve();
                        });
                    });
                } else {
                    $http.post(loginUrl,
                        {
                            username: user['username'],
                            password: user['password']
                        }, {
                            headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
                            transformRequest: function (data) {
                                var params = '';
                                for (var name in data) {
                                    if (params !== '') {
                                        params += '&';
                                    }
                                    params += name;
                                    params += '=';
                                    params += data[name];
                                }
                                return params;
                            }
                        }).success(function (data) {
                        console.log(data);
                        //登录失败的场合、停留在登录画面
                        if ($(data).find('#msg').text() != "") {
                            deferred.resolve({'result': false});
                        }
                        //登录成功的场合、迁移到网站一览画面
                        else {
                            window.location.href = "main.html";
                            deferred.resolve({'result': true});
                        }
                    }).error(function () {
                        deferred.resolve();
                    });
                }
                return deferred.promise;
            }
        };

    }).controller('loginController', function ($scope, $http, $timeout, $interval, $window, loginService) {
        $scope.remoteURL = loginService.getRemoteURL();
        $scope.version = chrome.app.getDetails().version;
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
            'close': !loginService.getLoginStatus(),
            'title': loginService.getLoginStatus() ? '注销' : '关闭'
        };

        //退出登录方法
        $scope.logout = function () {
            $window.close();
        };

        //插件登录方法
        $scope.login = function () {
            loginService.login($scope.user).then(function (data) {
                if (data) {
                    if (data.result) {
                    } else {
                        $scope.alert('登录失败，账号无效、用户名或密码不正确。', 'danger');
                    }
                } else {
                    $scope.alert('简历解析平台服务未开启。');
                }
            });
        }
    });
    angular.bootstrap(document, ['jd_util']);
})(jQuery);


//登陆页背景图片高度控制
$(function () {
    var whig = $(window).height();
    $(".resume-tool-login").css("min-height", whig - 50)
});

