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

            //校验用户名和密码
            checkLogin:function(user){
                var deferred = $q.defer();
                if(user['username']!=='vip'){
                    deferred.resolve({'result': false});
                    return deferred.promise;
                }
                if(user['password']!=='vip123'){
                    deferred.resolve({'result': false});
                    return deferred.promise;
                }
                deferred.resolve({'result': true});
                return deferred.promise;
            },

            //登录方法
            login: function (user) {
                var deferred = $q.defer();
                setTimeout(function(){
                    deferred.resolve({'result': true});
                },100)
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
            loginService.checkLogin($scope.user).then(function(data){
                if(data.result){
                    loginService.login($scope.user).then(function (data) {
                        if (data) {
                            if (data.result) {
                                window.location.href = "main.html";
                            } else {
                                $scope.alert('请输入正确的账号或者密码！', 'danger');
                            }
                        } else {
                            $scope.alert('网络异常，请联系管理员！');
                        }
                    });
                }else{
                    $scope.alert('请输入正确的账号或者密码！', 'danger');
                }
            })
        }
    });
    angular.bootstrap(document, ['jd_util']);
})(jQuery);


//登陆页背景图片高度控制
$(function () {
    var whig = $(window).height();
    $(".resume-tool-login").css("min-height", whig - 50)
});

