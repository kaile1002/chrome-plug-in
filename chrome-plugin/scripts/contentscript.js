(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(jQuery, moment) :
        typeof define === 'function' && define.amd ? define(factory) :
            global.JdUtils = factory(global.jQuery, global.moment);
}(window, function ($, moment, undefined) {
        'use strict';
        var JdUtils = function (siteTypeCd) {
            var _util = this;

            //Excel单元格列编号（A-Z）
            this.excelCellCodeList = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

            this.index = 1;
            this.types = {
                'zhaopin': '01',
                '51job': '02',
                '58': '03',
                'ganji': '04',
                'huibo': '05',
                'wanzhou': '06',
                '0757rc': '07',
                'cjol': '08',
                'chinahr': '09',
                'boss': '20'
            };
            this.siteTypeCd = siteTypeCd || 'DEFAULT';
            this.jdAccount = {
                requestJDAccount: function (callback) {
                    chrome.storage.sync.get('jdAccount', function (item) {
                        callback.apply(_util, [item]);
                    })
                },
                initJDAccount: function () {
                    var thisObj = this;
                    if (this.account == undefined) {
                        $(document).data('jd_defer', true);
                        thisObj.requestJDAccount(function (item) {
                            thisObj.account = item.jdAccount[_util.types[_util.siteTypeCd]];
                            $(document).data('jd_defer', false);
                        })
                    }
                },
                syncJDAccount: function () {
                    $(document).data('jd_defer', true);
                    var thisObj = this;
                    thisObj.account.sessionInit = true;
                    thisObj.requestJDAccount(function (item) {
                        item.jdAccount[_util.types[_util.siteTypeCd]] = thisObj.account;
                        chrome.storage.sync.set(item, function () {
                            $(document).data('jd_defer', false);
                        });
                    })
                },
                isLogin: function () {
                    return this.account.login;
                },
                isLogout: function () {
                    return this.account.logout;
                },
                login: function () {
                    this.account.login = true;
                    this.account.logout = false;
                    this.syncJDAccount();
                },
                logout: function (status) {
                    this.account.login = false;
                    if (status != undefined) {
                        this.account.logout = status;
                    } else {
                        this.account.logout = true;
                    }
                    this.syncJDAccount();
                }
            };
            this.jdAccount.initJDAccount();
            this.getResumes = function () {
                return JSON.parse(window.sessionStorage.getItem('jdResumes')) || [];
            };
            this.setResumes = function (resumes) {
                if (resumes) {
                    window.sessionStorage.setItem('jdResumes', JSON.stringify(resumes));
                } else {
                    window.sessionStorage.removeItem('jdResumes')
                }
            };
            this.getResumeSize = function () {
                //不限制大小 强制返回1M大小
                return 1;
            };
            //获取localstorage中的插件设置
            this.getJdStorage = function () {
                return JSON.parse(window.localStorage.getItem('jdStorage')) || {};
            };
            //获取localstorage中的已导出列表
            this.getJdExported = function () {
                return JSON.parse(window.sessionStorage.getItem('jdExportedTemp')) || JSON.parse(window.localStorage.getItem('jdExported')) || {};
            };
            this.getJdDayExported = function () {
                return JSON.parse(window.sessionStorage.getItem('jdDayExportedTemp')) || JSON.parse(window.localStorage.getItem('jdDayExported')) || {};
            };
            //导出excel的设置
            this.export = function () {
                var thisObj = this;
                var resumes = this.getResumes();
                if (resumes.length) {
                    var getFileName = function () {
                        var types = {
                            'zhaopin': '智联招聘',
                            '51job': '前程无忧',
                            '58': '58同城',
                            'ganji': '赶集网',
                            'huibo': '汇博人才网',
                            'cjol': '中国人才热线',
                            'chinahr': '中华英才网'
                        };
                        return types[thisObj.siteTypeCd] + '_' + thisObj.jdAccount.account.siteLoginAccount +
                            '_' + moment().format('YYYY_MM_DD_HH_mm_ss');
                    };
                    var uri = 'data:application/vnd.ms-excel;base64,';
                    var template = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--><style type="text/css">.head{font-weight:bolder;}.text{mso-number-format:"\\@"}</style></head><body><table cellpadding="3" cellspacing="0" border="1" rull="all" style="border-collapse: collapse;">{table}</table></body></html>';
                    var base64 = function (s) {
                        return window.btoa(unescape(encodeURIComponent(s)));
                    };
                    var format = function (s, c) {
                        return s.replace(/{(\w+)}/g,
                            function (m, p) {
                                return c[p];
                            });
                    };
                    var titles = {
                        '姓名': 'name',
                        '标签名称': 'extra.tagName',
                        '应聘职位': 'objectiveJob',
                        '简历名称': 'extra.resumeName',
                        '性别': 'sexName',
                        '出生日期': 'extra.birthday',
                        '工作年限': 'workName',
                        '电话': 'mobile',
                        '电子邮件': 'email',
                        '现居住地': 'extra.residence',
                        '通讯地址': 'contactAddress',
                        '户口': 'registerAddress',
                        '现在单位': 'extra.currentCompany',
                        '学校名称': 'extra.school',
                        '专业名称': 'extra.major',
                        '最高学历': 'educationName',
                        '期望月薪(税前)': 'extra.expectSalaryName',
                        '投递(收藏)时间': 'extra.sendTime'
                    };
                    var buildTitles = function (titles) {
                        var str = '<thead><tr>';
                        for (var k in titles) {
                            str += "<th>" + k + "</th>";
                        }
                        str += '</tr></thead>';
                        return str;
                    };
                    var buildBody = function (titles, resumes) {
                        var getProperty = function (resume, args) {
                            if (args.length > 1) {
                                return getProperty(resume[args[0]], args.slice(1));
                            } else if (args.length == 1) {
                                return resume[args[0]];
                            } else {
                                return '';
                            }
                        };
                        var str = '<tbody>';
                        for (var r in resumes) {
                            var resume = resumes[r];
                            str += '<tr>';
                            for (var k in titles) {
                                var key = titles[k];
                                str += '<td class="text">' + getProperty(resume, key.split('.')) + '</td>';
                            }
                            str += '</tr>';
                        }
                        str += '</tbody>';
                        return str;
                    };
                    var table = buildTitles(titles) + buildBody(titles, resumes);
                    var ctx = {
                        worksheet: '简历列表',
                        table: table
                    };
                    if (!$('#excelExportDownloadJD').length) {
                        $('body').append($('<a id="excelExportDownloadJD" style="display:none;"></a>'))
                    }
                    document.getElementById('excelExportDownloadJD').href = uri + base64(format(template, ctx));
                    document.getElementById("excelExportDownloadJD").download = getFileName() + '.xls';
                    document.getElementById("excelExportDownloadJD").click();
                    thisObj.setResumes();
                    thisObj.syncJdDayExported();
                    thisObj.syncJdExported();
                }
                thisObj.getModal().reloadTips(parseInt(thisObj.getJdStorage().interval));
                thisObj.startInterval();

            };
            //同步localstorage中的已导出列表
            this.syncJdExported = function (exported) {
                if (exported) {
                    for (var k in exported) {
                        if (!this.types[k]) {
                            delete exported[k];
                            continue;
                        }
                        if (exported[k].length > 40000) {
                            exported[k].splice(0, 20000);
                        }
                    }
                    window.sessionStorage.setItem('jdExportedTemp', JSON.stringify(exported));
                } else {
                    window.localStorage.setItem('jdExported', window.sessionStorage.getItem('jdExportedTemp'));
                    window.sessionStorage.removeItem('jdExportedTemp');
                }
            };
            this.syncJdDayExported = function (exported) {
                if (exported) {
                    window.sessionStorage.setItem('jdDayExportedTemp', JSON.stringify(exported));
                } else {
                    window.localStorage.setItem('jdDayExported', window.sessionStorage.getItem('jdDayExportedTemp'));
                    window.sessionStorage.removeItem('jdDayExportedTemp');
                }
            };
            this.startInterval = function (url) {
                var thisObj = this;
                setInterval(function () {
                    window.location.href = url || thisObj.intervalURL;
                }, 60000 * this.getJdStorage().interval || 10);
            };
            //遮罩层
            var modalWindow = function () {
                this.init = function () {
                    this.destroy();
                    $('body').append($('<div id="jdMask" class="jdMask" style="position:absolute;top:0;left:0;opacity:0.6;background-color: #000;z-index: 1000"></div>'))
                        .append($('<div class="jdMask jdMaskContent" style="z-index: 1001;position: fixed;left: 30%;top: 15%;border:1px solid #ccc;border-top-right-radius:5px;border-top-left-radius:5px;background-color:#fff;margin:auto;width: 40%;height: 40%;margin-top: 100px;padding:25px 15px">' +
                            '<div style="position:absolute;top:0;left:0px;width:100%;height:20px;background-color: #09c"></div></div>'
                        ));
                    $('#jdMask').css({height: $(document).height(), width: $(document).width()});
                    $('body>div.jdMaskContent').append($('<div class="jdTextContainer" style="margin:auto;font-size: 15px;line-height: 20px;height:100%;width:100%;overflow-y:auto;word-wrap:break-word; word-break:break-all;"></div>'))
                    return this;
                };

                this.append = function (content) {
                    var container = $('.jdMaskContent>div.jdTextContainer');
                    container.append(content).append('<br/>').scrollTop(container.scrollTop() + 20);
                    return this;
                };
                this.destroy = function () {
                    $('.jdMask').remove();
                };
                this.reloadTips = function (times) {
                    var reloadTime = moment.duration(times, 'minutes');
                    this.append('浏览器将在<span id="jdReloadTime" style="font-weight: bold;color:#00cc66">' + reloadTime.minutes() + ':0' + reloadTime.seconds() + '</span>后自动刷新，你也可以手动刷新页面');
                    var reloadInterval = setInterval(function () {
                        if (reloadTime.asSeconds() == 0) {
                            clearInterval(reloadInterval);
                        } else {
                            reloadTime.subtract(1, 's');
                            var seconds = reloadTime.seconds();
                            var minutes = reloadTime.minutes();
                            var text = minutes + ':';
                            if (String(seconds).length == 1) {
                                text += '0';
                            }
                            text += seconds;
                            $('#jdReloadTime').text(text);
                        }
                    }, 1000);
                }
            };
            this.syncExcelProcessException = function (e, resumeInfo) {
                var jdExcelProcessExceptions = JSON.parse(window.localStorage.getItem('jdExcelProcessExceptions')) || [];
                var ex = {
                    error: e.message,
                    resume: {
                        sendTime: resumeInfo.sendTime,
                        name: resumeInfo.name,
                        mobile: resumeInfo.mobile,
                        objectiveJob: resumeInfo.objectiveJob
                    }
                };
                var existed = false;
                for (var k in jdExcelProcessExceptions) {
                    if (JSON.stringify(jdExcelProcessExceptions[k]) === JSON.stringify(ex)) {
                        existed = true;
                        break;
                    }
                }
                if (!existed) {
                    jdExcelProcessExceptions.push(ex);
                }
                window.localStorage.setItem('jdExcelProcessExceptions', JSON.stringify(jdExcelProcessExceptions));
            };
            this.getExcelProcessExceptions = function () {
                return JSON.parse(window.localStorage.getItem('jdExcelProcessExceptions')) || [];
            };
            this.clearExcelProcessExceptions = function () {
                return window.localStorage.removeItem('jdExcelProcessExceptions');
            };
            this.getModal = function (newModal) {
                if (!this.currentModal) {
                    this.currentModal = new modalWindow().init();
                }
                if (newModal) {
                    this.currentModal.init();
                }
                return this.currentModal;
            };
            //判断时间是否在给定条件之后
            this.assertAfterDateCondition = function (date, format) {
                var jdStorage = this.getJdStorage();
                if (jdStorage.dateType === 'jdDateCondition1') {
                    return jdStorage.date - 1 >= moment().diff(moment(date, format || 'MM-DD'), 'days');
                } else {
                    return moment(jdStorage.date, 'YYYY-MM-DD').diff(moment(date, format || 'MM-DD'), 'days') <= 0;
                }
            };
            this.assertInDateCondition = function (date, format) {
                var jdStorage = this.getJdStorage();
                if (jdStorage.dateType === 'jdDateCondition1') {
                    return jdStorage.date - 1 >= moment().diff(moment(date, format || 'MM-DD'), 'days');
                } else {
                    return moment(jdStorage.date, 'YYYY-MM-DD').format('YYYY-MM-DD') === moment(date, format || 'MM-DD').format('YYYY-MM-DD');
                }
            };
            //验证简历信息字段正确性
            this.processInvalidColumn = function (resumeInfo) {
                for (var k in resumeInfo.workExperienceList) {
                    var workExperience = resumeInfo.workExperienceList[k];
                    if (workExperience.workUnit && workExperience.workUnit.length > 100) {
                        resumeInfo.workExperienceList[k].workUnit = '';
                    }
                    if (workExperience.postion && workExperience.postion.length > 50) {
                        resumeInfo.workExperienceList[k].postion = '';
                    }
                    if (workExperience.companyIndustryName && workExperience.companyIndustryName.length > 100) {
                        resumeInfo.workExperienceList[k].companyIndustryName = '';
                    }
                    if (workExperience.companyNutureName && workExperience.companyNutureName.length > 50) {
                        resumeInfo.workExperienceList[k].companyNutureName = '';
                    }
                    if (workExperience.companyScaleName && workExperience.companyScaleName.length > 50) {
                        resumeInfo.workExperienceList[k].companyScaleName = '';
                    }
                    if (workExperience.department && workExperience.department.length > 100) {
                        resumeInfo.workExperienceList[k].department = '';
                    }
                }
                for (var k in resumeInfo.educationExperienceList) {
                    var educationExperence = resumeInfo.educationExperienceList[k];
                    if (educationExperence.school && educationExperence.school.length > 100) {
                        resumeInfo.educationExperienceList[k].school = '';
                    }
                    if (educationExperence.educationName && educationExperence.educationName.length > 20) {
                        resumeInfo.educationExperienceList[k].educationName = '';
                    }
                    if (educationExperence.major && educationExperence.major.length > 80) {
                        resumeInfo.educationExperienceList[k].major = '';
                    }
                }
            };
            //获取UTIL的工作条
            this.getWorkDiv = function () {
                var workDiv = $('#jd_workDiv');
                if (!workDiv.length) {
                    var container = $('<div id="jd_container" style="-webkit-user-select: none;user-select: none;color:#fff;position: fixed;left:0;right:0;bottom:0;z-index: 2000;width:40%;text-align:center;margin:auto;"></div>');
                    var subContainer = $('<div id="jd_subContainer" style="opacity:0.6;width:100%;background-color:#09c;margin:auto">' +
                        '<h3 style="margin:auto">JD工具<span></span></h3>' +
                        '<div id="jd_workDiv" style="display:none">' +
                        '</div>' +
                        '</div>');
                    subContainer.appendTo(container);
                    container.appendTo($('body'));
                    workDiv = $('#jd_workDiv');
                    container.hover(function () {
                        subContainer.css({opacity: 1});
                        if (workDiv.is(':hidden')) {
                            subContainer.find('h3>span').text('▲');
                        } else {
                            subContainer.find('h3>span').text('▼');
                        }
                    }, function () {
                        subContainer.css({opacity: 0.6});
                        subContainer.find('h3>span').text('');
                    });
                    container.find('h3').click(function () {
                        workDiv.slideToggle();
                    });
                }
                return workDiv;
            };
            //构建UTIL的工作条table
            this.buildTable = function (table) {
                if (!table) {
                    table = '<table style="width:100%;margin:auto;border-collapse: collapse;">' +
                        ' <tr>' +
                        '<td style="width:25%;text-align: right">轮循规则(单位:分钟):</td><td style="width:25%"><select style="width:80%" name="jdInterval_condition"><option value="5">5</option><option value="10">10</option><option value="20">20</option><option value="30">30</option></select></td>' +
                        '<td style="width:15%;text-align: right">日期条件:</td><td style="width:35%"><input type="radio" name="jdDateConditionType" value="jdDateCondition1" style="vertical-align: middle;margin-bottom: 5px;" id="jdDateConditionType1"/><label for="jdDateConditionType1">时间段</label>&nbsp;&nbsp;<input type="radio" name="jdDateConditionType" value="jdDateCondition2" style="vertical-align: middle;margin-bottom: 5px;" id="jdDateConditionType2"/><label for="jdDateConditionType2">具体日期</label></td>' +
                        '</tr>' +
                        ' <tr>' +
                        '<td style="text-align: right">时间段:</td><td><select class="jdDateCondition" style="width:80%" id="jdDateCondition1" name="jd_date_condition">' +
                        '<option value="1">今天</option>' +
                        '<option value="2">近2天</option>' +
                        '<option value="3">近3天</option>' +
                        '<option value="5">近5天</option>' +
                        '<option value="15">近半月</option>' +
                        '<option value="30">近一月</option>' +
                        '</select></td>' +
                        '<td style="text-align: right">日期:</td><td><input class="jdDateCondition" style="width:80%;background-color: buttonface;" type="date" value="" id="jdDateCondition2" name="jd_date_condition"/></td>' +
                        '</tr>';

                    table += ' <tr>' +
                        '<td colspan="4" style="padding:10px 0px;">';
                    var excelProcessExceptions = this.getExcelProcessExceptions();
                    var btnStyle = 'margin-right:20px;display: inline-block;padding: 6px 12px;margin-bottom: 0;font-size: 14px;font-weight: normal;text-align: center;white-space: nowrap;vertical-align: middle;-ms-touch-action: manipulation;touch-action: manipulation;cursor: pointer;background-image: none;border: 1px solid transparent;border-radius: 2px;color: #333;background-color: #fff;border-color: #ccc;';
                    if (excelProcessExceptions.length) {
                        table += '<input id="showExcelProcessExceptions" type="button" value="显示错误列表" style="' + btnStyle + '"/>' +
                            '<input id="clearExcelProcessExceptions" type="button" value="清除错误列表" style="' + btnStyle + '"/>'
                    }
                    table += '<input id="jd_work_btn" type="button" value="开始运行" style="' + btnStyle + '"/></td>' +
                        '</tr>' +
                        '</table>';
                }
                var thisObj = this;
                var workDiv = thisObj.getWorkDiv();
                workDiv.empty();
                $(table).appendTo(workDiv);
                var date = moment();
                $('#jdDateCondition2').prop('max', date.format('YYYY-MM-DD')).prop('min', date.year() - 1 + '-12-01');
                $('input[name="jdDateConditionType"]').change(function () {
                    $('.jdDateCondition').prop('disabled', true);
                    $('#' + this.value).prop('disabled', false);
                });
                $('#jd_work_btn').unbind('click').on('click', function () {
                    $(this).toggleClass('jd_working');
                    var breakWorking = thisObj.triggerWorkingStatus(true);
                    if (breakWorking) {
                        $(this).toggleClass('jd_working');
                    }
                });
                $('#showExcelProcessExceptions').unbind('click').on('click', function () {
                    if ($('#jd_work_btn').hasClass('jd_working')) {
                        alert('插件运行中不能显示错误')
                    } else {
                        var modalWindow = thisObj.getModal();
                        if ($(this).hasClass('jd_ex_modal_show')) {
                            modalWindow.destroy();
                        } else {
                            var str = '<table id="jdExModalTable" style="border-spacing: 0;border-collapse: collapse;background-color: transparent;width: 100%;max-width: 100%; margin-bottom: 20px;"><thead><tr><td style="width:30%">投递时间</td><td style="width:15%">姓名</td><td style="width:15%">联系电话</td><td style="width:40%">错误原因</td></tr></thead><tbody>';
                            var exs = thisObj.getExcelProcessExceptions();
                            for (var k in exs) {
                                str += '<tr><td>' + exs[k].resume.sendTime + '</td><td>' + exs[k].resume.name + '</td><td>' + exs[k].resume.mobile + '</td><td>' + exs[k].error + '</td></tr>';
                            }
                            str += '</tbody></table>';
                            modalWindow.init().append(str);
                            $('#jdExModalTable td').css({
                                'border': '1px solid #ddd', 'padding': '8px',
                                'line-height': '1.42857143',
                                'vertical-align': 'top',
                                'border-top': '1px solid #ddd',
                                'border-bottom': '2px solid #ddd',
                                'text-align': 'center'
                            });
                            $('#jdExModalTable>thead>tr>td').css({'font-weight': 'bolder'});
                        }
                        $(this).toggleClass('jd_ex_modal_show');
                    }
                }).hover(function () {
                    $(this).css({backgroundColor: '#5cb85c', borderColor: '#4cae4c'})
                }, function () {
                    $(this).css({backgroundColor: '#FFF', borderColor: '#FFF'})
                });
                $('#clearExcelProcessExceptions').unbind('click').on('click', function () {
                    if ($('#jd_work_btn').hasClass('jd_working')) {
                        alert('插件运行中不能清除错误')
                    } else {
                        thisObj.getModal().destroy();
                        $('#showExcelProcessExceptions').remove();
                        $(this).remove();
                        thisObj.clearExcelProcessExceptions();
                    }
                }).hover(function () {
                    $(this).css({backgroundColor: '#5cb85c', borderColor: '#4cae4c'})
                }, function () {
                    $(this).css({backgroundColor: '#FFF', borderColor: '#FFF'})
                });
            };
            //触发更新工作条状态
            this.triggerWorkingStatus = function (trigger) {
                var thisObj = this;
                var btn = $('#jd_work_btn'), jdStorage = thisObj.getJdStorage();
                if (trigger) {
                    if (btn.hasClass('jd_working')) {
                        jdStorage.dateType = $('input[name="jdDateConditionType"]:checked').val();
                        jdStorage.workType = $('input[name="jdWorkType"]:checked').val();
                        jdStorage.date = $('.jdDateCondition:enabled').val();
                        if (jdStorage.dateType === 'jdDateCondition2' && !jdStorage.date) {
                            alert('请设置"日期"');
                            return true;
                        }
                        jdStorage.interval = $('select[name="jdInterval_condition"]').val();
                        jdStorage.format = 'excel';
                        jdStorage.working = true;
                        window.localStorage.setItem('jdStorage', JSON.stringify(jdStorage));
                        btn.css({backgroundColor: '#fff', borderColor: '#fff'});
                        btn.val('运行中');
                        thisObj.index++;
                        thisObj.downloadJD.apply(thisObj, []);
                    } else {
                        if (window.jdInterval != undefined) {
                            clearInterval(window.jdInterval);
                        }
                        jdStorage.working = false;
                        window.localStorage.setItem('jdStorage', JSON.stringify(jdStorage));
                        btn.css({backgroundColor: '#d9534f', borderColor: '#d43f3a'});
                        btn.val('开始运行');
                    }
                } else {
                    if (jdStorage.working) {
                        btn.addClass('jd_working');
                    } else {
                        btn.removeClass('jd_working');
                    }
                    var dateType = jdStorage.dateType || 'jdDateCondition1';
                    $('input[name="jdDateConditionType"][value="' + dateType + '"]').prop('checked', true);
                    var workType = jdStorage.workType || 1;
                    $('input[name="jdWorkType"][value="' + workType + '"]').prop('checked', true);
                    $('.jdDateCondition').prop('disabled', true);
                    $('#' + dateType).prop('disabled', false);
                    var date = moment().format('YYYY-MM-DD');
                    if (dateType === 'jdDateCondition1') {
                        $('.jdDateCondition:enabled').val(jdStorage.date || 1);
                        $('.jdDateCondition:disabled').val(date);
                    } else {
                        $('.jdDateCondition:enabled').val(jdStorage.date || date);
                        $('.jdDateCondition:disabled').val(1);
                    }
                    $('select[name="jdInterval_condition"]').val(jdStorage.interval || 10);
                    thisObj.triggerWorkingStatus(true);
                }
            };
            this.request51JobDownload = function (options) {
                var thisObj = this;
                var forms = options.forms || [];
                var callback = options.callback || {};
                var onload = options.onload || {};
                var idx = 0;
                var restart = 5;
                var sendReq = function () {
                    if (idx < forms.length) {
                        chrome.runtime.sendMessage({
                                jd: options.jdAction,
                                options: options,
                                form: forms[idx]
                            },
                            function (response) {
                                if (response.code == 0) {
                                    //成功后执行onload方法
                                    onload.apply(this, [response.data]);
                                } else {
                                    if (restart <= 0) {
                                        idx = forms.length;
                                        thisObj.getModal().append('<strong style="color:#f22c40">自动尝试全部失败，请稍后刷新页面重试。</strong><br/>');
                                    } else {
                                        thisObj.getModal().append('<strong style="color:#f22c40">请求失败,尝试重新发起请求,剩余' + restart + '次机会</strong><br/>');
                                        idx = 0;
                                        setTimeout(sendReq, 1000 * 5);
                                    }
                                    restart--;
                                }
                            }
                        );
                    } else if (typeof callback === 'function') {
                        callback.apply(this, []);
                    }
                    idx++;
                };
                sendReq();
            }
            //字符串转为ArrayBuffer对象，参数为字符串
            this.str2ab = function (str) {
                //每个字符占用2个字节
                var buf = new ArrayBuffer(str.length * 2);
                var bufView = new Uint16Array(buf);
                for (var i = 0, strLen = str.length; i < strLen; i++) {
                    bufView[i] = str.charCodeAt(i);
                }
                return buf;
            }
            //请求链方法
            this.request = function (options) {
                var thisObj = this;
                var forms = options.forms || [];
                var callback = options.callback || {};
                var onload = options.onload || {};
                var idx = 0;
                var restart = 5;
                var sendReq = function () {
                    if (idx < forms.length) {
                        var xhr = new XMLHttpRequest();
                        xhr.responseType = options.responseType || 'text';
                        var form = forms[idx];
                        xhr.open(form.type, form.action);
                        xhr.onload = function (e) {
                            if (this.readyState == 4) {
                                var success = true;
                                var waitTime = 0;
                                if (this.status == 200) {
                                    if (typeof onload === 'function') {
                                        success = onload.apply(this, []);
                                    }
                                } else if (this.status == 404) {
                                    success = false;
                                }
                                if (!success) {
                                    if (restart <= 0) {
                                        thisObj.getModal().append('<strong style="color:#f22c40">自动尝试全部失败</strong><br/>');
                                        idx = forms.length;
                                        waitTime = 0;
                                    } else {
                                        thisObj.getModal().append('<strong style="color:#f22c40">请求失败,尝试重新发起请求,剩余' + restart + '次机会</strong><br/>');
                                        idx = 0;
                                        waitTime = 15;
                                    }
                                    restart--;
                                }
                                setTimeout(sendReq, 1000 * waitTime);
                            }
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

                        xhr.onerror = function (ev) {
                            if (restart <= 0) {
                                idx = forms.length;
                                thisObj.getModal().append('<strong style="color:#f22c40">自动尝试全部失败，请稍后刷新页面重试。</strong><br/>');
                            } else {
                                thisObj.getModal().append('<strong style="color:#f22c40">请求失败,尝试重新发起请求,剩余' + restart + '次机会（注意：浏览器内核不高于65或使用360浏览器10版本及以下；若浏览器地址栏出现“已拦截不安全内容”，请点击“加载不安全的脚本”）</strong><br/>');
                                idx = 0;
                                setTimeout(sendReq, 1000 * 5);
                            }
                            restart--;
                        }
                    } else if (typeof callback === 'function') {
                        callback.apply(this, []);
                    }
                    idx++;
                };
                sendReq();
            };
            this.syncRuipinPdf = function (fileList, callback, callArgs) {
                var thisObj = this;
                var jdAccount = thisObj.jdAccount.account;
                var modalWindow = thisObj.getModal();
                if (fileList.length) {
                    callback = callback || function () {
                        modalWindow.reloadTips(parseInt(thisObj.getJdStorage().interval));
                        thisObj.startInterval();
                    };
                    callArgs = callArgs || [];
                    modalWindow.append('开始同步至系统，总共' + fileList.length + '条');
                    $.ajax({
                        url: jdAccount.receiveFileURL,
                        data: {
                            'resumePackage': JSON.stringify({
                                resumeSiteUid: jdAccount.resumeSiteUid,
                                resumeFiles: fileList
                            })
                        },
                        cache: false,
                        type: 'POST',
                        success: function (res) {
                            if (typeof res === 'string') {
                                res = JSON.parse(res);
                            }
                            modalWindow.append('<strong style="color:#00cc66">' + res.msg + '</strong>');
                            console.log(thisObj, callArgs);
                            callback.apply(thisObj, callArgs);
                        },
                        error: function () {
                            modalWindow.append('<strong style="color:#f22c40">无法同步至系统</strong>');
                            modalWindow.append('<strong style="color:#f22c40">同步失败</strong>');
                            callback.apply(thisObj, callArgs);
                        }
                    })
                } else {
                    modalWindow.append('<strong style="color:#f22c40">没有解析成功的简历数据</strong>').reloadTips(parseInt(thisObj.getJdStorage().interval));
                    thisObj.startInterval();
                }
            };
            this.syncRuipin = function (retry, callback, callArgs) {
                var thisObj = this;
                var jdAccount = thisObj.jdAccount.account;
                var resumes = thisObj.getResumes();
                var modalWindow = thisObj.getModal();
                if (resumes.length) {
                    callback = callback || function () {
                        modalWindow.reloadTips(parseInt(thisObj.getJdStorage().interval));
                        thisObj.startInterval();
                    };
                    callArgs = callArgs || [];
                    modalWindow.append('开始同步至系统，总共' + resumes.length + '条');
                    $.ajax({
                        url: jdAccount.receiveURL,
                        data: {
                            'resumePackage': JSON.stringify({
                                resumeSiteUid: jdAccount.resumeSiteUid,
                                resumes: resumes
                            })
                        },
                        cache: false,
                        type: 'POST',
                        success: function (res) {
                            var color = '#F2D47D';
                            if (typeof res === 'string') {
                                res = JSON.parse(res);
                            }
                            if (res.code == 1) {
                                color = '#00cc66';
                                thisObj.setResumes();
                                thisObj.syncJdDayExported();
                                thisObj.syncJdExported();
                                modalWindow.append('<strong style="color:' + color + '">' + res.msg + '</strong>');
                                console.log(thisObj, callArgs);
                                callback.apply(thisObj, callArgs);
                            } else {
                                if (retry > 0) {
                                    res.msg += '<br/>插件会尝试重新尝试发起请求，' + retry + '次尝试后仍失败则不再尝试';
                                    modalWindow.append('<strong style="color:' + color + '">' + res.msg + '</strong>');
                                    setTimeout(function () {
                                        thisObj.syncRuipin(retry, callback, callArgs);
                                    }, 1000 * 20);
                                } else {
                                    thisObj.setResumes();
                                    window.sessionStorage.removeItem('jdDayExportedTemp');
                                    window.sessionStorage.removeItem('jdExportedTemp');
                                    modalWindow.append('<strong style="color:#f22c40">同步失败</strong>');
                                    callback.apply(thisObj, callArgs);
                                }
                                retry--;
                            }
                        },
                        error: function () {
                            modalWindow.append('<strong style="color:#f22c40">无法同步至系统</strong>');
                            if (retry > 0) {
                                modalWindow.append('<strong style="color:#f22c40">插件会尝试重新尝试发起请求，' + retry + '次尝试后仍失败则不再尝试</strong>');
                                setTimeout(function () {
                                    thisObj.syncRuipin(retry, callback, callArgs);
                                }, 1000 * 20);
                            } else {
                                thisObj.setResumes();
                                window.sessionStorage.removeItem('jdDayExportedTemp');
                                window.sessionStorage.removeItem('jdExportedTemp');
                                modalWindow.append('<strong style="color:#f22c40">同步失败</strong>');
                                callback.apply(thisObj, callArgs);
                            }
                            retry--;
                        }
                    })
                } else {
                    modalWindow.append('<strong style="color:#f22c40">没有解析成功的简历数据</strong>').reloadTips(parseInt(thisObj.getJdStorage().interval));
                    window.sessionStorage.removeItem('jdDayExportedTemp');
                    window.sessionStorage.removeItem('jdExportedTemp');
                    thisObj.startInterval();
                }
            };
            this.needJdUtil = function (callback) {
                var thisObj = this;
                chrome.runtime.sendMessage({
                        jd: 'utilEnable'
                    },
                    function (response) {
                        if (response.farewell && callback && typeof callback === 'function') {
                            callback.apply(thisObj, []);
                        }
                    }
                );
            };
            this.login = function (options) {
                var login = options.login || function () {
                    alert('未实现登陆方法');
                };
                if (window.location.href.indexOf(options.loginURL) == -1) {
                    window.location.href = options.loginURL;
                } else {
                    login.apply(this, [this.jdAccount.account]);
                }
            };
            //JDUTIL初始化
            this.init = function (options) {
                this.intervalURL = options.url || 'about:blank';
                this.processWorkbook = options.processWorkbook || function () {
                    alert('未实现解析excel');
                };
                this.downloadJD = options.downloadJD || function () {
                    alert('未实现简历下载');
                };
                this.buildTable(options.table);
                this.triggerWorkingStatus(false);
            };
            this.logToCenter = function (params) {

            }
        };

        //简历信息数据结构
        var ResumeInfo = function () {
            this.name = '';
            this.sexName = '';
            this.birthday = '';
            this.age = '';
            this.workName = '';
            this.cardTypeName = '';
            this.cardNum = '';
            this.provinceName = '';
            this.cityName = '';
            this.regionName = '';
            this.mobile = '';
            this.experience = '';
            this.email = '';
            this.national = '';
            this.marriedName = '';
            this.educationName = '';
            this.school = '';
            this.contactAddress = '';
            this.political = '';
            this.phone1 = '';
            this.registerAddress = '';
            this.introduction = '';
            this.resumeSourceUid = '';
            this.expectSalaryName = '';
            this.jobStateName = '';
            this.typeName = '';
            this.previewCompany = '';
            this.objectiveJob = '';
            this.applyCompany = '';
            //发布城市
            this.releaseCityName = '';
            //工作地区
            this.workArea = '';
            //工作地址
            this.workAddress = '';
            //投递时间
            this.sendTime = '';
            //个人技能
            this.personSkill = '';
            //教育经历
            this.educationExperienceList = [];
            //工作经历
            this.workExperienceList = [];
            //工作经历
            this.projectExperienceList = [];
            //添加教育经历到列表对象
            this.addEducationExperience = function (educationExperience) {
                this.educationExperienceList.push(educationExperience);
            };
            //添加工作经历到列表对象
            this.addWorkExperience = function (workExperience) {
                this.workExperienceList.push(workExperience);
            };
            //添加项目经历到列表对象
            this.addProjectExperience = function (projectExperience) {
                this.projectExperienceList.push(projectExperience);
            };
            return this;
        };

        //项目经验信息【与rp_resume_project_experience保持相同数据结构】
        var ProjectExperience = function () {
            this.projectName = '';
            this.projectStartDate = '';
            this.projectEndDate = '';
            this.projectDescribe = '';
            this.responsibilities = '';
            return this;
        };

        //简历教育信息【与rp_resume_education_experience保持相同数据结构】
        var EducationExperience = function () {
            this.startDate = '';
            this.endDate = '';
            this.school = '';
            this.major = '';
            this.educationName = '';
            return this;
        };
        //简历工作信息【与rp_resume_work_experience保持相同数据结构】
        var WorkExperience = function () {
            this.startDate = '';
            this.endDate = '';
            this.workUnit = '';
            this.companyIndustryName = '';
            this.companyNutureName = '';
            this.companyScaleName = '';
            this.department = '';
            this.postion = '';
            this.jobContent = '';
            return this;
        };

        //取得简历实体对象
        JdUtils.prototype.getResumeInfo = function () {
            return new ResumeInfo();
        };

        //取得教育经历实体对象
        JdUtils.prototype.getProjectExperience = function () {
            return new ProjectExperience();
        };

        //取得教育经历实体对象
        JdUtils.prototype.getEducationExperience = function () {
            return new EducationExperience();
        };

        //取得工作经历实体对象
        JdUtils.prototype.getWorkExperience = function () {
            return new WorkExperience();
        };
        return JdUtils;
    }
));
