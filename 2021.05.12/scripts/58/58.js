(function ($, _, moment, _jd) {
        'use strict';
        var defaultFormat = 'YYYY/MM/DD';
        var JD = new _jd('58');
        var thisObj;

        //已经下载的简历
        var hasDownLoad;
        var settingDate;
        var siteLoginAccount;
        var companyWorkArea;
        chrome.storage.sync.get(null, function (item) {
            if (location.href.indexOf("my.58.com") > -1) {
                return;
            }
            //个人简历详情页面
            if (location.href.indexOf("jianli.58.com/resumedetail/single/") > -1) {
                return;
            }

            //默认下载前天昨天今天的简历
            if (!JD.jdAccount.isLogin() && ($('a:contains(个人中心)').length > 0 || $('a:contains(58用户中心)').length > 0)) {
                JD.jdAccount.login();
            }

            //跳过这两个网址
            //目的：实现不自动登录网站，规避因58手机确认码验证造成的闪烁现象
            if (window.location.href.indexOf('vip.58.com/logout') > -1 || window.location.href.indexOf('passport.58.com/warn/ui') > -1) {
                return;
            }
            settingDate = item.options[JD.types[JD.siteTypeCd]].dateScopeTime;
            thisObj = this;
            var options = {};

            if (!JD.jdAccount.isLogin() && ($('a:contains(个人中心)').length === 0 || $('a:contains(58用户中心)').length === 0)) {
                options.login = function (jdAccount) {
                    $('#username').val(jdAccount.siteLoginAccount).attr('readOnly', 'readOnly');
                    $('#password').val(jdAccount.siteLoginPassword);
                };
                options.loginURL = '//passport.58.com/login';
                JD.login(options);
                return;
            }

            if (JD.jdAccount.isLogin()) {
                if (JD.jdAccount === undefined) {
                    alert("未使用插件账号登陆，或已经超时");
                    return;
                }
                siteLoginAccount = JD.jdAccount.account.siteLoginAccount;

                //初始化帐号网站信息 工作地址
                $.get("//qy.58.com/entinfo", function (response) {
                    companyWorkArea = response.data.address;
                });

                //TODO:待明确
                if (window.location.href.indexOf('employer.58.com/?from=redirect_vipcenter') > -1) {
                    location.href = "//employer.58.com//resumereceive";
                }
                //TODO:待明确
                else if (window.location.href.indexOf('//employer.58.com/index') > -1) {
                    location.href = "//employer.58.com//resumereceive";
                }
                //TODO:待明确
                else if (location.href.indexOf("//employer.58.com//resumereceive") > -1) {
                }

                //已经下载的简历 用作下载的去重判断
                try {
                    hasDownLoad = JSON.parse(window.localStorage.getItem(siteLoginAccount + "_58_hasDownLoad")) || {};
                } catch (e) {
                    hasDownLoad = {};
                }

                if (location.href.indexOf("//employer.58.com") > -1) {
                    var consoleDiv = '<div id="consoleDiv"></div>';
                    $('body').first().prepend(consoleDiv);
                    showProcessMessage("登录账号:" + siteLoginAccount);
                    showProcessMessage("准备下载简历日期区间:" + settingDate + "----" + moment().format(defaultFormat));
                }
            }

            //延时5秒执行插件方法（目的：规避58盾的验证）
            setTimeout(_startExecute, 5000);
        });

        //执行方法入口
        function _startExecute() {
            var resumeIds = getResumeIdList();
            /*if (resumeIds.length) {
                try {
                    //如果出现异常直接忽略这批简历 进行下一批简历进行入库
                    downLoadResume(resumeIds);
                } catch (e) {
                    console.log(e);
                }
            } else {
                nextStep();
            }*/
        }

        /**
         * 取得对象的大小
         *
         * @param obj 传的对象
         * @returns 对象的大小
         */
        function getObjectLength(obj) {
            var length = 0;
            $.each(obj, function (index, item) {
                length++;
            });
            return length;
        }

        //显示处理进度消息(追加显示)
        function showProcessMessage(msg) {
            $('#consoleDiv').append("<h1 style='color: green;align-content: center'>" + msg + "</h1>");
            $('#consoleDiv').append("<br>");
        }

        //删除处理进度消息（从最后行消息开始删除）
        function removeMessage() {
            $('#consoleDiv').find('>h1:last').remove();
            $('#consoleDiv').find('>br:last').remove();
        }

        /**
         *  判断简历是否已经下载过
         * @param param 简历id
         * @returns {boolean} true 已下载 false 未下载
         */
        function hasDownloaded(param) {
            var waitUpload = JSON.parse(localStorage.getItem(JD.jdAccount.account.siteLoginAccount + "_58_hasDownLoad") || "{}");
            if (waitUpload[param] != null) {
                console.log(param + "  已经下载过...... 不再下载 等待上传");
                return true;
            } else {
                console.log(param + "  新增简历...... 等待上传");
                return false;
            }
        }

        /**
         * 获取简历信息
         */
        function getResumeIdList() {
            var allId = "";
            //var flag = true;
            var resumeIdList = [];
            $('body > div.wrap > div.resume_container_left>div.resume-detail.container > div.detail-content > div.detail-content-card > div.common-resume-card > div.item-job-card').each(function (idx, item) {
                var sendTime = moment($.trim($(item).find('div.post-head > span.deliver-time').text().replace('投递时间：', '')), 'YYYY/MM/DD');
                if (sendTime.isBefore(settingDate)) {
                    console.log('日期时间不在要求范围内', sendTime);
                    //flag = false;
                    return false;
                } else {
                    var resumeId = $(item).find('div.pos-dtl > div.dtl-left > i').attr('resumeid');
                    var userName = $(item).find('div.pos-dtl > div.dtl-left > ul > li.seeker-name > a').text();
                    var jobId = $(item).find('div.pos-dtl > div.dtl-left > i').attr('infoid');
                    var jobName = $.trim($(item).find('div.post-head > span.deliver-pos').text().replace('投递职位:', '')).substring(4);
                    var jobInfo = {
                        jobId: jobId,
                        jobName: jobName
                    };
                    var resumeExtList = JSON.parse(window.localStorage.getItem(JD.jdAccount.account.siteLoginAccount + '_ResumeExtList')) || {};
                    resumeExtList[userName + '_' + jobInfo.jobName.substring(0, 4)] = {
                        jobInfo: jobInfo
                    };

                    resumeIdList.push(resumeId);
                    window.localStorage.setItem(JD.jdAccount.account.siteLoginAccount + '_ResumeExtList', JSON.stringify(resumeExtList));
                    //未下载 则将简历id 添加到下载集合中
                    if (!hasDownloaded(resumeId)) {
                        allId = allId + resumeId + "|";
                        hasDownLoad[resumeId] = "";
                    }
                }
            });

            saveHasDownLoad(hasDownLoad);
            allId = allId == "" ? "" : allId.substring(0, allId.length - 1);
            //去下载解析简历
            setTimeout(null, 3000);

            getSingleResumeDetail(resumeIdList, allId);
            return allId;
        }

        /**
         * 获取个人简历详情数据
         * @param resumeIdList 简历ID列表
         */
        function getSingleResumeDetail(resumeIdList, allId) {
            var singleResumeDetail = {};
            var singleResumeDetailLoadedSize = 0;
            console.log("加载期望地点");
            $.each(resumeIdList, function (index, value) {
                //取得投递岗位信息
                function getResumeDetail(resumeInfo) {
                    var dtd = $.Deferred();

                    var url = "//jianli.58.com/resumedetail/single/" + resumeInfo.resumeId;
                    //loadScript将异步加载一个js文件，所以返回值是一个Deferred对象
                    var tasks = function () {
                        $.ajax({
                            method: 'GET',
                            url: url,
                            headers: {'Content-Type': 'application/x-www-form-urlencoded'}
                        }).done(function (result) {
                            //期望地点
                            resumeInfo.jobPlace = $.trim($(result).find('#expectLocation').text());
                            //求职状态
                            resumeInfo.jobStateName = $.trim($(result).find('#Job-status').text());

                            resumeInfo.name = $.trim($(result).find("#name").text()).substr(1);
                            dtd.resolve();
                        });
                    };
                    setTimeout(tasks, 3000);
                    //返回自定义的dtd对象，才能保证返回值的done回调在load事件完成后执行
                    return dtd.promise();
                }

                //简历信息
                var resumeInfo = {
                    index: index,
                    resumeId: value,
                    name: '',
                    jobPlace: '',
                    jobStateName: ''
                };
                $.when(getResumeDetail(resumeInfo)).done(function () {
                    var resumeDetails = JSON.parse(window.localStorage.getItem(JD.jdAccount.account.siteLoginAccount + "_58_resumesInfo") || "{}") || {};
                    resumeDetails[resumeInfo.name] = resumeInfo;
                    localStorage.setItem(JD.jdAccount.account.siteLoginAccount + "_58_resumesInfo", JSON.stringify(resumeDetails));
                    singleResumeDetailLoadedSize++;
                });
            });

            var interval = setInterval(function () {
                //当页面所有有效简历都加载完岗位信息后
                if (singleResumeDetailLoadedSize == resumeIdList.length) {
                    clearInterval(interval);

                    downLoadResume(allId);
                }
            }, 1000);
        }

        /**
         * 保存已经下载的简历ID到本地内存
         *
         * @param hasDownLoad 已经下载的简历ID数组
         */
        function saveHasDownLoad(hasDownLoad) {
            window.localStorage.setItem(JD.jdAccount.account.siteLoginAccount + '_58_hasDownload', JSON.stringify(hasDownLoad));
        }

        /**
         * 教育背景填充
         *
         * @param currentVal 要解析的教育信息值
         * @param index 要解析的第几份教育信息
         * @param i 要解析的简历教育信息行数
         */
        function fillEducationExperience(currentVal, index, i) {
            //2011/10-2014/12 湖南师范大学|汉语言文学|本科
            var education = {};
            try {
                //当前值为空 则不进行教育信息的获取
                if (currentVal) {
                    //起止日期 学校 专业 学历
                    var eduInfo = currentVal.split(" ");
                    //开始年月 结束年月
                    var educationPeriod = eduInfo[0].split("-");
                    var startDate = moment(educationPeriod[0] + "/01", "YYYY/MM/DD");
                    if (startDate.isValid()) {
                        education.startDate = startDate.format("YYYY/MM/DD");
                    }
                    var endDate = moment(educationPeriod[1] + "/01", "YYYY/MM/DD");
                    if (endDate.isValid()) {
                        education.startDate = endDate.format("YYYY/MM/DD");
                    }

                    education.school = eduInfo[1].split("|")[0];
                    education.major = eduInfo[1].split("|")[1];
                    education.educationName = eduInfo[1].split("|")[2];
                    return education;
                }
            } catch (e) {
                showProcessMessage("第" + parseInt(index + 1) + "份简历，第" + i + "行解析教育经历失败,已忽略教育经历:");
                var params = {
                    "module": "58同城",
                    "content": e
                };
                JD.logToCenter(params);
                console.log(e);
            }
        }

        /**
         * 解析简历信息
         * @param resumeJson 要解析的简历信息Json
         * @param workbook excel的方法
         */
        function parseResume(resumeJson, workbook) {
            var syncResumes = [];
            var resumeDetails = JSON.parse(window.localStorage.getItem(JD.jdAccount.account.siteLoginAccount + "_58_resumesInfo") || "{}") || {};
            $.each(resumeJson, function (index, item) {
                var syncResume = {};
                try {
                    //用excel sheetName取姓名
                    var sheetName = workbook.SheetNames[index + 1];
                    var userSheet = workbook.Sheets[sheetName];
                    syncResume.name = item['姓名'];
                    syncResume.sexName = item['性别'];
                    syncResume.age = parseInt(item['年龄']);
                    syncResume.jobTypeName = item['简历类型'];
                    syncResume.objectiveJob = item['应聘职位'];
                    syncResume.applyPosition = item['应聘职位'];
                    syncResume.expectSalaryName = item['期望薪资'];
                    syncResume.previewCompany = item['现工作单位'];
                    syncResume.previewPost = item['现职位'];
                    syncResume.major = item['专业'];
                    syncResume.school = item['学校名称'];
                    syncResume.eduexprList = [];
                    syncResume.workexprList = [];
                    syncResume.workName = item['工作经验'];
                    syncResume.mobile = item['手机'];
                    syncResume.provinceCityRegion = item['现居住地'];
                    syncResume.residentAddress = item['现居住地'];
                    syncResume.email = item['电子邮件'];
                    syncResume.educationName = item['最高学历'];
                    syncResume.sendTime = item['下载日期'];
                    var sheetMaxRow = userSheet['!range'].e.r;
                    var currentInfo;
                    var currentPara;
                    //数组属性游标
                    var currentArrayIndex = 1;
                    var params = {
                        个人基本信息: {
                            type: "string",
                            婚姻状况: {key: "marriedName"},
                            户口: {key: "registerAddress"}
                        },
                        求职意向: {
                            type: "string",
                            '求职职位：': {key: "jobIndustry"}
                            /*'期望工作地区：': {key: "jobPlace"}*/
                        },

                        自我评价: {
                            type: "nextString",
                            key: "introduction"
                        },
                        教育背景: {
                            type: "array",
                            key: "eduexprList"
                        },
                        工作经历: {
                            type: "array",
                            key: "workexprList"
                        },
                        证书名称: {},
                        语言种类: {
                            type: "String",
                            key: "personSkill"
                        }
                    };

                    for (var i = 1; i < sheetMaxRow + 1; i++) {
                        //当前A列内容
                        var cellA = userSheet["A" + i] || {};
                        var cellB = userSheet["B" + i] || {};
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
                        }
                        else if (currentPara.type == 'nextString' && currentVal != "") {
                            syncResume[currentPara.key] = currentVal;
                        }
                        else if (currentInfo == '教育背景') {
                            if (fillEducationExperience(currentVal, index, i) != 'undefined') {
                                syncResume[currentPara.key].push(fillEducationExperience(currentVal, index, i));
                            }
                        }
                        else if (currentInfo == '工作经历') {
                            var result = fillWorkExperience(syncResume, currentPara.key, currentArrayIndex, currentVal, index, i);
                            syncResume = result.syncResume;
                            currentArrayIndex = result.currentArrayIndex;
                        }
                    }
                    // 工作年限
                    syncResume.workName = item['工作年限'];
                    if (syncResume.mobile) {
                        if (syncResume != 'undefined') {
                            syncResumes.push(syncResume);
                        }
                    }
                    //工作地址 暂不使用岗位工作地 直接用营业执照的公司所属城市
                    syncResume.workArea = companyWorkArea;
                    syncResume.workAddress = companyWorkArea;

                    syncResume.jobPlace = resumeDetails[syncResume.name.substr(1)] ? resumeDetails[syncResume.name.substr(1)].jobPlace : "";
                } catch (e) {
                    console.log(e);
                    showProcessMessage("出现异常:" + e.message);
                }

            });
            return syncResumes;
        }

        /**
         * 上传简历信息
         *
         * @param syncResumes 待同步的简历
         */
        function uploadResumeData(syncResumes) {
            if (JD.jdAccount === undefined) {
                alert("未使用插件账号登陆");
                return;
            }

            if (JD.jdAccount.account.saveToDb === 1) {
                nextStep();
                return;
            }

            $.ajax({
                url: JD.jdAccount.account.receiveURL,
                data: {
                    'resumePackage': JSON.stringify({
                        resumeSiteUid: JD.jdAccount.account.resumeSiteUid,
                        resumes: syncResumes
                    })
                },
                cache: false,
                type: 'POST',
                success: function (res, para) {
                    if (res.code == 1) {
                        nextStep();
                    } else {
                        //重新保存 记录日志
                        showProcessMessage("上传失败,稍后请手动刷新,重新上传");
                        console.log(res, para);
                    }
                },
                error: function () {
                    //重新保存 记录日志
                    localStorage.setItem(siteLoginAccount + "_58_syncResumes", JSON.stringify(syncResumes));
                    showProcessMessage("上传失败,稍后请手动刷新,重新上传");
                }
            });
        }

        /**
         * 填充工作经历
         * @param syncResume 要填充的简历实体
         * @param key 该简历的第几份工作经历
         * @param currentArrayIndex 当前要设置的
         * @param currentVal 工作经历信息内容
         * @param index 该excel中第多少份简历
         * @param i 该简历中的第多少行工作经历
         * @returns {{syncResume: *, currentArrayIndex: *}}
         */
        function fillWorkExperience(syncResume, key, currentArrayIndex, currentVal, index, i) {
            var workExp;
            try {
                workExp = {};
                //2015年12月-2016年2月|湘潭市电线电缆有限公司|会计助理|1000-2000
                var arrayIndex = Math.floor(currentArrayIndex / 5);
                //如果excel中工作信息的第一行 则为起止日期和公司信息
                if (currentArrayIndex === 1) {
                    if (currentVal) {

                        //起止日期 公司 总共月份
                        var workInfo = currentVal.split("|");
                        //开始年月 结束年月
                        var workPeriod = workInfo[0].split("-");

                        var startDate = moment(workPeriod[0].replace("年", "/").replace("月", "/") + "01", 'YYYY/MM/DD');
                        if (startDate.isValid()) {
                            workExp.startDate = startDate.format("YYYY/MM/DD");
                        }
                        var endDate = moment(workPeriod[1].replace("年", "/").replace("月", "/") + "01", 'YYYY/MM/DD');
                        if (endDate.isValid()) {
                            workExp.endDate = endDate.format("YYYY/MM/DD");
                        }
                        //公司
                        workExp.workUnit = workInfo[1];
                        //职位
                        workExp.post = workInfo[2];
                    }
                    //如果excel中工作信息的第2行 工作内容
                } else if (currentArrayIndex === 2 && currentVal) {
                    workExp.jobContent = currentVal;
                }
                syncResume[key][arrayIndex] = workExp;
                currentArrayIndex++;
            } catch (e) {
                showProcessMessage("第" + parseInt(index + 1) + "份简历，第" + i + "行解析工作经历失败,已忽略工作经历:");
                var params = {
                    "module": "58同城",
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
         * 下载简历excel
         *
         * @param allId 要下载的简历ID
         */
        function downLoadResume(allId) {
            var allIds = allId.split("|");
            //数据量太大Ajax会报错，分成多个部分，25条一组
            var result = [];
            for (var i = 0, len = allIds.length; i < len; i += 25) {
                result.push(allIds.slice(i, i + 25));
            }

            var uploadResumeDataArray = [];
            var parseResumeCount = 0;
            //循环处理
            for (var i = 0, len = result.length; i < len; i++) {
                setTimeout(function (result, i, uploadResumeDataArray) {
                    var downloadURL = '//statisticszp.58.com/downloadresumenew?zpBusinessType=2&isgray=0&needbind=0&id=' + result[i].join("|");
                    console.log('开始解析本页第' + i + '部分EXCEL数据');

                    if (JD.jdAccount.account.saveToDb === 1) {
                        var httpRequest = new XMLHttpRequest();
                        httpRequest.open("POST", downloadURL, true);
                        httpRequest.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                        httpRequest.responseType = "arraybuffer";
                        httpRequest.onload = function () {
                            var arraybuffer = httpRequest.response;
                            var data = new Uint8Array(arraybuffer);
                            var arr = [];
                            for (var i = 0; i != data.length; ++i) arr[i] = String.fromCharCode(data[i]);
                            try {
                                var workbook = XLSX.read(arr.join(""), {type: "binary"});
                                var resumeJson = XLSX.utils.sheet_to_json(workbook.Sheets['下载的简历列表']);
                                //解析文件
                                setTimeout(null, 3000);
                                resumeJson = parseResume(resumeJson, workbook);
                                uploadResumeDataArray.push.apply(uploadResumeDataArray, resumeJson);
                                parseResumeCount++;
                            } catch (e) {
                                //nextStep();
                                console.log("解析excel发生异常,忽略简历", e);
                                parseResumeCount++;
                            }
                        };
                        httpRequest.send();
                    }
                    else {
                        //下载文件
                        window.open(downloadURL);
                        parseResumeCount++;
                    }
                }, 2000 * i, result, i, uploadResumeDataArray);
            }
            //判断是否完成
            var interval = setInterval(function () {
                //当页面所有有效简历都加载完岗位信息后
                if (parseResumeCount == result.length) {
                    clearInterval(interval);

                    if (uploadResumeDataArray.length > 0) {
                        uploadResumeData(uploadResumeDataArray);
                    }
                    else {
                        nextStep();
                    }
                }
            }, 1000);
        }

        /**
         * 翻页功能
         * 规则： 投递时间超出设定时间后不再翻页
         */
        function nextStep() {
            var sendTime = moment($.trim($('body > div.wrap > div.resume_container_left >div.resume-detail.container > div.detail-content > div.detail-content-card > div.common-resume-card > div.item-job-card > div.post-head > span.deliver-time').text().replace('投递时间：', '')), 'YYYY/MM/DD');
            var nextPageNum = $('body > div.wrap > div.resume_container_left > div.resume-detail.container > div.detail-foot > ul > li.page-num.fr > a.nextPage.icon.icon-arrow-right.pageClick').attr('pn');
            //到达尾页或者已到达指定时间范围
            if (!nextPageNum || sendTime.isBefore(settingDate)) {
                if (getObjectLength(hasDownLoad) != 0) {
                    showProcessMessage("已经没有可下载的简历了，总共上传" + getObjectLength(hasDownLoad) + "份简历，稍后可手动刷新");
                }
                //清空已下载的列表
                hasDownLoad = [];
                saveHasDownLoad(hasDownLoad);
                //清空接收的的职位信息
                var clearReceiveDetail = [];
                window.localStorage.setItem(JD.jdAccount.account.siteLoginAccount + '_ResumeExtList', JSON.stringify(clearReceiveDetail));
                return;
            }
            removeMessage();
            showProcessMessage("开始加载第" + nextPageNum + "页的简历信息");
            if (nextPageNum > 0) {
                var nextFile = $('body > div.wrap > div.resume_container_left >div.resume-detail.container > div.detail-foot > ul > li.page-num.fr > a.nextPage.icon.icon-arrow-right.pageClick');
                var nextPageBtn = $('<span>&nbsp;</span>');
                nextFile.append(nextPageBtn);
                nextPageBtn.trigger('click');
                setTimeout(getResumeIdList, 5000);
            }
        }
    }(jQuery, XLSX, moment, JdUtils)
);
