(function ($, _, moment, _jd) {
    var JD = new _jd('zhaopin');
    

    //网站登录账号
    var siteLoginAccount;

    var options = {};

    //要下载的简历
    var downloadResumes;
    //要上传的简历
    var syncResumes;
    //缓存中的已完成的简历【暂未使用】
    var successUploadedRecords;
    //缓存中已忽略不再反馈的简历
    var ignoreResume;
    //简历下载中断标志位 0-未中断 1-中断
    var interruptFlag = 0;

    //是否是最后一页简历数据(指定时间区间范围的的简历)
    var isLastPage = false;
    //要刷新的职位
    var waitToRefresh;
    //登录账号对应公司名称
    var siteLoginCompanyName = $('#top_control > div > div.showLogin > span').text() || $(".rd55-header__login-point > span").text() || $('.rd55-header__inner > div > span').text();

    //总共加载的简历页数
    var totalLoadResumePageSize = 0;
    //已上传的简历页数
    var uploadedResumePageSize = 0;
    //当前机构ID(公司编号)
    var currentOrgId = "";

    window.location.reload = function () {
        console.warn("禁用window.location.reload");
    };

    var settingDate;
    chrome.storage.sync.get(null, function (item) {
        if (location.href.indexOf("rd.zhaopin.com/resumepreview/resume/validateuser") > -1) {
            return;
        } else if (location.href.toLowerCase().indexOf("passport.zhaopin.com/org/verifymobile") > -1) {
            return;
        }
        //旧账号切换页面，地址跳转到新的账号切换地址
        else if (location.href.toLowerCase().indexOf("passport.zhaopin.com/org/login/switch") > -1) {
            location.href = "//ihr.zhaopin.com/loginPoint/choose.do?bkurl=https%3A%2F%2Frd5.zhaopin.com";
            return;
        } else if (location.href.toLowerCase().indexOf("ihr.zhaopin.com/loginpoint/choose.do") > -1) {
            //处理子账号列表
            handleSubAccount();
            return;
        } else if (location.href.indexOf("passport.zhaopin.com/org/modifyPwd") > -1) {
            return;
        } else if (location.href.indexOf("passport.zhaopin.com/additional/wechatLogin") > -1) {
            //微信登陆页面忽略
            return;
        } else if (location.href.indexOf("//rd.zhaopin.com/im") > -1) {
            if (JD.jdAccount.isLogin()) {
                var boss = new ZhaopinImUtils();
                boss.runTool();
            }
            return;
        }

        //网站登录
        login();

        //登录成功的场合
        if (JD.jdAccount.isLogin()) {
            if (JD.jdAccount === undefined) {
                console.log("未使用插件账号登陆，或已经超时");
                return;
            }
            //网站登录账号
            siteLoginAccount = JD.jdAccount.account.siteLoginAccount;

            //要上传的简历
            syncResumes = parseJSON(siteLoginAccount, "zhaopin_syncResumes");

            //要下载的简历
            downloadResumes = parseJSON(siteLoginAccount, "zhaopin_downloadResumes");

            //缓存中的已完成的简历
            successUploadedRecords = parseJSON(siteLoginAccount, "zhaopin_successUploadedRecords");

            //缓存中已忽略不再反馈的简历
            ignoreResume = parseJSON(siteLoginAccount, "zhaopin_ignoreResumes");

            if ($("#consoleDiv").length == 0) {
                $('body').first().prepend('<div id="consoleDiv"></div>');
            }

            settingDate = item.options[JD.types[JD.siteTypeCd]].dateScopeTime;
            if (location.href.indexOf("rd.zhaopin.com/resumepreview/resume/validateuser") > -1) {
                return;
            } else if (location.href.toLowerCase().indexOf("passport.zhaopin.com/org/verifymobile") > -1) {
                return;
            } else if (location.href.indexOf("rd2.zhaopin.com/s/homepage.asp") > -1) {
                location.href = "https://rd2.zhaopin.com/rdapply/resumes/apply/position?SF_1_1_50=1&JobTitle=" + siteLoginAccount;
            } else if (location.href.indexOf("jobads.zhaopin.com/Position/PositionManage") > -1) {
                //关闭职位刷新
                // doRefreshAllJob();
                // var consoleDiv = '<div id="consoleDiv"></div>'
                // $('body').first().prepend(consoleDiv);
            }
            //RD6的人才管理页面
            else if (location.href.indexOf("rd6.zhaopin.com/candidate") > -1) {
                $("#consoleDiv").css({
                    "z-index": "99999",
                    "background": "rgb(243, 253, 253)",
                    "overflow-y": "auto",
                    "height": "200px",
                    "position": "fixed",
                    "width": "500px",
                    "bottom": 0,
                }).append("<span title=\"关闭\" style=\"cursor: pointer;position: fixed;left: 465px;bottom: 180px;\" onclick=\"document.getElementById('consoleDiv').style.display='none'\">X</span>");
                //开始执行简历下载
                startExecute6();
            }
            //判断当前URL为职位列表 或者5.5版本 或者为ihr版页面
            else if (location.href.indexOf("rd2.zhaopin.com/rdapply/resumes/apply/position") > -1
                || location.href.indexOf("rd5.zhaopin.com/resume/apply") > -1 || location.href.indexOf("ihr.zhaopin.com/resume/manage/") > -1) {

                //特殊处理账号(第4位开始有4位被隐藏为*)
                var loginAccount = siteLoginAccount.toLocaleLowerCase();
                loginAccount = loginAccount.substr(0, 3) + loginAccount.substr(7);

                //判断登陆账号是否与插件所选一致
                var script = document.createElement("script");
                script.type = "text/javascript";
                script.innerHTML = "var passportName=window.$user && window.$user.user && window.$user.user.passportName && window.$user.user.passportName.toLocaleLowerCase();" +
                    "passportName = passportName.substr(0, 3) + passportName.substr(7);" +
                    "if(passportName!= '" + loginAccount + "'){" +
                    "      alert('您登陆的账号与插件所选账号不一致，请在插件中重新选择账号登陆。');" +
                    "      window.__rd.quit();" +
                    "}";
                document.getElementsByTagName("HEAD")[0].appendChild(script);

                if (isRd5()) {
                    var consoleDiv = '<div id="consoleDiv"></div>';
                    $('body').first().prepend(consoleDiv);
                    //开始执行简历下载
                    startExecute5();
                } else if (isIHR()) {
                    var consoleDiv = "<div id=\"consoleDiv\" style=\"z-index: 99999;position: fixed;background: wheat;overflow-y: auto;height: 500px;\"><div style=\"text-align: right;\"><span title='关闭' style=\"cursor: pointer;\" onclick=\"document.getElementById('consoleDiv').style.display='none'\">X</span></div></div>"
                    $('body').first().prepend(consoleDiv);
                    //开始执行简历下载
                    startIhr();
                } else {
                    var consoleDiv = '<div id="consoleDiv"></div>';
                    $('body').first().prepend(consoleDiv);
                    //反馈结果
                    var fedBackResult = changeResumeState(item.fedBackType, settingDate);
                    if (fedBackResult) {
                        //开启反馈并且结束 直接返回
                        return;
                    }

                    //批量查看简历
                    if (item.fedBackType === 4) {
                        viewResumes();
                        return;
                    }

                    //有待上传简历的场合，开上传简历
                    if (getObjectLength(syncResumes) > 0) {
                        showProcessMessage("登录账号：" + siteLoginCompanyName);
                        if (JD.jdAccount.account.saveToDb === 1) {
                            showProcessMessage(siteLoginCompanyName + "有未上传的简历，开始上传简历");

                            //上传简历到数据库
                            return uploadResumeData(syncResumes, {});
                        }
                    }

                    //有待下载简历的场合，开始下载简历
                    if (getObjectLength(downloadResumes) > 0) {
                        showProcessMessage("登录账号：" + siteLoginCompanyName);
                        showProcessMessage("有" + getObjectLength(downloadResumes) + "条简历未完成下载，开始下载简历");

                        //简历下载
                        downloadResume(downloadResumes);

                        setTimeout(function () {
                            showProcessMessage("开始下载简历......");
                        }, 2000);
                    }

                    //此处表明插件已刷新页面 或 页面中断了
                    if (getObjectLength(syncResumes) > 0 || getObjectLength(downloadResumes) > 0) {
                        //中断标志位 置为中断 0-未中断 1-中断
                        interruptFlag = 1;
                    }
                    //开始执行简历下载
                    startExecute();
                }
            }
            //如果为5.5首页 则 跳转至简历页面
            else if (getLocationHrefWithoutSearch() == document.location.protocol + "//rd5.zhaopin.com/") {
                if ("true" == getQueryVariable("clearLocalStorage")) {
                    //清除缓存
                    localStorage.clear();
                }
                location.href = "//rd5.zhaopin.com/resume/apply";
            }
            //如果为新版IHR首页 则 跳转至简历页面
            else if (getLocationHrefWithoutSearch() == document.location.protocol + "//ihr.zhaopin.com/") {
                location.href = "//ihr.zhaopin.com/resume/manage/resList.html";
            }
        }
    });

    function getLocationHrefWithoutSearch() {
        return window.location.origin + window.location.pathname;
    }

    function handleSubAccount() {
        var completeAccount = getQueryVariable("complete_account");
        //已完成的列表
        var completeAccountList = completeAccount ? completeAccount.split(",") : [];
        //是否清除缓存，当第一次进入需要清除
        var clearLocalStorage = completeAccountList.length == 0;
        var $accountLink = $("div.org-info-contain li.org-list-item a");
        $accountLink.each(function () {
            var isComplete = false;
            var orgId = $(this).attr("orgid");
            for (var i = 0, len = completeAccountList.length; i < len; i++) {
                if (orgId == completeAccountList[i]) {
                    isComplete = true;
                    break;
                }
            }

            //没有加载则跳转页面
            if (!isComplete) {
                showProcessMessage("<b style='color: #0000ff;'>共" + $accountLink.length + "个账号，已处理" + len + "个账号，即将处理账号：" + $(this).text() + "</b>");
                setTimeout(function () {
                    gotoSubAccount(orgId, clearLocalStorage);
                }, getSiteSecurityPolicy().beginHandleAccountTipsTime);
                return false;
            }
        });

        if ($accountLink.length == completeAccountList.length) {
            showProcessMessage("所有账号已处理完毕。");
        }
    }

    /**
     * 获取URL参数值
     * @param variable 变量
     * @returns {string}
     */
    function getQueryVariable(variable) {
        var query = window.location.search.substring(1);
        var vars = query.split("&");
        for (var i = 0; i < vars.length; i++) {
            var pair = vars[i].split("=");
            if (pair[0] == variable) {
                return pair[1];
            }
        }
        return "";
    }

    function gotoSubAccount(orgId, clearLocalStorage) {
        $.ajax({
            method: 'GET',
            url: '//ihr.zhaopin.com/loginPoint/saveLoginPoint.do',
            data: {
                pointOrgId: orgId
            }
        }).done(function (data) {
            if (data.code == 200) {
                window.location = decodeURIComponent("//rd5.zhaopin.com?orgId=" + orgId + "&clearLocalStorage=" + clearLocalStorage);
            } else {
                alert('an error occurred when swithing org:' + data.message)
            }
        });
    }

    function isRd6() {
        return location.href.indexOf("rd6.zhaopin.com") > -1;
    }

    /**
     * 是否为5.5版本
     * @returns {boolean}
     */
    function isRd5() {
        return location.href.indexOf("rd5.zhaopin.com") > -1;
    }

    /**
     * 是否为ihr版本
     * @returns {boolean}
     */
    function isIHR() {
        return location.href.indexOf("ihr.zhaopin.com") > -1;
    }

    function viewResumes() {
        chrome.runtime.sendMessage({
                jd: "countTabs",
                url: '*://rd.zhaopin.com/resumepreview/resume/validateuser/*',
                status: 'complete'
            },
            function (response) {
                if (response) {
                    //停止发送消息
                    console.log("有" + response.result + "个简历页面需要填写验证码...");
                    if (response.result === 0) {
                        $("a[isread=0]").each(function (index, item) {
                            var resumeSpan = $('<span>&nbsp;</span>');
                            $(item).append(resumeSpan);
                            resumeSpan.trigger("click");
                        });
                        sendMessage();
                    } else {
                        setTimeout(viewResumes(), 30 * 60 * 1000)
                    }
                }
            }
        );

        function sendMessage() {
            chrome.runtime.sendMessage({
                    jd: "countTabs",
                    url: '*://rd.zhaopin.com/resumepreview/resume/viewone/*',
                    status: 'loading'
                },
                function (response) {
                    if (response) {
                        //停止发送消息
                        console.log("还有" + response.result + "个简历页面加载中...");
                        if (response.result === 0) {
                            const nextPageElement = $("#resumeList").find("> div.turnpageCon.clearfix > div.turnpage > a:contains(下页)");
                            const nextPageBtn = $('<span>&nbsp;</span>');
                            nextPageElement.append(nextPageBtn);
                            nextPageBtn.trigger('click');
                            const pageInterval = setInterval(function () {
                                if (nextPageBtn !== $('div.turnpageCon>.turnpage>a:nth-last-of-type(2)').attr('href')) {
                                    console.log("clearPageInterval", nextPageBtn, $('div.turnpageCon>.turnpage>a:nth-last-of-type(2)').attr('href'));
                                    clearInterval(pageInterval);
                                    return viewResumes();
                                }
                            }, 4000);
                        } else {
                            sendMessage()
                        }
                    } else {
                        console.log("viewResumeCount无异步返回结果，需要排查原因。");
                    }
                });
        }

    }

    /**
     * 取得对象的大小
     *
     * @param obj 传的对象
     * @returns 对象的大小
     */
    function getObjectLength(obj) {
        var length = 0;
        $.each(obj, function () {
            length++;
        });
        return length;
    }

    //显示处理进度消息(追加显示)
    function showProcessMessage(msg) {
        $('#consoleDiv').append("<h1 style='color: green;align-content: center'>" + msg + "</h1>");
        $('#consoleDiv').append("<br>");
        $('#consoleDiv').scrollTop(9999999);
    }

    //显示处理进度消息(追加显示)
    function showLoadResumeProcessMessage(msg) {
        if ($('#consoleDiv #resumeProcessH1').length > 0) {
            $('#consoleDiv #resumeProcessH1').text(msg);
        } else {
            $('#consoleDiv').append("<h1 style='color: red;align-content: center;font-weight: bold' id='resumeProcessH1'>" + msg + "</h1>");
            $('#consoleDiv').append("<br>");
        }
        $('#consoleDiv').scrollTop(9999999);
    }

    //删除处理进度消息（从最后行消息开始删除）
    function removeMessage() {
        $('#consoleDiv').find('>h1:last').remove();
        $('#consoleDiv').find('>br:last').remove();
        $('#consoleDiv').scrollTop(9999999);
    }

    //登录处理
    function login() {
        if (!JD.jdAccount.isLogin() && ($('a:contains(退出)').length
            || window.location.href.indexOf('choose.asp') > -1
            || window.location.href.indexOf('passport.zhaopin.com/org/Sel') > -1
            || window.location.href.indexOf('rd6.zhaopin.com') > -1)) {

            JD.jdAccount.login();
        }
        if (!JD.jdAccount.isLogin()) {
            options.login = function (jdAccount) {
                $(document.getElementById("LoginName") || document.getElementById("loginName")).val(jdAccount.siteLoginAccount).attr("disabled", "disabled");
                $(document.getElementById("Password") || document.getElementById("password")).val(jdAccount.siteLoginPassword);
            };
            options.loginURL = 'https://passport.zhaopin.com/org/login';
            JD.login(options);
        }
    }

    //根据指定Key从本地取得存储字符串解析成Json对象
    function parseJSON(siteLoginAccount, key) {
        //要上传的简历
        try {
            return JSON.parse(window.localStorage.getItem(siteLoginAccount + "_" + key)) || {}
        } catch (e) {
            return {};
        }
    }

    /**
     * 设置简历反馈状态
     *
     * @param ids 要反馈的简历id集合
     */
    function setResumeState(ids, fedBackType) {
        var dtd = $.Deferred();
        var dataJson;
        if (fedBackType == 1) {
            dataJson = {'ids': ids, 'oldResumeState': 1, 'resumeState': 2};
        } else if (fedBackType == 2) {
            dataJson = {'ids': ids, 'oldResumeState': 1, 'resumeState': 4};
        } else if (fedBackType == 3) {
            dataJson = {'ids': ids, 'oldResumeState': 2, 'resumeState': 4};
        }
        //loadScript将异步加载一个js文件，所以返回值是一个Deferred对象
        var tasks = function () {
            $.ajax({
                url: 'https://rd2.zhaopin.com/RdApply/Resumes/Apply/SetResumeState',
                data: dataJson,
                type: 'POST',
                async: false,
                success: function (res, para) {
                    if (res.Code === 200) {
                        removeMessage();
                        showProcessMessage(ids + "简历反馈成功");
                        return dtd.resolve();
                    } else {
                        var id = ids.split(";");

                        var url = 'https://rd.zhaopin.com/resumepreview/resume/viewone/1/' + id[0];
                        showProcessMessage(ids + "简历反馈失败");

                        console.log("简历反馈失败", res, id[0], url);

                        window.open(url);

                        ignoreResume[id[0]] = id[0];
                        localStorage.setItem(siteLoginAccount + "_zhaopin_ignoreResumes", JSON.stringify(ignoreResume));
                        return dtd.promise();
                    }
                },
                error: function () {
                    showProcessMessage("请求失败，亲 联系管理员吧 ")
                }
            });
        };
        setTimeout(tasks, 5000);

        //返回自定义的dtd对象，才能保证返回值的done回调在load事件完成后执行
        return dtd.promise();
    }

    /**
     * 根据日期折半翻页
     * @param settingDate
     * @returns {*}
     */
    function changePageToSettingDate(settingDate, fedBackType) {
        if (fedBackType == 3 && $('#submitBack').attr("class").indexOf("f_cur") == -1) {
            $('#submitBack').trigger("click");
            var submitBackInterval = setInterval(function () {
                if ($('#submitBack').attr("class").indexOf("f_cur") > -1) {
                    clearInterval(submitBackInterval);
                    removeMessage();
                    showProcessMessage("已切换到待沟通");
                    return changePageToSettingDate(settingDate, fedBackType);
                }
            }, 4000);
        } else {

            var dtd = $.Deferred();
            var pageAll = $('#resumeList > div.mainListCon > div.infoCon.clearfix > div.toprightCon > span.red12px').text();
            var pageCount = parseInt(pageAll.split('/')[1]);
            //简历投递时间
            var time = moment($('#zpResumeListTable').find('>tbody>tr[rdmodule="resumeMoreInfoFac"] > td:last').attr('title'));
            var receiveTime = moment(time.format("YYYY/MM/DD"));
            // var pageListEle = fedBackType == 1 ? $("#pageList1") : fedBackType == 2 ? $("#pageList1") : $("#pageList1");
            showProcessMessage("跳转页面到投递日期为" + settingDate + "的页面。");
            if (!receiveTime.isSame(moment(settingDate))) {
                var startPage = 1;
                var endPage = pageCount;
                var middlePage = parseInt((startPage + endPage) / 2) + 1;
                $("#pageList1").val(middlePage);
                var nextPageBtn = $('<span>&nbsp;</span>');
                var goButton = $('#resumeList > div.mainListCon > div.infoCon.clearfix > div.toprightCon > input.genButton3');
                goButton.append(nextPageBtn);
                nextPageBtn.trigger('click');
                var pageInterval = setInterval(function () {
                    time = moment($('#zpResumeListTable').find('>tbody>tr[rdmodule="resumeMoreInfoFac"] > td:last').attr('title'));
                    receiveTime = moment(time.format("YYYY/MM/DD"));
                    pageAll = $('#resumeList > div.mainListCon > div.infoCon.clearfix > div.toprightCon > span.red12px').text();
                    var currentPage = parseInt(pageAll.split('/')[0]);
                    if (currentPage == middlePage) {
                        if (pageCount == currentPage) {
                            clearInterval(pageInterval);
                            showProcessMessage("已经达到尾页，结束翻页。");
                            return dtd.resolve();
                        }
                        //要翻页的页码
                        if (receiveTime.isAfter(moment(settingDate))) {
                            startPage = middlePage;
                        } else {
                            var needFedBackResumeIds = JSON.parse(sessionStorage.getItem("needFedBackResumeIds") || "{}");
                            //待处理状态简历ID拼接
                            $('#zpResumeListTable>tbody>tr[rdmodule="resumeMoreInfoFac"]').each(function (index, item) {
                                var resumeId = $(item).attr('id').replace('moreinfo_', '');
                                if (!needFedBackResumeIds[resumeId]) {
                                    needFedBackResumeIds[resumeId] = resumeId;
                                }
                            });
                            sessionStorage.setItem("needFedBackResumeIds", JSON.stringify(needFedBackResumeIds));

                            //最多反馈1000
                            if (getObjectLength(needFedBackResumeIds) > 1000) {
                                clearInterval(pageInterval);
                                return dtd.resolve();
                            }
                            //判断如果当前页是最后一页且resumeID在已忽略的列表中 则不进行反馈了 直接跳转到简历下载页面
                            var nextPageElement = $('#resumeList > div.turnpageCon.clearfix > div.turnpage > a:contains(下页)');
                            if (nextPageElement.length == 0) {
                                clearInterval(pageInterval);
                                return dtd.resolve();
                            } else {
                                middlePage = currentPage + 1;
                                removeMessage();
                                showProcessMessage("开始收集待反馈后续页码：" + middlePage);
                                $("#pageList1").val(middlePage);
                                goButton = $('#resumeList > div.mainListCon > div.infoCon.clearfix > div.toprightCon > input.genButton3');
                                goButton.append(nextPageBtn);
                                nextPageBtn.trigger('click');
                            }
                            return dtd.promise();
                        }
                        middlePage = parseInt((startPage + endPage) / 2) + 1;
                        showProcessMessage("翻页到" + middlePage);
                        $("#pageList1").val(middlePage);
                        goButton = $('#resumeList > div.mainListCon > div.infoCon.clearfix > div.toprightCon > input.genButton3');
                        goButton.append(nextPageBtn);
                        nextPageBtn.trigger('click');
                        return dtd.promise();
                    }

                }, 4000);
            } else {
                return dtd.promise();
            }
            return dtd.promise();
        }
    }

    //改变简历状态（将待处理先进行反馈成待沟通 提高网站反馈率）
    function changeResumeState(fedBackType, settingDate) {
        if (fedBackType == 1) {
            showProcessMessage("执行反馈" + settingDate + "前的简历到待沟通。");
        } else if (fedBackType == 2) {
            showProcessMessage("执行反馈" + settingDate + "前的简历到不合适。");
        } else if (fedBackType == 3) {
            showProcessMessage("执行反馈" + settingDate + "前的简历待沟通到不合适。");
        } else {
            showProcessMessage("没有开启反馈,直接进行待处理简历操作。");
            return false;
        }

        //翻页到小于设置日期的那一页
        $.when(changePageToSettingDate(settingDate, fedBackType))
            .done(function setResumeStateDG() {
                    var needFedBackResumeIds = JSON.parse(sessionStorage.getItem("needFedBackResumeIds") || "{}");
                    var tempIds = needFedBackResumeIds;
                    var ids = "";
                    var index = 1;
                    $.each(needFedBackResumeIds, function (key, item) {
                        ids += item + ",";
                        delete tempIds[key];
                        index++;
                        if (index % 20 == 0) {
                            $.when(setResumeState(ids, fedBackType)).done(
                                function () {
                                    sessionStorage.setItem("needFedBackResumeIds", JSON.stringify(tempIds));
                                    if (getObjectLength(tempIds) > 0) {
                                        setResumeStateDG();
                                    } else {
                                        showProcessMessage("已经没有可反馈的简历,请重新设置时间段或刷新页面。")
                                    }
                                }
                            )
                            return false;
                        }
                    });
                }
            );

        return true;

    }

    //开始执行简历下载
    function startExecute() {
        //如果是下载中被中断了 则直接跳转到之前的页
        if (interruptFlag === 1) {
            //直接取缓存中取当前页数，跳转到对应页 进行简历抓取
            var currentPage = parseInt(window.localStorage.getItem(siteLoginAccount + "_zhaopin_current_page"));
            if (currentPage > 1) {
                $('#pageList2').attr('value', currentPage);
                $('#resumeList > div.turnpageCon.clearfix > div.turnpage > input.genButton3').trigger('click');
                setTimeout(getResumeList, 5000);
            }
            //将中断标志 置为未中断 0-未中断 1-中断
            interruptFlag = 0;
        } else {
            getResumeList();
        }
    }

    //开始执行简历下载5.5与IHR版本
    function startIhr() {
        //注入变量
        injectCustomVariableCommon();

        //注入简历执行脚本
        setTimeout(injectCustomJs, getSiteSecurityPolicy().injectResumeExecuteScriptTime);
    }

    //开始执行简历下载5.5与IHR版本
    function startExecute5() {
        //注入变量
        injectCustomVariableCommon();

        //注入简历执行脚本
        setTimeout(function () {
            injectCustomJs('scripts/zhaopin/rd5_injected_script.js');
        }, getSiteSecurityPolicy().injectResumeExecuteScriptTime);
    }

    function startExecute6() {
        //注入变量
        injectCustomVariableCommon();

        //注入简历执行脚本
        setTimeout(function () {
            injectCustomJs('scripts/zhaopin/rd6_injected_script.js');
        }, getSiteSecurityPolicy().injectResumeExecuteScriptTime);
    }

    function injectCustomVariableCommon() {
        //注入变量
        injectCustomVariable("_resumeSaveToDb", JD.jdAccount.account.saveToDb);
        injectCustomVariable("_siteLoginAccount", "'" + siteLoginAccount + "'");
        injectCustomVariable("_resumeSettingDate", "'" + settingDate + "'");
        injectCustomVariable("_siteSecurityPolicy", "'" + JSON.stringify(getSiteSecurityPolicy()) + "'");

        //注入JavaScript 日期处理脚本
        injectCustomJs("plugins/moment/moment.min.js");
    }

    //页面抓取简历列表
    function getResumeList() {
        //与页面有效(投递时间没有超过)简历数，页面已加载岗位简历数
        var pageEffectiveResumeSize = 0, pageLoadedPositionResumeSize = 0;
        $('#zpResumeListTable>tbody>tr[rdmodule="resumeMoreInfoFac"]').each(function () {
            var checkbox = $(this).find('input:checkbox');

            //简历投递时间
            var time = moment($(this).find("td:last").attr("title"));
            var receiveTime = moment(time.format("YYYY/MM/DD"));
            //如果投递时间超过设定时间，则忽略
            if (!(receiveTime.isAfter(settingDate) || receiveTime.isSame(settingDate))) {
                return;
            }

            pageEffectiveResumeSize++;

            var resumeId = checkbox.data('resumebh');
            var resumeGUID = checkbox.data('resguid');
            var resumeNumber = checkbox.data('resumenumber');
            var language = checkbox.data('language');

            //取得投递岗位信息
            function getPositionInfo(jobInfo) {
                var dtd = $.Deferred();

                var jobInfos = JSON.parse(window.localStorage.getItem("zhaopin_jobInfo") || "{}") || {};
                if (jobInfos[jobInfo.jobId]) {
                    jobInfo = jobInfos[jobInfo.jobId];
                    return dtd.resolve();
                }

                var url = 'https://jobads.zhaopin.com/Position/PositionPreview/' + jobInfo.jobId;
                //loadScript将异步加载一个js文件，所以返回值是一个Deferred对象
                var tasks = function () {
                    $.ajax({
                        method: 'GET',
                        url: url,
                        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
                    }).done(function (result) {
                        //发布城市
                        jobInfo.releaseCityName = $.trim($(result).find('div.terminalpage-left > ul > li:nth-child(2) > strong').text());
                        //工作地区
                        jobInfo.workArea = $.trim($(result).find('div.terminalpage-left > ul > li:nth-child(2) > strong').text());
                        //投递岗位
                        jobInfo.applyPosition = $.trim($(result).find('div.inner-left.fl > h1').text());
                        //工作地址
                        jobInfo.workAddress = $.trim($(result).find('div.tab-inner-cont > h2').text());
                        //投递公司
                        jobInfo.applyCompany = $.trim($(result).find('div.company-box > p.company-name-t.no-hover-cn > a').text());

                        jobInfos[jobInfo.jobId] = jobInfo;
                        localStorage.setItem("zhaopin_jobInfo", JSON.stringify(jobInfos));
                        return dtd.resolve();
                    });
                };
                setTimeout(tasks, 3000);
                //返回自定义的dtd对象，才能保证返回值的done回调在load事件完成后执行
                return dtd.promise();
            }

            //网页上的简历信息
            try {
                var resumeInfo = checkbox.attr("userinfo_forsend");
                if (!resumeInfo) {
                    return true;
                }
                var resumeInfos = resumeInfo.split('$');

                //姓名
                var name = resumeInfos[0];
                //移动电话
                var mobile = resumeInfos[16];
                //电子邮件
                var email = resumeInfos[2];
                //目前居住地
                var regionName = resumeInfos[15];
                //简历名称
                var resumeName = checkbox.attr("dev_name");

                //投递岗位信息
                var jobInfo = {
                    jobId: $($(this).find('td:nth-child(5)')).attr('jobid'),
                    applyPosition: '',
                    releaseCityName: '',
                    workArea: '',
                    workAddress: ''
                };

                $.when(getPositionInfo(jobInfo))
                    .done(function () {
                        downloadResumes[jobInfo.applyPosition + '-' + name + '-' + resumeName] = {
                            downParam: resumeGUID + '-' + resumeId + '-' + resumeNumber + '-' + language,
                            info: {
                                resumeId: resumeId,
                                name: name,
                                mobile: mobile,
                                email: email,
                                regionName: regionName,
                                jobInfo: jobInfo
                            }
                        };
                        pageLoadedPositionResumeSize++;
                    });
            } catch (e) {
                console.log(e);
                showProcessMessage("解析简历异常：" + e.message);
                var params = {
                    "module": "智联招聘",
                    "content": e
                };
                JD.logToCenter(params);
            }
            localStorage.setItem(siteLoginAccount + "_zhaopin_downloadResumes", JSON.stringify(downloadResumes));
        });

        var currentPage = window.localStorage.getItem(siteLoginAccount + "_zhaopin_current_page");
        showProcessMessage("正在加载第" + (currentPage ? (currentPage == 0 ? 1 : currentPage) : 1) + "页简历信息，共" + pageEffectiveResumeSize + "条");
        var goPageInterval = setInterval(function () {
            //当页面所有有效简历都加载完岗位信息后，翻页
            if (pageEffectiveResumeSize == pageLoadedPositionResumeSize) {
                clearInterval(goPageInterval);
                goPage();
            }
        }, 1000);
    }

    /**
     * 翻页
     *
     * page元素是document end 后js渲染 所以拿url解析pageNo;
     * @returns {*}
     */
    function goPage() {
        var resumesResult = downloadResumes;
        var nextPageElement = $("#resumeList").find("> div.turnpageCon.clearfix > div.turnpage > a:contains(下页)");

        //没下一页了 直接下载
        if (nextPageElement.length == 0) {
            //清空当前页面的缓存值
            localStorage.setItem(siteLoginAccount + "_zhaopin_current_page", 0);
            return downloadResume(resumesResult);
        }

        var nextPage = nextPageElement.attr("href").match(/\d+/);
        //简历投递时间
        var time = moment($('#zpResumeListTable').find('>tbody>tr[rdmodule="resumeMoreInfoFac"] > td:last').attr('title'));

        //每50页一下载上传
        if (nextPage % 50 == 1) {
            downloadResume(resumesResult);
        }
        //保存当前页面到本地内存
        localStorage.setItem(siteLoginAccount + "_zhaopin_current_page", nextPage);

        var receiveTime = moment(time.format("YYYY/MM/DD"));
        if (receiveTime.isAfter(settingDate) || receiveTime.isSame(settingDate)) {
            var nextPageBtn = $('<span>&nbsp;</span>');
            nextPageElement.append(nextPageBtn);
            nextPageBtn.trigger('click');
            var pageInterval = setInterval(function () {
                if (nextPageBtn !== $('div.turnpageCon>.turnpage>a:nth-last-of-type(2)').attr('href')) {
                    clearInterval(pageInterval);
                    removeMessage();
                    showProcessMessage("准备加载第" + nextPage + "页简历");
                    //开始执行简历下载
                    startExecute();
                }
            }, 4000);
        } else {
            showProcessMessage("到" + settingDate + "为止简历加载完成，准备下载简历");
            //清空当前页面的缓存值
            localStorage.setItem(siteLoginAccount + "_zhaopin_current_page", 0);
            return downloadResume(resumesResult);
        }
    }

    //简历下载
    function downloadResume(resumesResult) {
        if (getObjectLength(resumesResult) < 1) {
            showProcessMessage("无简历可下载，稍后请手动刷新");
            return;
        }
        var data = {rname: '', uname: '', down: 1, ntype: 2, rl: '', isone: 0, ft: 2, jn: ''};
        $.each(resumesResult, function (index, item) {
            if (typeof item === 'object' &&
                typeof item.downParam !== 'undefined' &&
                item.downParam.indexOf('undefined') < 0) {
                data.rl += item.downParam + ","
            } else {
                console.warn("忽略错误的简历：" + item);
            }
        });
        if (data.rl.length < 10) {
            showProcessMessage("无简历可下载，稍后请手动刷新");
            return;
        }
        data.rl = data.rl.substring(0, data.rl.length - 1);
        showProcessMessage("开始下载简历");

        $.ajax({
            method: 'POST',
            url: "https://rd2.zhaopin.com/s/resume_preview/OutOrSendResume.asp",
            data: $.param(
                data
            ),
            headers: {'Content-Type': 'application/x-www-form-urlencoded'}
        }).success(function (url) {
            showProcessMessage("等待智联生成简历");
            //验证智联文件是否准备完毕
            $.when(checkFileReady(url))
                .done(function () {
                    showProcessMessage("正在下载简历");
                    downloadFile(resumesResult, url);
                });
        });
    }

    /**
     * 检查文件是否可以下载
     *
     * @param url 简历URL
     * @returns true 可以
     */
    function checkFileReady(url) {
        var dtd = $.Deferred();
        //loadScript将异步加载一个js文件，所以返回值是一个Deffered对象
        var tasks = function () {
            $.ajax({
                method: 'POST',
                url: "https://rd2.zhaopin.com/s/resume_preview/OutOrSendResume.asp",
                data: $.param(
                    {
                        ntype: 4,
                        fp: url
                    }
                ),
                headers: {'Content-Type': 'application/x-www-form-urlencoded'}
            }).done(function (result) {
                if (parseInt(result) == 1) {
                    console.log("文件准备完毕：" + url);
                    return dtd.resolve();
                } else {
                    setTimeout(tasks, 5000);
                }
                return dtd.promise();
            });
        };
        setTimeout(tasks, 5000);
        //返回自定义的dtd对象，才能保证返回值的done回调在load事件完成后执行
        return dtd.promise();
    }

    /**
     * 下载文件
     *
     * @param url 简历URL
     */
    function downloadFile(resumesResult, url, times) {
        //使用https下载
        url = url.replace("http://", "https://");

        if (JD.jdAccount.account.saveToDb === 1) {
            var oReq = new XMLHttpRequest();
            oReq.open("GET", url, true);
            oReq.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            oReq.responseType = "arraybuffer";
            oReq.onload = function () {
                var arraybuffer = oReq.response;
                var data = new Uint8Array(arraybuffer);
                var arr = [];
                for (var i = 0; i != data.length; ++i) arr[i] = String.fromCharCode(data[i]);
                var arrayString = arr.join("");
                var workbook = XLSX.read(arrayString, {type: "binary"});
                var resumeJson = XLSX.utils.sheet_to_json(workbook.Sheets['下载简历列表']);
                //解析文件
                parseResume(resumesResult, resumeJson, workbook);
            };
            oReq.onerror = function (e) {
                if (times == 10) {
                    showProcessMessage("下载简历Excel文件尝试10次失败,请稍后手动重试");
                } else {
                    var newTimes = times ? times : 1;
                    showProcessMessage("下载简历Excel文件失败,正在进行第" + newTimes + "次尝试");
                    setTimeout(downloadFile, 1500, resumesResult, url, ++newTimes);
                }
            };
            oReq.send();
        } else {
            //下载文件
            window.open(url);
        }
    }

    //填充简历信息方法
    function fillMasterInfo(resumesResult, item, name) {
        var syncResume = {};
        var applyPosition = item['应聘职位'];
        //有效的id 从页面缓存读取
        if (name) {
            var resumeInfo = {};
            var result;
            if (isRd6()) {
                //岗位+姓名+现在（前）单位+学校
                result = resumesResult[applyPosition + '-' + name + '-' + item['现在（前）单位'] + '-' + item['学校名称']];
            } else {
                //岗位+姓名+简历名称
                result = resumesResult[applyPosition + '-' + name + '-' + item['简历名称']];
            }
            if (result) {
                resumeInfo = result.info;
            } else {
                $.each(resumesResult, function (key, item) {
                    if (key.indexOf(name) > -1) {
                        resumeInfo = item.info;
                    }
                })
            }
            try {
                if (resumeInfo.jobInfo) {
                    if (!resumeInfo.jobInfo.releaseCityName || !resumeInfo.jobInfo.workArea) {
                        var jobInfos = JSON.parse(window.localStorage.getItem("zhaopin_jobInfo")) || {};
                        if (jobInfos[resumeInfo.jobInfo.jobId]) {
                            resumeInfo.jobInfo = jobInfos[resumeInfo.jobInfo.jobId];
                        } else {
                            showProcessMessage(name + "没有岗位信息");
                        }
                    }
                    syncResume.releaseCityName = resumeInfo.jobInfo.releaseCityName;
                    syncResume.workArea = resumeInfo.jobInfo.workArea;
                    syncResume.workAddress = resumeInfo.jobInfo.workAddress;
                    syncResume.applyCompany = resumeInfo.jobInfo.applyCompany;
                }
            } catch (e) {
                console.log(e);
            }

            //resumeId所抓取简历ID
            syncResume.resumeId = resumeInfo.resumeId || resumeInfo.resumeNumber;
            syncResume.regionName = resumeInfo.regionName || item['目前居住地'];
            //mobile联系电话-手机
            syncResume.mobile = resumeInfo.mobile || item['移动电话'];
            //email电子邮箱
            syncResume.email = resumeInfo.email || item['电子邮件'];
        }
        //从excel读取
        else {
            syncResume.mobile = item['移动电话'];
            syncResume.email = item['电子邮件'];
            syncResume.regionName = item['目前居住地'];
            syncResume.contactAddress = item['通讯地址'];
        }
        return syncResume;
    }

    /**
     * 解析简历信息
     */
    function parseResume(resumesResult, resumeJson, workbook) {
        var syncResumes = [];
        var tempUploadedRecords = {};
        $.each(resumeJson, function (index, item) {
            try {
                //用excel sheetName取姓名
                var sheetName = workbook.SheetNames[index + 1];
                var nameIndex = sheetName.split(".");

                if (nameIndex < 2 || nameIndex[1] == "") {
                    return true;
                }

                var sheet = workbook.Sheets[sheetName];
                var syncResume = fillMasterInfo(resumesResult, item, nameIndex[1]);
                syncResume.name = nameIndex[1];
                syncResume.previewCompany = item['现在单位'] || item['现在（前）单位'];
                syncResume.major = item['专业名称'];
                syncResume.school = item['学校名称'];
                //教育经历
                syncResume.educationExperienceList = [];
                //工作经历
                syncResume.workExperienceList = [];

                var sheetMaxRow = sheet['!range'].e.r;
                var currentInfo;
                var currentPara;
                //数组属性游标
                var currentArrayIndex = 1;
                //数组属性游标
                var projectIndex = -1;
                var jobIntentionIndex = 1;
                var params = {
                    个人基本信息: {
                        type: "string",
                        婚姻状况: {key: "marriedName"},
                        户口: {key: "registerAddress"},
                        邮编: {key: "zipCode"}
                    },
                    求职意向: {
                        type: "string",
                        '期望工作性质': {key: "jobTypeName"},
                        '期望从事职业': {key: "objectiveJob"},
                        '期望从事行业': {key: "jobIndustry"},
                        '期望工作地区': {key: "jobPlace"},
                        '期望月薪': {key: "expectSalaryName"},
                        '目前状况': {key: 'dutyTimeName'}
                    },
                    自我评价: {
                        type: "nextString",
                        key: "introduction"
                    },
                    教育经历: {
                        type: "array",
                        key: "educationExperienceList"
                    },
                    工作经历: {
                        type: "array",
                        key: "workExperienceList"
                    },
                    项目经验: {
                        type: "array",
                        key: "projectExperienceList"
                    },
                    培训经历: {
                        type: "nextString",
                        key: "trainingExperience"
                    },
                    证书: {
                        type: "nextString",
                        key: "certificates"
                    },
                    在校学习情况: {
                        type: "nextString",
                        key: "graduatesInfo"
                    },
                    在校实践经验: {
                        type: "nextString",
                        key: "socialEvents"
                    },
                    语言能力: {
                        type: "nextString",
                        key: "languageAbility"
                    },
                    专业技能: {
                        type: "nextString",
                        key: "personSkill"
                    },
                    兴趣爱好: {
                        type: "nextString",
                        key: "interest"
                    }
                };
                if (isRd6()) {
                    params.求职意向 = {type: "string", key: "jobIntentionInfo"};
                }
                for (var i = 1; i < sheetMaxRow + 1; i++) {
                    //当前A列内容
                    var cellA = sheet["A" + i] || {};
                    var cellB = sheet["B" + i] || {};
                    var currentKey = cellA.v;
                    var currentVal = cellB.v;
                    if (typeof currentKey != 'undefined' && typeof params[currentKey] != 'undefined') {
                        //定义当前要设置内容
                        currentInfo = currentKey;
                        currentPara = params[currentKey];
                        continue;
                    }

                    //参数设置有此字段设置 && 参数类型为字符串属性 && 值为空才设置 避免覆盖原有值
                    if (typeof currentPara[currentKey] != 'undefined' && currentPara.type == 'string' && currentVal != "") {
                        syncResume[currentPara[currentKey].key] = currentVal;
                    } else if (currentPara.type == 'nextString' && currentVal != "") {
                        syncResume[currentPara.key] = currentVal;
                    } else if (currentInfo == '求职意向' && isRd6()) {
                        //不存在则新建
                        if (!syncResume[currentPara.key]) {
                            syncResume[currentPara.key] = {};
                        }

                        if (jobIntentionIndex == 1) {
                            var array = currentVal.split(currentVal.match('\\s+')[0]);
                            //期望从事职业
                            syncResume[currentPara.key]['objectiveJob'] = array[0];
                            //期望工作地区
                            syncResume[currentPara.key]['jobPlace'] = array[1];
                            //到岗时间
                            syncResume[currentPara.key]['dutyTimeName'] = '';
                        } else if (jobIntentionIndex == 2) {
                            var array = currentVal.split("|");
                            //期望月薪
                            syncResume[currentPara.key]['expectSalaryName'] = array[0];
                            //期望从事行业
                            syncResume[currentPara.key]['jobIndustry'] = array[1];
                            //期望工作性质
                            syncResume[currentPara.key]['jobTypeName'] = array[2];
                        }
                        jobIntentionIndex++;
                    } else if (currentInfo == '教育经历') {
                        syncResume[currentPara.key].push(fillEducationExperience(currentVal, index, i));
                    } else if (currentInfo == '工作经历') {
                        var result = fillWorkExperience(syncResume, currentPara.key, currentArrayIndex, currentVal, index, i);
                        syncResume = result.syncResume;
                        currentArrayIndex = result.currentArrayIndex;
                    } else if (currentInfo == '项目经验') {
                        if (currentKey == '项目名称') {
                            projectIndex++;
                            var currentValues = currentVal.split(" ");
                            if (!syncResume[currentPara.key]) {
                                syncResume[currentPara.key] = [];
                            }
                            syncResume[currentPara.key][projectIndex] = {};
                            if (moment(currentValues[0], 'YYYY.MM').isValid()) {
                                syncResume[currentPara.key][projectIndex].projectStartDate = moment(currentValues[0], 'YYYY.MM').format("YYYY/MM/DD");
                            }
                            if (moment(currentValues[2], 'YYYY.MM').isValid()) {
                                syncResume[currentPara.key][projectIndex].projectEndDate = moment(currentValues[0], 'YYYY.MM').format("YYYY/MM/DD");
                            }
                            syncResume[currentPara.key][projectIndex].projectName = currentValues[4];
                        } else if (currentKey == '责任描述') {
                            syncResume[currentPara.key][projectIndex].responsibilities = currentVal;
                        } else if (currentKey == '项目描述') {
                            syncResume[currentPara.key][projectIndex].projectDescribe = currentVal;
                        }
                    }
                }

                //sex 性别
                syncResume.sexName = item['性别'];
                //born 出生日期
                syncResume.birthday = getDateByString(item['出生日期']);
                //age 年龄
                syncResume.age = parseInt(moment().diff(syncResume.birthday, 'year'));
                //work 工作年限
                syncResume.workName = item['工作年限'];
                //education 最高学历
                syncResume.educationName = item['最高学历'];
                //register 户口所在地
                syncResume.registerAddress = item['户口'];
                //applyPosition 应聘岗位
                syncResume.applyPosition = item['应聘职位'];
                //sendTime 简历投递时间
                var sendTime = isRd5() || isRd6() || isIHR() ? item['投递时间'] : item['投递(收藏)时间'];
                syncResume.sendTime = sendTime ? moment(sendTime, "YYYY-MM-DD").format("YYYY/MM/DD") : moment(new Date()).format("YYYY/MM/DD");
                //移动电话(待沟通的简历在excel能够获取到电话信息)
                syncResume.mobile = syncResume.mobile ? syncResume.mobile : item['移动电话'];
                //电子邮件
                syncResume.email = syncResume.email ? syncResume.email : item['电子邮件'];

                if (syncResume.mobile) {
                    syncResumes.push(syncResume);
                }
                tempUploadedRecords[syncResume.applyPosition + '-' + syncResume.resumeId] = syncResume.mobile;
            } catch (e) {
                showProcessMessage("出现异常,已忽略:" + item['简历名称'] + " 简历。");
                console.error("解析简历出现异常:" + e.message);
                var params = {
                    "module": "智联招聘",
                    "content": e
                };
                JD.logToCenter(params);
            }
        });
        showProcessMessage("上传数据准备完成，共" + syncResumes.length + "份简历需要上传");
        uploadResumeData(syncResumes, tempUploadedRecords);
    }


    //日期转换方法
    function getDateByString(tempDate, format) {
        if (moment(tempDate, format).isValid()) {
            return moment(tempDate, format).format("YYYY/MM/DD")
        } else {
            return "";
        }
    }

    //填充教育经历
    function fillEducationExperience(currentVal, index, i) {
        //2014.08 - 2016.07  华南师范大学  金融学  大专
        var educationExperience = {};
        try {
            if (isRd5() || isRd6() || isIHR()) {
                //2011.02 - 2013.06 西华师范大学 经济管理 大专
                var eduInfo = currentVal.split(" ");
                //开始时间
                if (eduInfo[0].indexOf(".") > -1) {
                    educationExperience.startDate = $.trim(eduInfo[0].replace(".", "/")) + "/01";
                }
                if (eduInfo[2].indexOf(".") > -1) {
                    //结束时间
                    educationExperience.endDate = $.trim(eduInfo[2].replace(".", "/")) + "/01";
                }
                //学校
                educationExperience.school = eduInfo[3];
                //专业
                educationExperience.major = eduInfo[4];
                //学历
                educationExperience.educationName = eduInfo[5];
            } else {
                //起止日期 学校 专业 学历
                var eduInfo = currentVal.split("  ");
                var educationPeriod = eduInfo[0].split("-");
                //开始时间
                if (educationPeriod[0].indexOf(".") > -1) {
                    educationExperience.startDate = $.trim(educationPeriod[0].replace(".", "/")) + "/01";
                }
                if (educationPeriod[1].indexOf(".") > -1) {
                    //结束时间
                    educationExperience.endDate = $.trim(educationPeriod[1].replace(".", "/")) + "/01";
                }
                //学校
                educationExperience.school = eduInfo[1];
                //专业
                educationExperience.major = eduInfo[2];
                //学历
                educationExperience.educationName = eduInfo[3];
            }
            return educationExperience;
        } catch (e) {
            showProcessMessage("第" + parseInt(index + 1) + "份简历，第" + i + "行解析教育经历失败，已忽略教育经历：" + e.message);
            var params = {
                "module": "智联招聘",
                "content": e
            };
            JD.logToCenter(params);
            console.log(e);
        }
    }

    //填充工作经验列表
    function fillWorkExperience(syncResume, key, currentArrayIndex, currentVal, index, i) {
        try {
            var arrayIndex = Math.floor(currentArrayIndex / 5);
            var workExperience = {};
            if (currentArrayIndex % 4 == 1) {
                if (isRd5() || isRd6() || isIHR()) {
                    //2016.07 - 2017.11 中国平安 （1年5个月）
                    var workInfo = currentVal.split(" ");
                    //开始时间
                    if ($.trim(workInfo[0].replace(".", "/")).length === 7) {
                        workExperience.startDate = $.trim(workInfo[0].replace(".", "/")) + "/01";
                    }
                    if ($.trim(workInfo[2].replace(".", "/")).indexOf('至今') < 1 && $.trim(workInfo[2].replace(".", "/")).length === 7) {
                        //结束时间
                        workExperience.endDate = $.trim(workInfo[2].replace(".", "/")) + "/01";
                    }
                    //工作单位
                    workExperience.workUnit = workInfo[3];
                } else {
                    //2015.10 - 2016.10  重庆上层建筑工程有限公司  （1年）
                    //起止日期 公司 总共月份
                    var workInfo = currentVal.split("  ");
                    //开始年月 结束年月
                    var workPeriod = workInfo[0].split("-");
                    //开始时间
                    if ($.trim(workPeriod[0].replace(".", "/")).length === 7) {
                        workExperience.startDate = $.trim(workPeriod[0].replace(".", "/")) + "/01";
                    }
                    if ($.trim(workPeriod[1].replace(".", "/")).indexOf('至今') < 1 && $.trim(workPeriod[1].replace(".", "/")).length === 7) {
                        //结束时间
                        workExperience.endDate = $.trim(workPeriod[1].replace(".", "/")) + "/01";
                    }
                    //工作单位
                    workExperience.workUnit = workInfo[1];
                }
            } else {
                workExperience = syncResume[key][arrayIndex];
                if (currentArrayIndex % 4 == 2) {
                    //职位 + 薪资
                    workExperience.position = currentVal.split(' | ')[0];
                } else if (currentArrayIndex % 4 == 3) {
                    var colsInfo = currentVal.split(' | ');
                    for (var colIndex in colsInfo) {
                        if (colIndex == 0) {
                            //公司行业
                            workExperience.companyIndustryName = colsInfo[colIndex];
                        } else {
                            var cellInfo = colsInfo[colIndex].split('：');
                            if (cellInfo[0] === '企业性质') {
                                workExperience.companyNutureName = cellInfo[1];
                            } else if (cellInfo[0] === '规模') {
                                workExperience.companyScaleName = cellInfo[1];
                            }
                        }
                    }
                } else if (currentArrayIndex % 4 == 0) {
                    // 工作内容
                    workExperience.jobContent = currentVal;
                    //清空计数
                    currentArrayIndex = 0;
                }
            }
            syncResume[key][arrayIndex] = workExperience;
            currentArrayIndex++;
        } catch (e) {
            showProcessMessage("第" + parseInt(index + 1) + "份简历，第" + i + "行解析工作经历失败，已忽略工作经验:" + e.message);
            var params = {
                "module": "智联招聘",
                "content": e
            };
            JD.logToCenter(params);
            console.log(e);
        }
        return {
            syncResume: syncResume,
            currentArrayIndex: currentArrayIndex
        }
    }

    /**
     * 上传简历到数据库
     *
     * @param syncResumes 要上传的简历列表
     * @param tempUploadedRecords 上传成功简历基本信息集【临时】
     */
    function uploadResumeData(syncResumes, tempUploadedRecords) {
        console.log('上传简历：',syncResumes);
        if (JD.jdAccount === undefined) {
            console.log("未使用插件账号登陆");
            return;
        }
        var jdAccount = JD.jdAccount.account;
        console.log('发送上传简历信息：',syncResumes);
        chrome.runtime.sendMessage({
            jd: "uploadResume", 
            url: jdAccount.receiveURL, 
            data: {
                'data_str': JSON.stringify({
                    resumeSiteUid: jdAccount.resumeSiteUid,
                    siteOrganizationName: siteLoginCompanyName,
                    resumes: syncResumes
                })
            }
        }, function (res) {
            console.log('上传成功之后》》》',res);
            //简历上传成功的场合
            if (res.code === 200) {

                //清空简历缓存
                localStorage.setItem(siteLoginAccount + "_zhaopin_downloadResumes", null);
                localStorage.setItem(siteLoginAccount + "_zhaopin_syncResumes", null);

                //上传成功简历基本信息集合并处理 && 持久化到localStorage
                $.extend(successUploadedRecords, tempUploadedRecords);
                localStorage.setItem(siteLoginAccount + "_zhaopin_successUploadedRecords", JSON.stringify(successUploadedRecords));

                //清空简历内存
                downloadResumes = {};

                showProcessMessage(res.message);
            }
            //简历上传失败的场合
            else {
                localStorage.setItem(siteLoginAccount + "_zhaopin_syncResumes", JSON.stringify(syncResumes));
                //重新保存 记录日志
                showProcessMessage("上传失败，稍后请手动刷新，重新上传：" + (JSON.stringify(res)));
                console.log(res);
                console.log(syncResumes);
            }

            //上传数+1
            uploadedResumePageSize++;

            //当所有的数据上传完成后
            if (uploadedResumePageSize == totalLoadResumePageSize) {
                if (existsChangeSubAccountBtn()) {
                    showProcessMessage("所有简历已上传完毕，" + (getSiteSecurityPolicy().resumeUploadedSwitchAccountTime / 1000) + "秒后将自动切换账号。");
                    changeSubAccount();
                } else {
                    showProcessMessage("所有简历已上传完毕。");
                }
            }
        })
    }

    /***
     * 是否存在切换子账号按钮
     * @returns {boolean}
     */
    function existsChangeSubAccountBtn() {
        return $("a.rd55-header__base-button[href*='//ihr.zhaopin.com/loginPoint/choose.do']").length > 0
            || $("a.rd55-header__base-button[href*='//rd5.zhaopin.com/account/switch?backUrl']").length > 0;
    }

    /**
     * 切换子账号
     */
    function changeSubAccount() {
        //从缓存中获取已完成的列表
        var accountDataList = JSON.parse(localStorage.getItem("complete_account_data_list") || "[]");

        //更新已完成的子账号列表数据
        accountDataList.push(currentOrgId);

        //存在缓存中
        localStorage.setItem("complete_account_data_list", JSON.stringify(accountDataList));

        //账号切换
        setTimeout(function () {
            window.location.href = "https://ihr.zhaopin.com/loginPoint/choose.do?bkurl=%2F%2Frd5.zhaopin.com&complete_account=" + accountDataList.join(",");
        }, getSiteSecurityPolicy().resumeUploadedSwitchAccountTime);
    }

    //向页面注入JS
    function injectCustomJs(jsPath) {
        jsPath = jsPath || 'scripts/zhaopin/zhaopin_injected_script.js';

        var scriptTag = document.createElement('script');
        //类型
        scriptTag.setAttribute('type', 'text/javascript');
        //获得的地址类似：chrome-extension://ihcokhadfjfchaeagdoclpnjdiokfakg/js/inject.js
        scriptTag.src = chrome.extension.getURL(jsPath);
        document.head.appendChild(scriptTag);
    }

    //向页面注入变量
    function injectCustomVariable(variableName, variableValue) {
        var script = document.createElement("script");
        script.type = "text/javascript";
        script.innerHTML = "window." + variableName + " = " + variableValue;
        document.getElementsByTagName("HEAD")[0].appendChild(script);
    }

    //监听injected-script传递的信息
    window.addEventListener('message', function (event) {
        var messageJson = event.data;
        //解析简历
        if (messageJson.action == "parseResume") {
            var workbook = XLSX.read(messageJson.xls, {type: "binary"});
            var resumeJson = XLSX.utils.sheet_to_json(workbook.Sheets['下载简历列表']);
            //解析文件
            parseResume(messageJson.resumesResult, resumeJson, workbook);
        }
        //保存总加载的待沟通简历页数
        else if (messageJson.action == "saveTotalLoadResumePageSize") {
            totalLoadResumePageSize = messageJson.pageSize;
            currentOrgId = messageJson.currentOrgId;
            //无数据，则切换账号
            if (totalLoadResumePageSize == 0) {
                changeSubAccount();
            }
        }
        //上传简历
        else if (messageJson.action == "uploadResume") {
            uploadResumeData(messageJson.syncResumes, {});
        }
    });

    function getSiteSecurityPolicy() {
        var config = $.extend(JD.jdAccount.account.siteSecurityPolicy, {
            'beginHandleAccountTipsTime': 2000,//开始处理账号提示时间
            'injectResumeExecuteScriptTime': 1500,//注入简历执行脚本时间
            'resumeMarkToWaitHandleIntervalTime': 500,//简历标记为待处理时间隔
            'beginWaitCommunicateTime': 500,//开始所有待沟通简历时间
            'everyPageResumeLoadingHandleEventIntervalTime': 2000,//每页简历加载后处理事件间隔
            'searchApplyPositionInfoIntervalTime': 2000,//取得投递岗位信息间隔
            'beginDownloadResumeTime': 2500,//开始下载简历时间
            'validateFileReadiedIntervalTime': 5000,//验证文件是否准备完毕间隔
            'beginDownloadFileIntervalTime': 1000,//开始下载文件时间间隔
            'downloadFileRetryIntervalTime': 1500,//下载文件失败重新尝试时间间隔
            'resumeUploadedSwitchAccountTime': 2000,//上传完所有简历切换账号时间
        });
        console.log("时间配置信息111111：", config);
        return config;
    }

    //消息处理工具类
    var ZhaopinImUtils = function () {
        var _this = this;
        //是否在运行
        this.working = false;
        //已处理人数
        this.finishNumber = 0;

        this.pageIndex = 1;
        //获取UTIL的工作条
        this.getToolDiv = function () {
            var toolDiv = $('#jd_toolDiv');
            if (!toolDiv.length) {
                var container = $('<div id="jd_container" class="jd_container" style="-webkit-user-select: none;user-select: none;color:#fff;position: fixed;left:0;right:0;bottom:0;z-index: 2000;width: 800px;text-align:center;margin:auto;"></div>');
                var subContainer = $('<div id="jd_subContainer" style="width:100%;background-color:#4582A7;margin:auto">' +
                    '                    <h3 style="margin:auto;border-bottom: solid 1px #e3e3e3;padding: 5px 0;">自动消息处理<span></span></h3>' +
                    '                    <label id="jd_subContainer_close" style="position: absolute; top: 7px;right: 5px; width: 20px;cursor: pointer;">X</label>' +
                    '                    <div id="jd_toolDiv" style="padding: 0 10px;display:none"></div>' +
                    '                 </div>');
                subContainer.appendTo(container);
                container.appendTo($('body'));
                toolDiv = $('#jd_toolDiv');
                //鼠标经过
                container.hover(function () {
                    subContainer.css({opacity: 1});
                    if (toolDiv.is(':hidden')) {
                        subContainer.find('h3>span').text('▲');
                    } else {
                        subContainer.find('h3>span').text('▼');
                    }
                }, function () {
                    subContainer.find('h3>span').text('');
                });
                container.find('h3').click(function () {
                    toolDiv.slideToggle();
                });
                $("#jd_subContainer_close").click(function () {
                    if (confirm("确定要关闭吗？")) {
                        $('#jd_container').remove();
                    }
                });
            }
            return toolDiv;
        }
        this.runTool = function () {
            var textStyle = "color: #fff;font-size: 12px;height:35px;vertical-align: middle;";
            var formControlStyle = "width: 146px;text-indent: 5px; font-size: 12px; height: 30px; padding: 0; border-radius: 0; line-height: 1.5; color: #555; background-image: none; border: 0px solid #ccc; display: block;";
            var btnStyle = "width: 100px;color:#fff;background-color: #e96a59;margin: 0 30px 0 0;height: 30px;padding: 2px 4px;line-height: 22px;border: 0;border-radius: 3px;font-size: 12px;";
            var table = '<table style="width:100%;margin: 0;text-align: left;border-collapse:collapse;padding: 0 5px">' +
                '           <tr>' +
                '              <td style="' + textStyle + 'width: 20%"><label>*</label>性别</td>' +
                '              <td style="' + textStyle + 'width: 20%"><label>*</label>年龄（起）</td>' +
                '              <td style="' + textStyle + 'width: 20%"><label>*</label>年龄（止）</td>' +
                '              <td style="' + textStyle + 'width: 40%">执行消息</td>' +
                '           </tr>' +
                '           <tr>' +
                '              <td>' +
                '                  <select id="jdToolSex" placeholder="请选择性别" style="' + formControlStyle + 'text-indent: 2px;">' +
                '                      <option value="">全部</option>' +
                '                      <option value="男">男</option>' +
                '                      <option value="女">女</option>' +
                '                  </select>' +
                '              </td>' +
                '              <td>' +
                '                 <input type="number" id="jdToolAgeFrom" placeholder="请输入年龄（起）" style="' + formControlStyle + '" min="16" max="100"/>' +
                '              </td>' +
                '              <td>' +
                '                 <input type="number" id="jdToolAgeTo" placeholder="请输入年龄（止）" style="' + formControlStyle + '" min="16" max="100"/>' +
                '              </td>' +
                '              <td rowspan="5">' +
                '                  <div id="jdMessageContainer" style="height: 160px;background-color: #f3f3f3;overflow-y: auto;font-size: 12px;color: #333;padding: 0 10px;width: 310px;">' +
                '                     <p>未执行</p>' +
                '                  </div>' +
                '              </td>' +
                '           </tr>' +
                '           <tr>' +
                '              <td colspan="3" style="' + textStyle + '"><label>*</label>符合条件关键字(多个关键字使用逗号隔开)</td>' +
                '           </tr>' +
                '           <tr>' +
                '              <td colspan="3">' +
                '                  <input type="text" id="jdToolKeyword" placeholder="如：审核,客服" style="' + formControlStyle + 'width: 460px;">' +
                '               </td>' +
                '           </tr>' +
                '           <tr>' +
                '              <td colspan="3" style="' + textStyle + '">敏感关键字(不合适)</td>' +
                '           </tr>' +
                '           <tr>' +
                '              <td colspan="3"><input type="text" id="jdToolSensitiveWord" placeholder="如：今日头条,字节跳动,抖音" style="' + formControlStyle + 'width: 460px;">' +
                '           </tr>' +
                '           <tr>' +
                '             <td colspan="4" style="padding:10px 0;text-align: right;">' +
                '                <input id="jdToolCopyBtn" type="button" value="复制消息" class="btn" style="' + btnStyle + ';background-color: #5dd5c8;"/>' +
                '                <input id="jdToolBtn" type="button" value="开始处理" class="btn" style="' + btnStyle + '"/>' +
                '             </td>' +
                '          </tr>' +
                '       </table>';
            var toolDiv = _this.getToolDiv();
            toolDiv.empty();
            $(table).appendTo(toolDiv);

            var jdStorage = _this.getJdStorage();
            //填充存储的条件值
            if (jdStorage.jdToolSex) {
                $("#jdToolSex").val(jdStorage.jdToolSex);
            }
            if (jdStorage.jdToolAgeFrom) {
                $("#jdToolAgeFrom").val(jdStorage.jdToolAgeFrom);
            }
            if (jdStorage.jdToolAgeTo) {
                $("#jdToolAgeTo").val(jdStorage.jdToolAgeTo);
            }
            if (jdStorage.jdToolKeyword) {
                $("#jdToolKeyword").val(jdStorage.jdToolKeyword);
            }
            if (jdStorage.jdToolSensitiveWord) {
                $("#jdToolSensitiveWord").val(jdStorage.jdToolSensitiveWord);
            }

            //按钮事件
            $('#jdToolBtn').unbind('click').on('click', function () {
                _this.triggerWorkingStatus();
            });

            var clipboard = new ClipboardJS("#jdToolCopyBtn", {
                text: function () {
                    var content = '';
                    $("#jdMessageContainer p").each(function () {
                        content += $(this).text() + "\r\n"
                    });
                    return content;
                }
            });
            clipboard.on('success', function (e) {
                alert("复制成功，去粘贴看看吧！");
            });
            clipboard.on('error', function (e) {
                alert("复制失败！请手动复制");
            });
        }

        //触发更新工作条状态
        this.triggerWorkingStatus = function (trigger) {
            if (_this.working) {
                _this.stop();
            } else {
                //校验条件
                var jdStorage = _this.getJdStorage();
                jdStorage.jdToolSex = $('#jdToolSex').val();
                jdStorage.jdToolAgeFrom = $('#jdToolAgeFrom').val();
                jdStorage.jdToolAgeTo = $('#jdToolAgeTo').val();
                jdStorage.jdToolKeyword = $('#jdToolKeyword').val();
                jdStorage.jdToolSensitiveWord = $('#jdToolSensitiveWord').val();

                if (jdStorage.jdToolSex && jdStorage.jdToolAgeFrom && jdStorage.jdToolAgeTo && jdStorage.jdToolKeyword) {
                    _this.working = true;
                    $('#jdToolBtn').val('停止处理');
                    _this.saveJdStorage(jdStorage);
                    _this.appendMessage("开始自动处理");
                    _this.sendExecuteLogData();
                    _this.startExecute();
                } else {
                    alert("请完善插件配置信息。");
                    _this.stop();
                }
            }
        }

        this.startExecute = function () {
            //选中未读消息
            var rippleBtn = $("button.km-checkbox__ripple");
            if (!rippleBtn.prev().hasClass("km-checkbox__icon--checked")) {
                rippleBtn.trigger("click");
            }

            setTimeout(_this.handleImList, 2000, 0);
        }

        this.handleImList = function (index) {
            if (!_this.working) {
                return;
            }
            var item = $("span.km-list__items>div:eq(" + index + ")");
            if (item.length == 1) {
                item.trigger("click");
            } else {
                _this.appendMessage("没有可处理的数据。");
                _this.stop();
            }

            new Promise(function (resolve, reject) {
                setTimeout(function () {
                    _this.handleResume();
                    resolve();
                }, 4500);
            }).then(function () {
                index++;
                if ($("span.km-list__items>div").length == index + 1) {
                    _this.appendMessage("当前列表数据已处理完毕。");
                    _this.stop();
                } else {
                    setTimeout(_this.handleImList, 2500, index);
                }
            });
        }

        this.handleResume = function () {
            if (!_this.working) {
                return;
            }
            _this.finishNumber++;
            //符合条件
            if (_this.validateResume()) {
                $("div.im-action-button>button").find("i.sati-phone-im").parents("button").trigger("click");
                //输出日志
                _this.appendMessage("已完成索要电话，已处理人数：<b>" + _this.finishNumber + "</b>");
            }
            //不符合
            else {
                $("div.im-action-button>button").find("i.sati-ban").parents("button").trigger("click");
                //输出日志
                _this.appendMessage("已做不符合处理，已处理人数：<b>" + _this.finishNumber + "</b>");
            }
        }

        this.validateResume = function () {
            var name = $("a.ui-resume-detail-candidate__name--username").text();
            var sex = $("div.ui-resume-detail-candidate__basic--row>span:first").text();
            var age = $("div.ui-resume-detail-candidate__basic--row>span:eq(1)").text().replace("岁", "");
            var workExperience = $("div.ui-resume-detail__work-experience").text();
            //没有获取到数据
            if (name == "" || name == null) {

                return;
            }

            //分割线
            _this.appendMessage("<h1 style=\"border-top: 1px dotted;height: 1px;display: block;\"></h1>");
            _this.appendMessage(name + "/" + sex + "/" + age + "：" + workExperience);

            var jdStorage = _this.getJdStorage();
            //性别
            if (jdStorage.jdToolSex != "" && sex != jdStorage.jdToolSex) {
                _this.appendMessage("忽略打招呼：" + name + "性别不匹配。");
                return false;
            }

            //年龄
            if (!(age - jdStorage.jdToolAgeFrom >= 0 && age - jdStorage.jdToolAgeTo <= 0)) {
                _this.appendMessage("忽略打招呼：" + name + "年龄不匹配。");
                return false;
            }

            //屏蔽的关键字
            var sensitiveWord = jdStorage.jdToolSensitiveWord;
            //判断是否存在屏蔽的关键字
            if (sensitiveWord) {
                var sensitiveWords = sensitiveWord.replaceAll("，", ",").split(",");
                for (var j = 0, wLen = sensitiveWords.length; j < wLen; j++) {
                    var word = sensitiveWords[j];
                    if (workExperience.indexOf(word) > -1) {
                        _this.appendMessage("忽略打招呼：" + name + "包含屏蔽关键字：<i>" + word + "</i>");
                        return false;
                    }
                }
            }

            //符合关键字
            var keywords = jdStorage.jdToolKeyword ? jdStorage.jdToolKeyword.replaceAll("，", ",").split(",") : [];
            //判断是否匹配关键字
            var keywordMatch = keywords.length == 0;
            for (var j = 0, wLen = keywords.length; j < wLen; j++) {
                var word = keywords[j];
                if (workExperience.indexOf(word) > -1) {
                    keywordMatch = true;
                }
            }
            if (!keywordMatch) {
                _this.appendMessage("忽略打招呼：" + name + "求职期望不符合。");
                return false;
            }

            return true;
        }

        this.appendMessage = function (msg) {
            var container = $("#jdMessageContainer");
            container.append("<p>" + msg + "</p>").scrollTop(container.prop("scrollHeight"));
        }

        //获取localstorage中的插件设置
        this.getJdStorage = function () {
            return JSON.parse(window.localStorage.getItem('jdStorage')) || {};
        }

        //更新保存localstorage中的插件设置
        this.saveJdStorage = function (jdStorage) {
            window.localStorage.setItem('jdStorage', JSON.stringify(jdStorage));
        }

        this.stop = function () {
            $('#jdToolBtn').val('开始处理');
            _this.working = false;
            _this.appendMessage("已停止处理。");
        }

        this.sendExecuteLogData = function () {
            var jdAccount = JD.jdAccount.account;
            var jdStorage = JSON.stringify(_this.getJdStorage());
            jdStorage = jdStorage.replace("jdToolSex", "性别");
            jdStorage = jdStorage.replace("jdToolAgeFrom", "年龄（起）");
            jdStorage = jdStorage.replace("jdToolAgeTo", "年龄（止）");
            jdStorage = jdStorage.replace("jdToolKeyword", "符合关键字");
            jdStorage = jdStorage.replace("jdToolSensitiveWord", "忽略关键字");

            chrome.runtime.sendMessage({
                jd: "operationLog",
                url: jdAccount.operationLogURL,
                data: {
                    'siteLoginAccount': jdAccount.siteLoginAccount,
                    'resumeSiteUid': jdAccount.resumeSiteUid,
                    'operationActionCd': '02',
                    'operationActionParameters': jdStorage
                }
            }, function (res) {

            })
        }

        String.prototype.replaceAll = function (s1, s2) {
            return this.replace(new RegExp(s1, "gm"), s2);
        }
    }
}(jQuery, XLSX, moment, JdUtils));
