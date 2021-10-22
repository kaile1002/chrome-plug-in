(function ($, _, moment, _jd) {
        'use strict';
        chrome.runtime.onMessage.addListener(function (request) {
            //网站导出excel完成 继续进行excel解析
            if (request.action === 'continue51job') {
                $(document).data('51jobForm', request.form);
            } else if (request.action == 'refresh51job') {
                window.location.reload();
            }
        });

        //加载51job.js
        var JD = new _jd('51job');

        //执行插件方法入口
        var startExecute = function () {
            var options = {};
            //验证手机页面不处理
            if (location.href.toLocaleLowerCase().indexOf("ehire.51job.com/safety/mobileconfirm.aspx") > -1) {
                return;
            }
            //强制修改密码不处理
            if (location.href.toLocaleLowerCase().indexOf("ehire.51job.com/wizard/pwdreset.aspx") > -1) {
                return;
            }

            //先退出网站的登录
            $(document).on('click', 'a[href="/LoginOut.aspx"]', function () {
                JD.jdAccount.logout();
            });

            //如果未登录，进行插件登录
            if ($('a[href="/LoginOut.aspx"]').length || window.location.href.indexOf('ehire.51job.com/Member/UserOffline.aspx') > -1) {
                JD.jdAccount.login();
            }

            //网站登录 赋值用户名和密码 VIP用户名
            if (!JD.jdAccount.isLogin()) {
                options.login = function (jdAccount) {
                    $('input[name="txtMemberNameCN"]').val(jdAccount.siteVipName).attr("readonly", "readonly");
                    $('input[name="txtUserNameCN"]').val(jdAccount.siteLoginAccount).attr("readonly", "readonly");
                    $('input[name="txtPasswordCN"]').val(jdAccount.siteLoginPassword);
                };
                options.loginURL = 'https://ehire.51job.com/MainLogin.aspx';
                JD.login(options);
            }
            //如果已经登录且页面在简历管理页面
            else if (window.location.href.indexOf('ehire.51job.com/Inbox/InboxRecentEngine.aspx') > -1 ||
                window.location.href.toLocaleLowerCase().indexOf('ehire.51job.com/inboxresume/inboxrecentengine.aspx') > -1) {
                //初始化为50条一页
                var pagerSelect = $('select[name^="pagerTopNew$ct"]');
                if (pagerSelect.val() != '50') {
                    pagerSelect.val('50');
                    pagerSelect.change();

                    //刷新页面
                    var theForm = document.forms['form1'];
                    if (!theForm) {
                        theForm = document.form1;
                    }
                    if (!theForm.onsubmit || (theForm.onsubmit() != false)) {
                        theForm.__EVENTTARGET.value = pagerSelect.attr("name");
                        theForm.__EVENTARGUMENT.value = "";
                        theForm.submit();
                    }
                    return;
                }

                //初始化为简单列表
                var simpleOrDetail = $('#btnSampleDis');
                if (simpleOrDetail.hasClass("List_button_disimg_out")) {
                    simpleOrDetail.trigger('click');
                    return;
                }

                //弹框过滤
                if ($('#divVAD').length) {
                    $('#divVAD').remove();
                }
                if ($('#ifrm_MaskLaye').length) {
                    $('#ifrm_MaskLaye').remove();
                }

                //初始化默认按照投递时间降序排列
                if ($('#hidSort').val() != 'SENDDATE') {
                    $("#hidSort").val("SENDDATE");
                    $(".blue_link[value='SENDDATE']").click();
                    return;
                }

                //设置显示字段
                if (!$("#cbxColumns_0").is(":checked") || !$("#cbxColumns_14").is(":checked")) {
                    //先取消所有已选中的列
                    $("#cbxColumns input[type='checkbox']").attr("checked", false);
                    //选中工作地点WORKAREA
                    $("#cbxColumns_0").prop("checked", "checked");
                    //选中年龄AGE
                    $("#cbxColumns_1").prop("checked", "checked");
                    //选中工作年限WORKYEAR
                    $("#cbxColumns_2").prop("checked", "checked");
                    //选中学历TOPDEGREE
                    $("#cbxColumns_5").prop("checked", "checked");
                    //选中投递时间SENDDATE
                    $("#cbxColumns_14").prop("checked", "checked");
                    $("#DivCol").find("#btnColOK")[0].click();
                    return;
                }

                //解析Excel工作表
                options.processWorkbook = function (workbook) {
                    //指定网站账号下简历扩张信息列表
                    var resumeExtList = JSON.parse(window.localStorage.getItem(JD.jdAccount.account.siteLoginAccount + "_ResumeExtList")) || {};

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
                    for (var i = 2; i <= rowTotal; i++) {
                        //取得简历实体对象
                        var resumeInfo = thisObj.getResumeInfo();

                        try {
                            //循环A-Z列
                            for (var colIndex in thisObj.excelCellCodeList) {
                                //取得指定行中对应的单元格（如：A1，B1，C1）
                                var cell = list[thisObj.excelCellCodeList[colIndex] + i];

                                //单元格为空，处理跳过
                                if (!cell) continue;

                                var value = cell.v || '';

                                //根据第一行单元格的标题匹配简历信息
                                switch (list[thisObj.excelCellCodeList[colIndex] + '1'].v) {
                                    case '姓名':
                                        resumeInfo.name = value;
                                        break;
                                    case '应聘职位':
                                        //投递岗位
                                        resumeInfo.applyPosition = value;
                                        break;
                                    case '应聘公司':
                                        //投递公司
                                        resumeInfo.applyCompany = value;
                                        break;
                                    case '发布城市':
                                        resumeInfo.releaseCityName = value;
                                        break;
                                    case '工作地点':
                                        //工作地址
                                        resumeInfo.workAddress = value;
                                        break;
                                    case '应聘日期':
                                        //投递时间
                                        resumeInfo.sendTime = moment(value, "YYYY-MM-DD").format("YYYY/MM/DD");
                                        break;
                                    case '性别':
                                        resumeInfo.sexName = value;
                                        break;
                                    case '出生日期':
                                        resumeInfo.birthday = value.split("-")[0] + "/" + value.split("-")[1] + "/01";
                                        break;
                                    case '目前居住地':
                                        var live = value || '';
                                        //居住地址存在的场合，如：上海-浦东新区
                                        if (live.length) {
                                            live = live.split('-');
                                            //居住地(城市)，如：上海
                                            resumeInfo.cityName = live[0];
                                            if (live.length > 1) {
                                                //居住地(区域)，如：浦东新区
                                                resumeInfo.regionName = live[1];
                                            }
                                        }
                                        break;
                                    case '户口/国籍':
                                        resumeInfo.registerAddress = value;
                                        break;
                                    case '工作年限':
                                        //后台根据Name自动转化为Code
                                        resumeInfo.workName = value;
                                        break;
                                    case '学历/学位':
                                        resumeInfo.educationName = value;
                                        break;
                                    case '毕业学校':
                                        resumeInfo.school = value;
                                        break;
                                    case '专业':
                                        resumeInfo.major = value;
                                        break;
                                    case '联系电话':
                                        if (value.indexOf('-') > -1) {
                                            value = value.substring(value.indexOf('-') + 1);
                                        }
                                        resumeInfo.mobile = value;
                                        break;
                                    case '电子邮件':
                                        resumeInfo.email = value;
                                        break;
                                    case '地址':
                                        resumeInfo.contactAddress = value;
                                        break;
                                    case '最近一家公司':
                                        resumeInfo.previewCompany = value;
                                        break;
                                    case '最近一个职位':
                                        resumeInfo.previewPost = value;
                                        break;
                                    case '期望薪资':
                                        resumeInfo.expectSalaryName = value;
                                        break;
                                    case '求职状态':
                                        resumeInfo.jobStateName = value;
                                        break;
                                    default:
                                        break;
                                }

                                //超过简历信息总列数，处理中止
                                if (parseInt(colIndex, 10) === colTotal) break;
                            }

                            //简历详细sheet页信息获取
                            var detail = workbook.Sheets[workbook.SheetNames[(i - 1)]];

                            //英文简历的场合，处理跳过
                            if (detail[thisObj.excelCellCodeList[1] + 1].v === 'Resume') {
                                modalWindow.append(resumeInfo.name + '(' + resumeInfo.mobile + ')为英文简历，忽略英文简历的处理。');
                                continue;
                            }

                            //取得简历详细信息行数
                            var detailRowLength = parseInt(detail['!ref'].split(':', 2)[1].substring(1), 10);

                            //从第三行开始循环处理简历详细信息
                            for (var j = 3; j <= detailRowLength; j++) {
                                //取得简历详细信息标题单元格
                                var keyCell = detail[thisObj.excelCellCodeList[1] + j];

                                if (!keyCell) continue;

                                var key = keyCell.v;

                                var valueCell = detail[thisObj.excelCellCodeList[2] + j] || {};

                                if (key === '婚姻状态') {
                                    resumeInfo.marriedName = valueCell.v;
                                } else if (key === '政治面貌') {
                                    resumeInfo.politicalName = valueCell.v;
                                } else if (key === '自我评价' && valueCell.v) {
                                    resumeInfo.introduction = valueCell.v;
                                } else if (key === '求职意向') {
                                    //求职类型（期望工作类型）
                                    resumeInfo.jobTypeName = (detail[thisObj.excelCellCodeList[2] + (j + 7)] || {}).v;
                                    //公司行业（期望行业）
                                    resumeInfo.jobIndustry = (detail[thisObj.excelCellCodeList[2] + (j + 5)] || {}).v;
                                    //期望地点（期望工作地点）
                                    resumeInfo.jobPlace = (detail[thisObj.excelCellCodeList[2] + (j + 3)] || {}).v;
                                    //期望薪水
                                    resumeInfo.expectSalaryName = (detail[thisObj.excelCellCodeList[2] + (j + 2)] || {}).v;
                                    //到岗时间
                                    resumeInfo.dutyTimeName = (detail[thisObj.excelCellCodeList[2] + (j + 6)] || {}).v;
                                    //期望工作（期望职位）
                                    resumeInfo.objectiveJob = (detail[thisObj.excelCellCodeList[2] + (j + 4)] || {}).v;
                                } else if (key === '工作经验' && valueCell.v) {
                                    //2015-03至2016-02——公司:深圳市依贝佳科技投资有限公司(150-500人)
                                    //部门:  总经办
                                    //职位: 经理助理/秘书
                                    //工作描述：

                                    //2014-10至今——公司:七天连锁酒店
                                    var workExperienceList = valueCell.v.split('\r\n\r\n\r\n\r\n********************\r\n');
                                    for (var m in workExperienceList) {
                                        var workExperience = thisObj.getWorkExperience();
                                        var workInfos = workExperienceList[m].split('\r\n');
                                        for (var workIndex = 0; workIndex < workInfos.length; workIndex++) {
                                            var cellInfo = workInfos[workIndex];
                                            if (cellInfo.indexOf('——公司:') > -1) {
                                                var dates = cellInfo.substring(0, cellInfo.indexOf('——')).split('至');
                                                //开始时间
                                                var startDate = moment(dates[0], 'YYYY-MM');
                                                if (startDate.isValid()) {
                                                    workExperience.startDate = startDate.format('YYYY/MM') + "/01";
                                                }
                                                //结束时间
                                                var endDate = moment(dates[1], 'YYYY-MM');
                                                if (endDate.isValid()) {
                                                    workExperience.endDate = endDate.format('YYYY/MM') + "/01";
                                                }
                                                //工作单位
                                                workExperience.workUnit = cellInfo.substring(cellInfo.indexOf('——公司:') + 5, cellInfo.lastIndexOf('('));
                                                //公司规模
                                                workExperience.companyScaleName = cellInfo.substring(cellInfo.lastIndexOf('(') + 1, cellInfo.length - 1);
                                            } else if (cellInfo.indexOf('部门:') === 0) {
                                                workExperience.department = cellInfo.substring(3);
                                            } else if (cellInfo.indexOf('职位:') === 0) {
                                                workExperience.position = cellInfo.substring(3);
                                            } else if (cellInfo.indexOf('工作描述：') === 0) {
                                                workExperience.jobContent = cellInfo.substring(5);
                                            }
                                        }
                                        if (workExperience.startDate) {
                                            resumeInfo.addWorkExperience(workExperience);
                                        }
                                    }
                                } else if (key === '教育经历' && valueCell.v) {
                                    //2012-09至2015-06——中南林业科技大学
                                    //国际商务 大专
                                    //所学专业课程：
                                    var educationExperienceList = valueCell.v.split('\r\n\r\n********************\r\n');
                                    for (var t in educationExperienceList) {
                                        var educationExperience = thisObj.getEducationExperience();
                                        var educationInfos = educationExperienceList[t].split('\r\n');
                                        for (var index = 0; index < educationInfos.length; index++) {
                                            var educationInfo = educationInfos[index];
                                            if (index == 0) {
                                                var date = educationInfo.substring(0, educationInfo.indexOf('——')).split('至');
                                                //开始时间
                                                var startDate = moment(date[0], 'YYYY-MM');
                                                if (startDate.isValid()) {
                                                    educationExperience.startDate = startDate.format('YYYY/MM') + "/01";
                                                }
                                                //结束时间
                                                var endDate = moment(date[1], 'YYYY-MM');
                                                if (endDate.isValid()) {
                                                    educationExperience.endDate = endDate.format('YYYY/MM') + "/01";
                                                }
                                                //学校名称
                                                educationExperience.school = educationInfo.substring(educationInfo.indexOf('——') + 2);
                                            } else if (index == 1) {
                                                var educationLength = educationInfo.indexOf('MBA') > -1 ? 3 : 2;
                                                //所学专业
                                                educationExperience.major = educationInfo.substring(0, educationInfo.length - educationLength);
                                                //学历
                                                educationExperience.educationName = educationInfo.substring(educationInfo.length - educationLength);
                                            }
                                        }
                                        if (educationExperience.startDate) {
                                            resumeInfo.addEducationExperience(educationExperience);
                                        }
                                    }
                                } else if (key === '技能/语言' && valueCell.v) {
                                    resumeInfo.personSkill = valueCell.v;
                                } else if (key === '项目经验' && valueCell.v) {
                                    try {
                                        var projectExperienceList = valueCell.v.split('********************');
                                        for (var t in projectExperienceList) {
                                            var projectExperience = thisObj.getProjectExperience();
                                            var projectInfos = $.trim(projectExperienceList[t]).split('\r\n');
                                            //2013-03至2013-12——内蒙赤峰水泥厂项目
                                            var projectDate = projectInfos[0].split("——")[0];
                                            if (moment(projectDate.split("至")[0], "YYYY-MM").isValid()) {
                                                projectExperience.projectStartDate = moment(projectDate.split("至")[0], "YYYY-MM").format("YYYY/MM/DD");
                                            }
                                            if (moment(projectDate.split("至")[1], "YYYY-MM").isValid()) {
                                                projectExperience.projectEndDate = moment(projectDate.split("至")[1], "YYYY-MM").format("YYYY/MM/DD");
                                            }
                                            projectExperience.projectName = projectInfos[0].split("——")[1];
                                            for (var index = 1; index < projectInfos.length; index++) {
                                                if (projectInfos[index].split("：")[0] === '项目描述') {
                                                    projectExperience.projectDescribe = projectInfos[index].split("：")[1];
                                                } else if (projectInfos[index].split("：")[0] === '所属公司') {
                                                } else {
                                                    projectExperience.responsibilities = projectInfos[i];
                                                }
                                            }
                                            if (projectExperience.projectName) {
                                                resumeInfo.addProjectExperience(projectExperience);
                                            }
                                            console.log("项目经验", projectExperience);
                                        }
                                    } catch (e) {
                                        console.log(e);
                                    }
                                }
                            }
                            //验证简历信息的字段长度
                            thisObj.processInvalidColumn(resumeInfo);

                            //根据【姓名 + 投递岗位】取得简历扩张信息，根据扩张信息补全工作地区
                            var resumeExt = resumeExtList[resumeInfo.name + '_' + resumeInfo.applyPosition] || {};
                            //工作地区
                            resumeInfo.workArea = resumeExt.workArea;

                            resumes.push(resumeInfo);
                        } catch (e) {
                            var params = {
                                "module": "前程无忧",
                                "content": e
                            };
                            JD.logToCenter(params);
                            modalWindow.append('<strong style="color:#f22c40">解析' + resumeInfo.sendTime + '-' + resumeInfo.name + '(' + resumeInfo.mobile + ')-' + resumeInfo.objectiveJob + e + '失败，该简历格式存在特殊情况</strong>');
                            thisObj.syncExcelProcessException(e, resumeInfo);
                            failureCount++;
                        }
                    }
                    modalWindow.append('总数量' + (rowTotal - 1) + '，成功解析<strong style="color:#00cc66">' + resumes.length + '</strong>，失败<strong style="color:#f22c40">' + failureCount + '</strong>');
                    return resumes;
                };

                //查找简历，导出excel
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
                    var trList = $('tr[id^=trBaseInfo_]');
                    var lastTr = trList[trList.length - 1];
                    var sendDate = $(lastTr).find("td.inbox_td:last").text();
                    var nextPage = thisObj.assertAfterDateCondition(sendDate, 'YYYY-MM-DD') && !$('#pagerBottomNew_nextButton').hasClass("aspNetDisabled");

                    //指定网站账号下简历扩张信息列表
                    var resumeExtList = JSON.parse(window.localStorage.getItem(JD.jdAccount.account.siteLoginAccount + "_ResumeExtList")) || {};

                    for (var rowNum = 1; rowNum <= 50; rowNum++) {
                        try {
                            var row = $('.list-table>table>tbody>tr#trBaseInfo_' + rowNum);
                            if (!thisObj.assertInDateCondition($.trim(row.find('td:nth-last-of-type(2)').text()), 'YYYY-MM-DD')) {
                                continue;
                            }
                            //列表CHeckBox复选框
                            var checkbox = row.find('input[name="chkBox"]:checkbox');
                            //求职投递ID
                            var id = checkbox.val();
                            //求职者姓名
                            var seekerName = $.trim(row.find('.a_username').text());
                            if (!seekerName) {
                                continue;
                            }

                            //求职者名称
                            var name = $.trim(row.find('td:nth-child(3)').text());
                            //职位名称
                            var positionName = $.trim(row.find('td:nth-child(4)').text());
                            //工作地区
                            var workArea = $.trim(row.find('td:nth-child(5)').text());

                            console.log("workArea（工作地区） = " + workArea);

                            //由于Excel表格中缺少工作地区字段，在简历下载到Excel前通过解析HTML结构，构造每条投递记录的工作地区
                            resumeExtList[name + '_' + positionName] = {workArea: workArea};

                            //存储到浏览器本地
                            window.localStorage.setItem(JD.jdAccount.account.siteLoginAccount + "_ResumeExtList", JSON.stringify(resumeExtList));

                            //列表CHeckBox复选框全选中
                            checkbox.prop('checked', true);

                            exported[thisObj.siteTypeCd].push(id);
                        } catch (e) {
                            var params = {
                                "module": "前程无忧",
                                "content": e
                            };
                            JD.logToCenter(params);
                            console.log(e);
                        }
                    }

                    //翻页方法（规则：翻页至日期不满足设置的时间段后不再翻页）
                    var nextStep = function (nextPage) {
                        if (nextPage) {
                            setTimeout(function () {
                                $('#pagerBottomNew_nextButton')[0].click();
                            }, 1000 * (Math.ceil(Math.random() * 3) + 5));
                        } else {
                            console.log("没有下一页简历数据进行数据同步处理。");
                            /*if (JD.jdAccount.account.saveToDb === 1) {
                                thisObj.syncRuipin(6);
                            }*/
                        }
                    };

                    //模拟网站页面所有简历信息全选
                    if ($('input:checkbox[name="chkBox"]:checked').length) {
                        //单击导出简历按钮
                        $(".list-table-bot>ul>li:eq(2)").find("a")[0].click();
                        setTimeout(function () {
                            var div = $("#div_ExportBoxHtml");
                            div.find("[name='exportType'][value='Pdf']").trigger('click');
                            div.find("[name='downloadType'][value='0']").trigger('click');
                            div.find('div.panelBtn_box>a:first')[0].click();
                        }, 1000);

                        //定时判断是否有需要解析的简历
                        var process51jobInterval = setInterval(function () {
                            setTimeout(null, 6000);
                            var form = $(document).data('51jobForm');
                            if (form) {
                                clearInterval(process51jobInterval);
                                //简历解析模式窗口
                                var modalWindow = thisObj.getModal().append('开始下载本页简历数据');
                                thisObj.request51JobDownload({
                                    forms: [form],
                                    responseType: 'arraybuffer',
                                    jdAction: '51jobDownload',
                                    callback: function () {
                                        nextStep(nextPage);
                                    },
                                    onload: function (fileData) {
                                        modalWindow.append('简历文件获取成功，开始获取简历文件');
                                        if (JD.jdAccount.account.saveToDb === 1) {
                                            var jsZip = new JSZip();
                                            try {
                                                jsZip.loadAsync(fileData).then(function (zip) {
                                                    var files = zip.files;
                                                    var pdfList = [];
                                                    //读取文件
                                                    for (var key in files) {
                                                        var pdfFile = files[key];
                                                        pdfFile.async('blob').then(function (data) {
                                                            //转为base64
                                                            readAsDataURL(data, function (error, base64) {
                                                                base64 = base64.substring(base64.indexOf(",") + 1);

                                                                pdfList.push(base64);
                                                            });
                                                        });
                                                    }

                                                    var pdfFileInterval = window.setInterval(function () {
                                                        if (pdfList.length == Object.keys(files).length) {
                                                            window.clearInterval(pdfFileInterval);
                                                            //上传简历
                                                            thisObj.syncRuipinPdf(pdfList, nextStep, [nextPage]);
                                                        }
                                                    }, 100)
                                                });
                                            } catch (e) {
                                                modalWindow.append('无法获取简历文件：解压文件失败，请稍后重试。');
                                                console.error(e, fileData);
                                            }


                                            /*var data = new Uint8Array(this.response);
                                            var arr = [];
                                            for (var i in data) {
                                                arr.push(String.fromCharCode(data[i]));
                                            }
                                            try {
                                                var workbook = _.read(arr.join(""), {type: "binary"});
                                                modalWindow.append('简历读取成功，开始解析Excel');
                                                var resumes = thisObj.getResumes();
                                                Array.prototype.push.apply(resumes, thisObj.processWorkbook.apply(thisObj, [workbook]));
                                                thisObj.setResumes(resumes);
                                            } catch (e) {
                                                var params = {
                                                    "module": "前程无忧",
                                                    "content": e
                                                };
                                                JD.logToCenter(params);

                                                modalWindow.append('<strong style="color:red">Excel读取错误，尝试重新读取</strong>');
                                                return false;
                                            }
                                            thisObj.syncJdDayExported(dayExported);
                                            thisObj.syncJdExported(exported);*/
                                        } else {
                                            modalWindow.append('简历读取成功，开始下载文件');
                                            try {
                                                var csvUrl = window.URL.createObjectURL(new Blob([fileData], {type: 'application/zip'}));
                                                var link = document.createElement('a');
                                                link.href = csvUrl;
                                                link.download = "51job_导出简历.zip";
                                                link.click();
                                            } catch (e) {
                                                modalWindow.append('<strong style="color:red">下载文件错误</strong>');
                                                return false;
                                            }
                                            modalWindow.append('文件下载成功');
                                        }
                                        return true;
                                    }
                                });
                            }
                        }, 3000);
                    } else {
                        nextStep(nextPage);
                    }
                };
                options.downloadJD = downloadJD;
                options.url = 'https://ehire.51job.com/InboxResume/InboxRecentEngine.aspx';
                JD.init(options);
            }
            //用户下线，则模拟上线登录
            else if (window.location.href.indexOf('ehire.51job.com/Member/UserOffline.aspx') > -1) {

            } else if (window.location.href.indexOf('https://ehire.51job.com/Jobs/JobSearchPost.aspx') > -1) {
                var consoleDiv = '<div id="consoleDiv"></div>';
                $('body').first().prepend(consoleDiv);
                //职位管理页面
                //取出 执行动作  1 采集当前页面职位  2 刷新职位
                var currentAction = sessionStorage.getItem("currentAction") || "1";
                if (currentAction == "1") {
                    showProcessMessage("正在收集当前页面职位信息。请耐心等候。耐心。。耐心。。。耐心。。。。");
                    var today = moment().format('YYYY-MM-DD');
                    var positionList = JSON.parse(sessionStorage.getItem("positionJson") || "{}");
                    var positionCount = 0;

                    $(".xing_Job").each(function (index, item) {
                        var positionInfo = {};
                        try {
                            positionInfo.id = $(this).attr("data-id");
                            positionInfo.name = $("#jobName_" + positionInfo.id + ">span").text();
                            positionInfo.refreshJobParams = $(this).find(".xing_Job_list__job label input").val();
                            var city = $(this).find(".xing_Job_list__area").text();
                            if (city) {
                                positionInfo.city = city.substring(1, city.length - 1);//[广州]
                            }
                            positionInfo.refreshDate = moment($(this).find("span.xing_Job_bgcolor__refresh").text(), "YYYY-MM-DD");
                            if (!positionInfo.refreshDate.isSame(moment(today), 'day')) {
                                positionCount++;
                                //需要刷新的职位加入列表.
                                var cityPositionList = positionList[positionInfo.city] || {};
                                cityPositionList[positionInfo.id] = positionInfo;
                                positionList[positionInfo.city] = cityPositionList;
                            }
                        } catch (e) {
                        }
                    });

                    sessionStorage.setItem("positionJson", JSON.stringify(positionList));
                    if ($("#pagerBottomNew_nextButton").hasClass("aspNetDisabled")) {
                        removeMessage();
                        showProcessMessage("已收集完毕当前页面职位信息。需要刷新的职位" + getPositionCount() + "个");
                        sessionStorage.setItem("currentAction", "2");
                        executeRefreshPosition();
                    } else {
                        var nextPage = $('<span>&nbsp;</span>');
                        $("#pagerBottomNew_nextButton").append(nextPage);
                        nextPage.trigger("click");
                        //下一页
                    }
                } else if (currentAction == "2") {
                    showProcessMessage("启动职位刷新任务。");
                    executeRefreshPosition();
                }
                //如果没采集完毕继续采集下一页
            }
        };

        function readAsDataURL(blob, callback) {
            var reader = new FileReader();
            reader.onload = function (evt) {
                callback(null, evt.target.result);
            };
            reader.onerror = function (evt) {
                callback(evt.error, null);
            };
            reader.readAsDataURL(blob);
        }

        //显示处理进度消息(追加显示)
        function showProcessMessage(msg) {
            $('#consoleDiv').append("<h1 style='color: green;align-content: center'>" + msg + "</h1>");
        }

        //删除处理进度消息（从最后行消息开始删除）
        function removeMessage() {
            $('#consoleDiv').empty();
        }

        //取得所有待刷新职位
        function getPositionCount() {
            var positionList = JSON.parse(sessionStorage.getItem("positionJson") || "{}");
            var count = 0;
            $.each(positionList, function (key, item) {
                count += getObjectLength(item);
            });
            return count;
        }

        //执行刷新定时任务
        function executeRefreshPosition() {
            var positionList = JSON.parse(sessionStorage.getItem("positionJson") || "{}");

            showProcessMessage("刷新职位任务开始。还有" + getPositionCount() + "个职位待刷新。");
            var refreshInterval = setInterval(function () {
                var today = new Date();
                var hour = today.getHours();
                var minutes = today.getMinutes();
                var times = (21 - hour) * 6;
                if (minutes % 10 != 0) {
                    showProcessMessage("时间未到。" + (10 - minutes % 10) + "分钟后将开始刷新职位。");
                    $.each(positionList, function (key, positions) {
                        var positionCount = getObjectLength(positions);
                        showProcessMessage("当前" + key + "未刷新职位还有" + positionCount + "个");
                    });
                    return;
                }
                removeMessage();
                var positionIds = "";
                var refreshJobParams = "";
                showProcessMessage("时间到了。开始职位刷新。");
                $.each(positionList, function (key, positions) {
                    var positionCount = getObjectLength(positions);
                    showProcessMessage("当前" + key + "未刷新职位" + positionCount + "个");
                    if (positionCount == 0) {
                        delete positionList[key];
                        return true;
                    }
                    var length = parseInt(positionCount / times) + 1;
                    showProcessMessage("准备刷新" + key + "的" + length + "个职位。");
                    $.each(positions, function (key, positionInfo) {
                        if (length <= 0) {
                            return false;
                        }
                        console.log("准备刷新", positionInfo);
                        positionIds += key + ",";
                        refreshJobParams += positionInfo.refreshJobParams + ",";
                        length--;
                        delete positions[key];
                    });
                });
                //去掉逗号
                positionIds = positionIds.substr(0, positionIds.length - 1);
                refreshJobParams = refreshJobParams.substr(0, refreshJobParams.length - 1);
                var params = {
                    doType: "Refresh",
                    JobID: refreshJobParams
                };
                showProcessMessage("开始刷新" + positionIds.split(",").length + "个职位。");

                $.post("https://ehire.51job.com/ajax/jobs/GlobalJobsAjax.ashx", params, function (data) {
                    showProcessMessage("职位刷新完毕。");
                    $.each(positionList, function (key, positions) {
                        var positionCount = getObjectLength(positions);
                        showProcessMessage("当前" + key + "未刷新职位还有" + positionCount + "个");
                    });
                    //更新未刷新职位列表
                    sessionStorage.setItem("positionJson", JSON.stringify(positionList));
                });

                if (getObjectLength(positionList) === 0) {
                    clearInterval(refreshInterval);
                } else {
                    setTimeout(function () {
                        var button = $('<span>&nbsp;</span>');
                        if ($("#pagerBottomNew_nextButton").hasClass("aspNetDisabled")) {
                            $("#pagerBottom_previousButton").append(button);
                        } else {
                            $("#pagerBottomNew_nextButton").append(button);
                        }
                        button.trigger("click");
                    }, 3000);

                }
            }, 60000);

        }

        /**
         * 取得对象的大小
         *
         * @param obj 传的对象
         * @returns number 对象的大小
         */
        function getObjectLength(obj) {
            var length = 0;
            $.each(obj, function () {
                length++;
            });
            return length;
        }

        //插件工具条构建实现方法
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
