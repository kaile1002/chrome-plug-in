(function ($, _, moment, _jd) {
        'use strict';

        var JD = new _jd('huibo');
        //插件方法入口
        var startExecute = function () {
            var companyInfo;
            //退出登录并移除本地内存中的企业信息
            $(document).on('click', 'a.lnk[href="/login/dologout/"]', function () {
                chrome.storage.sync.remove('jdObjectCompany');
                JD.jdAccount.logout();
            });
            //未登录 进行登录操作
            if (!JD.jdAccount.isLogin() && ($('a.lnk[href="/login/dologout/"]').length)) {
                JD.jdAccount.login();
            }
            var options = {};
            //模拟登录
            if (!JD.jdAccount.isLogin()) {
                if ($('#divLoginInfo:visible').find('a.btn3.btnsF16[href="/login/dologout/"]').length) {
                    var span = $("<span>&nbsp;</span>");
                    $('a.btn3.btnsF16[href="/login/dologout/"]').append(span);
                    span.trigger('click');
                } else {
                    options.login = function (jdAccount) {
                        //用户名
                        $('input[name="txtUsername"]').attr('readOnly', 'readOnly').val(jdAccount.siteLoginAccount);
                        //密码
                        $('input[name="txtPassword"]').attr('readOnly', 'readOnly').val(jdAccount.siteLoginPassword);
                        setTimeout(function () {
                            if (!$('#divcode:visible').length) {
                                var span = $("<span>&nbsp;</span>");
                                $('#btnLogin').append(span);
                                span.trigger('click');
                            }
                        }, 1000);
                    };
                    options.loginURL = 'http://company.huibo.com/login';
                    chrome.storage.sync.remove('jdObjectCompany', function () {
                        JD.login(options);
                    });
                }
            } else if (window.location.href.indexOf('company.huibo.com/apply/') > -1) {
                //获取企业信息 传入本地内存
                chrome.storage.sync.get('jdObjectCompany', function (item) {
                    companyInfo = item.jdObjectCompany;
                });
                //解析简历excel
                options.processWorkbook = function (workbook) {
                    var thisObj = this;
                    var resumes = [];
                    var list = workbook.Sheets[workbook.SheetNames[0]];
                    var range = list['!ref'].split(':', 2);
                    //每行简历信息总列数
                    var colTotal = thisObj.excelCellCodeList.indexOf(range[1].substring(0, 1)) - 1;
                    var rowIndex = parseInt(range[1].substring(1), 10);
                    var failure = 0;
                    var modal = thisObj.getModal();
                    for (var i = 3; i < rowIndex; i++) {
                        var resumeInfo = thisObj.getResumeInfo();
                        try {
                            for (var k in thisObj.excelCellCodeList) {
                                var cell = list[thisObj.excelCellCodeList[k] + i];
                                if (!cell) continue;
                                var value = cell.v || '';
                                switch (list[thisObj.excelCellCodeList[k] + '1'].v) {
                                    case '简历编号':
                                        resumeInfo.sendTime = FormatDateToStringPattern($('input[data-resumeid="' + value + '"]:first').nextAll('span').text());
                                        break;
                                    case '姓名':
                                        resumeInfo.name = value;
                                        break;
                                    case '年龄':
                                        resumeInfo.age = parseInt(value);
                                        break;
                                    case '性别':
                                        resumeInfo.sexName = value;
                                        break;
                                    case '学历':
                                        resumeInfo.educationName = value;
                                        break;
                                    case '工作年限':
                                        resumeInfo.workName = value;
                                        break;
                                    case '现居地':
                                        resumeInfo.cityName = value;
                                        break;
                                    case '应聘职位':
                                        resumeInfo.objectiveJob = value;
                                        break;
                                    case '联系方式':
                                        var tempV = String(value);
                                        if (tempV.indexOf('-') > -1) {
                                            tempV = tempV.substring(tempV.indexOf('-') + 1);
                                        }
                                        resumeInfo.mobile = tempV;
                                        break;
                                    default:
                                        break;
                                }
                                if (parseInt(k, 10) === colTotal) break;
                            }
                            //投递公司
                            resumeInfo.applyCompany = companyInfo.company;
                            //工作地址
                            resumeInfo.workAddress = companyInfo.address;
                            var detail = workbook.Sheets[workbook.SheetNames[(i - 2 )]];
                            var detailRowLength = parseInt(detail['!ref'].split(':', 2)[1].substring(1), 10);
                            var basicStart = 0;
                            for (var j = basicStart; j <= detailRowLength; j++) {
                                var keyCell = detail[thisObj.excelCellCodeList[1] + j];
                                if (!keyCell) continue;
                                var key = keyCell.v;
                                if (key === '基本信息') {
                                    var basicInfo1 = detail[thisObj.excelCellCodeList[1] + (j + 4)].v.split(' | ');
                                    var basicInfo2 = detail[thisObj.excelCellCodeList[1] + (j + 5)].v.split(' | ');
                                    if (basicInfo1.length) {
                                        resumeInfo.marriedName = basicInfo1[0];
                                        if (basicInfo1[1] && basicInfo1[1].indexOf('户籍:') > -1) {
                                            resumeInfo.registerAddress = basicInfo1[1].substring(3);
                                        }
                                        if (basicInfo1[3]) {
                                            if (basicInfo1[3].indexOf('政治面貌：')) {
                                                resumeInfo.politicalName = basicInfo1[3].substring(5);
                                            } else {
                                                resumeInfo.politicalName = basicInfo1[3];
                                            }
                                        }
                                    }
                                    if (basicInfo2.length) {
                                        if (basicInfo2[1] && basicInfo2[1].indexOf('Email：') > -1) {
                                            resumeInfo.email = basicInfo2[1].substring(6);
                                        }
                                    }
                                } else if (key === '求职意向') {
                                    var salary = detail[thisObj.excelCellCodeList[1] + (j + 4)].v;
                                    var objectiveJob = detail[thisObj.excelCellCodeList[1] + (j + 5)].v;
                                    var jobIndustry = detail[thisObj.excelCellCodeList[1] + (j + 6)].v;
                                    var jobPlace = detail[thisObj.excelCellCodeList[1] + (j + 7)].v;

                                    resumeInfo.expectSalaryName = salary.substring(5);
                                    resumeInfo.objectiveJob = objectiveJob.substring(5);
                                    resumeInfo.jobIndustry = jobIndustry.substring(5);
                                    resumeInfo.jobPlace = jobPlace.substring(5);
                                } else if (key === '工作经历') {
                                    for (var k = 1; k < 500; k++) {
                                        var subKey = detail[thisObj.excelCellCodeList[1] + (j + k)];
                                        if (subKey && subKey.v && subKey.v.indexOf('-') == -1) {
                                            break;
                                        }
                                        //2014.09-2016.11	会计职业协会 | 会计职业协会
                                        if (subKey && subKey.v && subKey.v.indexOf('-') > -1) {
                                            var workExperience = thisObj.getWorkExperience();
                                            var dates = subKey.v.split('-');
                                            var m = moment(dates[0], 'YYYY-MM');
                                            if (m.isValid()) {
                                                workExperience.startDate = dates[0].replace(".", "/") + "/01";
                                            }
                                            m = moment(dates[1], 'YYYY.MM');
                                            if (m.isValid()) {
                                                workExperience.endDate = dates[1].replace(".", "/") + "/01";
                                            }
                                            var workInfo = detail[thisObj.excelCellCodeList[2] + (j + k)].v.split(' | ');
                                            //工作单位
                                            workExperience.workUnit = workInfo[1];
                                            //岗位
                                            workExperience.position = workInfo[0];
                                            if (workExperience.startDate) {
                                                resumeInfo.addWorkExperience(workExperience);
                                            }
                                        }
                                    }
                                } else if (key === '教育培訓经历') {
                                    //2014.09-2016.11	大专 | 重庆工业职业技术学院 | 会计电算化

                                    for (var k = 1; k < 500; k++) {
                                        var subKey = detail[thisObj.excelCellCodeList[1] + (j + k)];
                                        if (subKey && subKey.v && subKey.v.indexOf('-') == -1) {
                                            break;
                                        }
                                        if (subKey && subKey.v && subKey.v.indexOf('-') > -1) {
                                            var educationExperience = thisObj.getEducationExperience();
                                            var dates = subKey.v.split('-');
                                            var momentDate = moment(dates[0], 'YYYY.MM');
                                            if (momentDate.isValid()) {
                                                educationExperience.startDate = (dates[0].replace(".", "/") + "/01");
                                            }
                                            var momentTime = moment(dates[1], 'YYYY.MM');
                                            if (momentTime.isValid()) {
                                                educationExperience.endDate = dates[1].replace(".", "/") + "/01";
                                            }
                                            var eduInfo = detail[thisObj.excelCellCodeList[2] + (j + k)].v.split(' | ');
                                            //学历
                                            educationExperience.educationName = eduInfo[0];
                                            //学校
                                            educationExperience.school = eduInfo[1];
                                            //专业
                                            educationExperience.major = eduInfo[2];
                                            if (educationExperience.startDate) {
                                                resumeInfo.addEducationExperience(educationExperience);
                                            }
                                        }
                                    }
                                } else if (key === '自我评价') {
                                    resumeInfo.introduction = detail[thisObj.excelCellCodeList[2] + j].v;
                                }
                            }
                            thisObj.processInvalidColumn(resumeInfo);
                            resumes.push(resumeInfo);
                        } catch (e) {
                            var params = {
                                "module": "汇博网",
                                "content": e
                            };
                            JD.logToCenter(params);

                            modal.append('<strong style="color:#f22c40">解析' + resumeInfo.sendTime + '-' + resumeInfo.name + '(' + resumeInfo.mobile + ')-' + resumeInfo.objectiveJob + '失败,该简历格式存在特殊情况</strong>');
                            thisObj.syncExcelProcessException(e, resumeInfo);
                            failure++;
                        }
                    }
                    modal.append('总数量' + (rowIndex - 3) + ',成功解析<strong style="color:#00cc66">' + resumes.length + '</strong>,失败<strong style="color:#f22c40">' + failure + '</strong>');
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
                    //下一步
                    var nextPage = thisObj.assertAfterDateCondition($.trim($('div.rMentLit:last>.rMentLx>label>span').text()), 'YYYY-MM-DD') && $('div.page>a:last').text() === '>';
                    var resumeIds = [];
                    $('div.rMentLit').each(function (idx, item) {
                        if (!thisObj.assertAfterDateCondition($.trim($(item).find('.rMentLx>label>span').text()), 'YYYY-MM-DD')) {
                            return;
                        }
                        var itemInfo = $(item).find('.rMentLv');
                        if (!itemInfo.length) {
                            return;
                        }
                        var resumeId = itemInfo.data('resumeid');

                        var id = itemInfo.data('applyid');

                        $(item).find('input[name="cb_pid"]').prop('checked', true);
                        resumeIds.push(resumeId);
                        dayExported[timestamp].push(resumeId);
                        exported[thisObj.siteTypeCd].push(id);
                    });
                    //翻页方法
                    var nextStep = function (nextPage) {
                        if (nextPage) {
                            setTimeout(function () {
                                var span = $('<span>&nbsp;</span>');
                                $('div.page>a:last').append(span);
                                span.trigger('click');
                            }, 1000 * (Math.ceil(Math.random() * 3) + 4));
                        } else {
                            thisObj.syncRuipin(6);
                        }
                    };
                    //构建下载URL
                    var buildDownloadURL = function (args) {
                        var url = 'http://company.huibo.com/excel/index/resumeid-'
                        url += args.join(',');
                        return url;
                    };
                    //开始解析本页的excel
                    if (resumeIds.length) {
                        var downloadURL = buildDownloadURL(resumeIds);
                        var modal = thisObj.getModal().append('开始解析本页EXCEL');
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
                                var arr = [];
                                for (var i in data) {
                                    arr.push(String.fromCharCode(data[i]));
                                }
                                try {
                                    var workbook = _.read(arr.join(""), {type: "binary"});
                                    modal.append('简历读取成功,开始解析excel');
                                    var resumes = thisObj.getResumes();
                                    Array.prototype.push.apply(resumes, thisObj.processWorkbook.apply(thisObj, [workbook]));
                                    thisObj.setResumes(resumes)
                                } catch (e) {
                                    var params = {
                                        "module": "汇博网",
                                        "content": e
                                    };
                                    JD.logToCenter(params);

                                    modal.append('<strong style="color:red">excel读取错误,尝试重新读取</strong>');
                                    return false;
                                }
                                thisObj.syncJdDayExported(dayExported);
                                thisObj.syncJdExported(exported);
                                modal.append('excel解析成功');
                                return true;
                            }
                        });
                    } else {
                        nextStep(nextPage);
                    }
                };
                options.downloadJD = downloadJD;
                options.url = 'http://company.huibo.com/apply/';
                JD.init(options);
            } else if (window.location.href.indexOf('company.huibo.com/index/') > -1) {
                //求职公司的信息
                chrome.storage.sync.get('jdObjectCompany', function (item) {
                    if (!item.jdObjectCompany) {
                        var url = $('.compInfor_box>.title>.oper_box>.show').attr('href');
                        $.ajax({
                            url: url,
                            async: false,
                            type: 'GET',
                            success: function (response) {
                                var dom = $(response);
                                var jdObjectCompany = {
                                    'company': dom.find('.njmNameRt>p.njmNametit1').next('span').text(),
                                    'address': dom.find('.nJobmcLf>.newTytit>.njmTit2>span').text()
                                };
                                chrome.storage.sync.set({'jdObjectCompany': jdObjectCompany}, function () {
                                    window.location.href = 'http://company.huibo.com/apply/';
                                });
                            }
                        });
                    } else {
                        window.location.href = 'http://company.huibo.com/apply/';
                    }
                })
            } else {
                window.location.href = 'http://company.huibo.com/index/';
            }
        };

        function FormatDateToStringPattern(date) {
            var date = moment(date, 'YYYY-MM-DD HH:mm');
            if (date.isValid()) {
                return date.format("YYYY/MM/DD");
            } else {
                return "";
            }
        }

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