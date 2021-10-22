(function ($, _, moment, _jd) {
        'use strict';

        var JD = new _jd('ganji');
        //插件方法入口
        var startExecute = function () {
            //移除企业的信息 做退出登录
            $(document).on('click', 'div.jpb-tips>a.link-gray:last', function () {
                chrome.storage.sync.remove('targetCompany');
                JD.jdAccount.logout();
            });

            //未登录 进行登录操作
            if (!JD.jdAccount.isLogin() && ($('a.js-signout-btn').length || window.location.href.indexOf('www.ganji.com/user/login_success.php') > -1)) {
                JD.jdAccount.login();
            }

            var options = {};
            //登录方法
            if (!JD.jdAccount.isLogin()) {
                options.login = function (jdAccount) {
                    $('input[name="login_username"]').attr('readOnly', 'readOnly').val(jdAccount.siteLoginAccount);
                    $('input[name="login_password"]').attr('readOnly', 'readOnly').val(jdAccount.siteLoginPassword);
                    $('input:checkbox[name="setcookie"]').prop('checked', false);
                    setTimeout(function () {
                        if (!JD.jdAccount.isLogout() && !$('#need_checkcode:visible').length) {
                            $('input.btn-org[data-role="submit"]').trigger('click');
                        }
                    }, 1000)
                };
                options.loginURL = 'https://passport.ganji.com/login.php';
                chrome.storage.sync.remove('targetCompany', function () {
                    JD.login(options);
                });
            }
            //已登录的场合
            else if (window.location.href.indexOf('hrvip.ganji.com/resume_received/index') > -1) {
                //网站账号对应简历投递目标公司名称及地址
                var targetCompany;
                chrome.storage.sync.get('targetCompany', function (item) {
                    targetCompany = item.targetCompany;
                });

                //解析excel简历信息
                options.processWorkbook = function (workbook) {
                    var thisObj = this;
                    var resumes = [];

                    //获取第一个工作表【简历列表】
                    var list = workbook.Sheets[workbook.SheetNames[0]];

                    //取得简历数据范围
                    var range = list['!ref'].split(':', 2);

                    //每行简历信息总列数
                    var colTotal = thisObj.excelCellCodeList.indexOf(range[1].substring(0, 1));

                    //总简历行数
                    var rowTotal = parseInt(range[1].substring(1), 10);
                    //简历解析失败件数
                    var failureCount = 0;
                    //简历解析模式窗口
                    var modalWindow = thisObj.getModal();

                    //过滤标题行从第2行开始解析简历信息
                    //注：赶集的range与其他网站range不同，此处的i < rowTotal即可
                    for (var i = 2; i < rowTotal; i++) {
                        //取得简历实体对象
                        var resumeInfo = thisObj.getResumeInfo();
                        try {
                            //循环A-Z列
                            for (var k in thisObj.excelCellCodeList) {
                                //取得指定行中对应的单元格（如：A1，B1，C1）
                                var cell = list[thisObj.excelCellCodeList[k] + i];

                                //单元格为空，处理跳过
                                if (!cell) continue;

                                var value = cell.v || '';

                                //根据第一行单元格的标题匹配简历信息
                                switch (list[thisObj.excelCellCodeList[k] + '1'].v) {
                                    case '姓名':
                                        resumeInfo.name = value;
                                        break;
                                    case '性别':
                                        resumeInfo.sexName = value;
                                        break;
                                    case '年龄':
                                        resumeInfo.age = parseInt(value);
                                        break;
                                    case '期望薪资':
                                        resumeInfo.expectSalaryName = value;
                                        break;
                                    case '应聘职位标题':
                                        resumeInfo.applyPosition = value;
                                        break;
                                    case '期望工作地点':
                                        resumeInfo.jobPlace = value;
                                        break;
                                    case '求职职位':
                                        resumeInfo.objectiveJob = value;
                                        break;
                                    case '工作年限':
                                        resumeInfo.workName = value;
                                        break;
                                    case '手机':
                                        var mobile = String(value);
                                        if (mobile.indexOf('-') > -1) {
                                            mobile = mobile.substring(mobile.indexOf('-') + 1);
                                        }
                                        resumeInfo.mobile = mobile;
                                        break;
                                    case '电子邮件':
                                        resumeInfo.email = value;
                                        break;
                                    case '学历':
                                        resumeInfo.educationName = value;
                                        break;
                                    case '投递/下载时间':
                                        var sendTime = value;
                                        resumeInfo.sendTime = sendTime.split("-")[0] + "/" + sendTime.split("-")[1] + "/" + sendTime.split("-")[2];
                                        break;
                                    default:
                                        break;
                                }
                                //超过简历信息总列数，处理中止
                                if (parseInt(k, 10) === colTotal) break;
                            }
                            //自我介绍
                            var introduction = workbook.Sheets[workbook.SheetNames[(i - 1)]][thisObj.excelCellCodeList[1] + 19];
                            //自我介绍
                            resumeInfo.introduction = introduction ? introduction.v : '';
                            //投递公司【根据网站账号对应简历投递目标公司名称及地址补全投递公司及工作地址信息】
                            resumeInfo.applyCompany = targetCompany.applyCompany;
                            //工作地址
                            resumeInfo.workAddress = targetCompany.workAddress;
                            thisObj.processInvalidColumn(resumeInfo);
                            resumes.push(resumeInfo);
                        } catch (e) {
                            var params = {
                                "module": "赶集网",
                                "content": e
                            };
                            JD.logToCenter(params);
                            modalWindow.append('<strong style="color:#f22c40">解析' + resumeInfo.sendTime + '-' + resumeInfo.name + '(' + resumeInfo.mobile + ')-' + resumeInfo.applyPosition + '失败，该简历格式存在特殊情况</strong>');
                            thisObj.syncExcelProcessException(e, resumeInfo);
                            failureCount++;
                        }
                    }
                    modalWindow.append('总数量' + (rowTotal - 2) + '，成功解析<strong style="color:#00cc66">' + resumes.length + '</strong>，失败<strong style="color:#f22c40">' + failureCount + '</strong>');
                    return resumes;
                };

                //下载导出简历excel
                var downloadJD = function () {
                    var thisObj = this;
                    var timestamp = moment().format('YYYYMMDD');
                    var dayExported = thisObj.getJdDayExported();
                    if (!dayExported[timestamp]) {
                        dayExported = {};
                        dayExported[timestamp] = [];
                    }
                    var exported = thisObj.getJdExported();
                    if (!exported[thisObj.siteTypeCd]) {
                        exported[thisObj.siteTypeCd] = [];
                    }
                    var workTime = $.trim($('div.frm-search>.js-row:last>dl>dd.work-time').text());
                    var workTimeFormat = 'MM-DD';
                    if (workTime.length >= 10) {
                        workTimeFormat = "YYYY-MM-DD";
                    }
                    var nextPage = thisObj.assertAfterDateCondition(workTime, workTimeFormat) && $('div.pageBox>.pageLink>li>a.next').length > 0;
                    var rowIdx = [];
                    $('div.frm-search>.js-row').each(function (idx, item) {
                        if (!thisObj.assertAfterDateCondition($.trim($(item).find('dl>dd.work-time').text()), 'MM-DD')) {
                            return;
                        }
                        var itemInfo = $(item).find('dt.name>a.js-resume-link');
                        if (!itemInfo.length) {
                            return;
                        }
                        var resumeId = itemInfo.attr('href');

                        var id = resumeId + $(item).find('dt.deliver>a').attr('href');

                        $(item).find('input[name="cb_pid"]').prop('checked', true);
                        rowIdx.push(idx);
                        dayExported[timestamp].push(resumeId);
                        exported[thisObj.siteTypeCd].push(id);
                    });

                    //翻页方法
                    var nextStep = function (nextPage) {
                        if (nextPage) {
                            setTimeout(function () {
                                var span = $('<span>&nbsp;</span>');
                                $('div.pageBox>.pageLink>li>a.next').append(span);
                                span.trigger('click');
                            }, 1000 * (Math.ceil(Math.random() * 3) + 4));
                        } else {
                            thisObj.syncRuipin(6);
                        }
                    };

                    //构建下载URL
                    var buildDownloadURL = function (args) {
                        var text = $('body > div.jpb-bg > script').text();
                        var startText = 'resume.run({"datalist":';
                        var start = text.indexOf(startText);
                        var end = text.indexOf('GJ.use(\'jquery\', function() {');
                        var exportUrl = 'http://hrvip.ganji.com/export/batch_export/?source=1&user_id=0'
                        var jobId = '&findjob_puid=';
                        var wantedId = '&wanted_puid=';
                        var time = '&time=';
                        var datas = JSON.parse(text.substring(start + startText.length, end - 8));
                        for (var k in args) {
                            var data = datas[args[k]];
                            jobId += data.findjob_puid + ',';
                            wantedId += data.wanted_puid + ',';
                            time += data.receive_time + ',';
                        }
                        return exportUrl + jobId.substring(0, jobId.length - 1) + wantedId.substring(0, wantedId.length - 1) + time.substring(0, time.length - 1);
                    };

                    if (rowIdx.length) {
                        var downloadURL = buildDownloadURL(rowIdx);
                        var modalWindow = thisObj.getModal().append('开始解析本页Excel');
                        thisObj.request({
                            forms: [{action: downloadURL, type: 'GET'}],
                            responseType: 'arraybuffer',
                            callback: function () {
                                if (thisObj.getResumeSize() > 2) {
                                    thisObj.syncRuipin(6, nextStep, [nextPage]);
                                } else {
                                    nextStep(nextPage);
                                }
                            },
                            onload: function () {
                                var data = new Uint8Array(this.response);
                                var arr = new Array();
                                for (var i in data) {
                                    arr.push(String.fromCharCode(data[i]));
                                }
                                try {
                                    var workbook = _.read(arr.join(""), {type: "binary"});
                                    modalWindow.append('简历读取成功，开始解析Excel');
                                    var resumes = thisObj.getResumes();
                                    Array.prototype.push.apply(resumes, thisObj.processWorkbook.apply(thisObj, [workbook]));
                                    thisObj.setResumes(resumes)
                                } catch (e) {
                                    var params = {
                                        "module": "赶集网",
                                        "content": e
                                    };
                                    JD.logToCenter(params);
                                    modalWindow.append('<strong style="color:red">Excel读取错误，尝试重新读取</strong>');
                                    return false;
                                }
                                thisObj.syncJdDayExported(dayExported);
                                thisObj.syncJdExported(exported);
                                modalWindow.append('Excel解析成功');
                                return true;
                            }
                        });
                    } else {
                        nextStep(nextPage);
                    }
                };
                options.downloadJD = downloadJD;
                options.url = 'http://hrvip.ganji.com/resume_received/index?tab=all&view_mode=list';
                JD.init(options);
            } else if (window.location.href.indexOf('hrvip.ganji.com/') > -1 && $('div.sidebar_tp').length) {
                //网站账号对应简历投递目标公司名称及地址
                chrome.storage.sync.get('targetCompany', function (item) {
                    if (!item.targetCompany) {
                        var url = $('div.sidebar_tp>p.name_editor>a.editor_lt').attr('href');
                        $.ajax({
                            url: url,
                            async: false,
                            type: 'GET',
                            success: function (response) {
                                var dom = $(response);
                                //网站账号对应简历投递目标公司名称及地址【变量命名保持与投递记录表投递公司名称一致】
                                var targetCompany = {
                                    'applyCompany': dom.find('div.d-c-right.fl>.c-age:nth-of-type(1)>ul>li:nth-of-type(2)>em').text(),
                                    'workAddress': dom.find('div.d-c-right.fl>.c-age:nth-of-type(1)>ul>li:nth-of-type(5)>em').text()
                                };
                                chrome.storage.sync.set({'targetCompany': targetCompany}, function () {
                                    window.location.href = 'http://hrvip.ganji.com/resume_received/index?tab=all&view_mode=list';
                                });
                            }
                        });
                    } else {
                        window.location.href = 'http://hrvip.ganji.com/resume_received/index?tab=pending&view_mode=list';
                    }
                })
            } else {
                window.location.href = 'http://hrvip.ganji.com/';
            }
        };
        //插件工具条构建方法
        JD.needJdUtil(function () {
            if ($(document).data('jd_defer')) {
                var jdDeferInterval = setInterval(function () {
                    if (!$(document).data('jd_defer')) {
                        clearInterval(jdDeferInterval);
                        startExecute();
                    }
                }, 500);
            } else {
                startExecute();
            }
        })
    }(jQuery, XLSX, moment, JdUtils)
);