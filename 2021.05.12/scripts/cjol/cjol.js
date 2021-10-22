(function ($, _, moment, _jd) {
    'use strict';
    var JD = new _jd('cjol');
    var options = {};
    var loginUserName;
    var settingDate;
    var taskKey;
    var downloadKey;
    var uploadKey;
    var hasDownloadKey;
    chrome.storage.sync.get(null, function (item) {
        //默认下载前天昨天今天的简历
        login();
        if (JD.jdAccount.isLogin()) {
            if (JD.jdAccount === undefined) {
                alert("未使用插件账号登陆,或已经超时");
                return;
            }
            loginUserName = JD.jdAccount.account.siteLoginAccount;
            settingDate = item.options[JD.types[JD.siteTypeCd]].dateScopeTime;
            taskKey = loginUserName + "_task";
            downloadKey = loginUserName + "_needDownloadResumes";
            uploadKey = loginUserName + "_needUploadResumes";
            hasDownloadKey = loginUserName + "_hasDownloadResumes";


            var consoleDiv = '<div id="consoleDiv"></div>';
            $('body').first().prepend(consoleDiv);

            log("登录账号:" + loginUserName);

            clearLocalStorageItem(taskKey);
            setInterval(function () {
                //开始1个下载任务
                var downloadTaskCount = getLocalStorageItem(taskKey).download || 0;
                var uploadTaskCount = getLocalStorageItem(taskKey).upload || 0;
                if (downloadTaskCount == 0) {
                    setLocalStorageItem(hasDownloadKey, $.extend(getLocalStorageItem(hasDownloadKey), getLocalStorageItem(downloadKey)));
                    clearLocalStorageItem(downloadKey);
                }
                if (uploadTaskCount == 0) {
                    clearLocalStorageItem(uploadKey);
                }
                if (downloadTaskCount == 0 && uploadTaskCount == 0) {
                    alert("所有任务已经完成,15分钟后自动刷新");
                    setTimeout(function () {
                        location.reload();
                    }, 1000 * 60 * 15);
                } else {
                    log("还有任务未完成", downloadTaskCount, uploadTaskCount);
                }
            }, 1000 * 60 * 15);
            startExecute();
        }
    });

    /**
     * 登录方法
     */
    function login() {
        if (($('a:contains(退出)').length == 1)) {
            JD.jdAccount.login();
        } else {
            //清除session
            options.login = function (jdAccount) {
                $('#txtusername').val(jdAccount.siteLoginAccount);
                $('#txtpassword').val(jdAccount.siteLoginPassword);
                $("#ValidateCode").trigger("focus");
            };
            options.loginURL = 'http://newrms.cjol.com/Account/Login';
            JD.login(options);
        }
    }

    /**
     * 下载简历方法入口
     */
    function startExecute() {
        if (location.href.match(/.*.cjol\.com\/jobpost.*/)) {
            //刷新职位 什么都不做
        } else if (location.href.match(/.*.cjol.com\/resumebank.*/)) {
            var needDownloadResumes = getLocalStorageItem(downloadKey);
            var count = getObjectLength(needDownloadResumes);
            if (count > 0) {
                download(needDownloadResumes, count);
            } else {
                getResumeList();
            }
            //登陆首页后，直接跳转到简历管理页面
        } else if (location.href.indexOf("http://newrms.cjol.com/Default") > -1) {
            window.location.href = "http://newrms.cjol.com/resumebank/default";
        }
    }

    /**
     * 取得简历信息list
     *
     * @param pageIndex 页码
     */
    function getResumeList(pageIndex) {
        if (!pageIndex) {
            pageIndex = 1;
        }
        var data = {
            pageIndex: pageIndex,
            pageSize: "2000"
        };

        $.post("http://newrms.cjol.com/ResumeBank/ResumeList", data, function (response) {
            log("加载第" + pageIndex + "页简历");
            var needDownloadResumes = getLocalStorageItem(loginUserName + "_needDownloadResumes");
            var resumeList = $(response).find("div.rmsdetail-top.clearfix");
            var hasOutScopeResume = false;
            resumeList.each(function (index, item) {
                    var jobPostTime = $(item).find("div span").text();
                    var resumeInfo = $(item).find("label i");
                    var jobPostId = $(resumeInfo).attr("jobpostid");
                    var resumeName = $(resumeInfo).attr("resumename");
                    var resumeBankId = $(resumeInfo).attr("resumebankid");
                    if (getLocalStorageItem(hasDownloadKey)[resumeBankId]) {
                        return true;
                    }
                    if (moment(settingDate).dayOfYear() <= moment(jobPostTime).dayOfYear()) {
                        needDownloadResumes[resumeBankId] = {
                            resumeName: resumeName,
                            jobPostId: jobPostId,
                            jobPostTime: jobPostTime
                        }
                    } else {
                        hasOutScopeResume = true;
                    }
                }
            );
            //需要下载的简历
            setLocalStorageItem(loginUserName + "_needDownloadResumes", needDownloadResumes);
            if (!hasOutScopeResume) {
                return getResumeList(pageIndex + 1);
            } else {
                var count = getObjectLength(needDownloadResumes);
                log("加载完毕,共有" + count + "条投递信息需要下载");
                download(needDownloadResumes, count);
            }
        });
    }

    /**
     * 下载简历 最大可下200份 考虑第三方服务器压力 用100份分批下载
     * @param needDownloadResumes 需要下载简历列表
     * @param count 简历数
     */
    function download(needDownloadResumes, count) {
        var resumeBankIds = {};
        $.each(needDownloadResumes, function (key) {
            var ids = resumeBankIds[Math.ceil(count / 100)] || "";
            ids += key + ",";
            resumeBankIds[Math.ceil(count / 100)] = ids;
            count--;
        });
        $.each(resumeBankIds, function (index, ids) {
            var taskKey = loginUserName + "_task";
            //开始1个下载任务
            setLocalStorageItem(taskKey, {download: (getLocalStorageItem(taskKey).download || 0) + 1});
            var url = "http://newrms.cjol.com/ResumeBank/DownloadExcel?Flag=3&ResumeBankID=" + ids.substring(0, ids.length - 1) + "&bResumeEN=false";
            log("开始下载简历", url);
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
                try {
                    var workbook = XLSX.read(arrayString, {type: "binary"});
                    //结束1个下载任务
                    setLocalStorageItem(taskKey, {download: (getLocalStorageItem(taskKey).download || 0) - 1});
                    parseResumeWorkbook(workbook);
                } catch (e) {
                    setTimeout(function () {
                        oReq.open("GET", url, true);
                        oReq.send();
                    }, 30 * 1000);
                }
            };
            oReq.onError = function () {
                setTimeout(function () {
                    oReq.open("GET", url, true);
                    oReq.send();
                }, 3000);
            };
            try {
                oReq.send();
            } catch (e) {
                setTimeout(function () {
                    oReq.open("GET", url, true);
                    oReq.send();
                }, 30 * 1000);
            }
        })
    }

    /**
     * 解析简历列表sheet
     * @param workbook
     */
    function parseResumeWorkbook(workbook) {
        var listInfos = XLSX.utils.sheet_to_json(workbook.Sheets['导出简历列表']);
        var resumes = {};
        var syncResumes = [];
        $.each(listInfos, function (index, item) {
            var resumeId = item['编号'];
            var resumeName = item['姓名'];
            var resume = {};
            if (resumes[resumeId]) {
                resume = JSON.parse(resumes[resumeId]);
            } else {
                var sheet = workbook.Sheets[index + 1 + "." + resumeName];
                resume = parseResumeSheet(sheet);
                resume.resume_id = resumeId;
            }
            resume.sexName = item['性别'];
            resume.age = parseInt(item['年龄']);
            resume.workName = item['经验'];
            resume.expectSalaryName = item['月薪'];
            resume.cityName = item['所在地'];
            resume.mobile = item['手机'];
            resume.email = item['邮件'];
            resume.educationName = item['学历'];
            resume.school = item['学校'];
            resume.major = item['专业'];
            resume.previewCompany = item['最近公司'];
            //最近职位
            resume.objectiveJob = item['应聘职位'];
            var sendTime = item['接收/下载日期'].split("-");
            resume.sendTime = sendTime[0] + "/" + sendTime[1] + "/" + sendTime[2];
            resumes[resumeId] = JSON.stringify(resume);
            syncResumes.push(resume);
        });
        setLocalStorageItem(taskKey, {upload: (getLocalStorageItem(taskKey).upload || 0) + 1});
        upload(syncResumes);
    }

    /**
     * 解析单个求职者sheet
     * @param sheet
     */
    function parseResumeSheet(sheet) {
        var resume = {};
        //姓名
        resume.name = sheet["A" + 1].v;
        //学历
        resume.educationName = sheet["B" + 7].v;
        //毕业院校
        resume.school = sheet["B" + 8].v;
        //专业
        resume.major = sheet["B" + 9].v;
        //性别
        resume.sexName = sheet["D" + 7].v;
        //年龄
        resume.age = parseInt(sheet["D" + 8].v);
        //婚否
        resume.marriedName = sheet["D" + 10].v;
        var sheetMaxRow = sheet['!range'].e.r;
        var workBeginIndex = 25;
        if (workBeginIndex <= sheetMaxRow) {
            var workEndIndex = sheetMaxRow;
            var eduBeginIndex;
            var eduEndIndex;
            var skillBeginIndex;
            var skillEndIndex;
            for (var i = workBeginIndex; i < sheetMaxRow; i++) {
                if (sheet['A' + i]) {
                    if (sheet['A' + i].v == '教育背景') {
                        workEndIndex = i - 1;
                        eduBeginIndex = i + 1;
                        eduEndIndex = sheetMaxRow;
                    } else if (sheet['A' + i].v == '技能专长') {
                        eduEndIndex = i - 1;
                        skillBeginIndex = i + 1;
                        skillEndIndex = sheetMaxRow;
                    }
                }
            }
            //工作经历
            resume.workExperienceList = parseWorkExperience(sheet, workBeginIndex);
            //教育经历
            if (eduBeginIndex) {
                resume.educationExperienceList = parseEducation(sheet, eduBeginIndex)
            }
            //个人技能
            if (skillBeginIndex) {
                resume.personSkill = parseSkill(sheet, skillBeginIndex)
            }
        }
        return resume;
    }

    /**
     * 上传简历
     *
     * @param syncResumes 待上传的简历
     */
    function upload(syncResumes) {
        var jdAccount = JD.jdAccount.account;
        var para = {
            resumePackage: JSON.stringify({
                resumeSiteUid: jdAccount.resumeSiteUid,
                resumes: syncResumes
            })
        };
        $.post(jdAccount.receiveURL,
            para,
            function (result) {
                log(result.msg);
                console.log(result);
                if (result.code == 0) {
                    setTimeout(upload(syncResumes), 3000);
                } else {
                    setLocalStorageItem(taskKey, {upload: (getLocalStorageItem(taskKey).upload || 0) - 1});
                }
            }
        );
    }

    /**
     * 仅解析就近工作经历
     * @param sheet 简历sheet页
     * @param workBeginIndex 工作经历开始行
     * @returns {*[]}
     */
    function parseWorkExperience(sheet, workBeginIndex) {
        var workExp = {};
        //深圳恒丰达食品有限公司   运营专员   2013/06至2016/05(2年11月)   保密
        var workInfo = sheet['A' + workBeginIndex].v.split('   ');
        //公司
        workExp.workUnit = workInfo[0];
        //公司行业
        workExp.companyIndustryName = workInfo[1];
        //公司性质
        workExp.companyNutureName = sheet['A' + (workBeginIndex + 1)].v;
        //工作内容
        workExp.jobContent = sheet['A' + (workBeginIndex + 2)].v;
        return [workExp];
    }

    /**
     * 仅解析教育经历
     * @param sheet 简历sheet页
     * @param eduBeginIndex 教育经历开始行
     * @returns {*[]}
     */
    function parseEducation(sheet, eduBeginIndex) {
        var edu = {};
        //云南大学旅游文化学院 本科 2012/09至2016/06
        var eduInfo = sheet['A' + eduBeginIndex].v.split(' ');
        //学校
        edu.school = eduInfo[0];
        //专业
        edu.major = sheet['A' + (eduBeginIndex + 1)].v;
        //学历
        edu.educationName = eduInfo[1];
        return [edu];
    }

    /**
     * 解析个人技能项（主要是语言技能）
     *
     * @returns {*[]}
     */

    function parseSkill(sheet, skillBeginIndex) {
        var skill;
        skill = skill + sheet['A' + skillBeginIndex].v;
        return skill;
    }

    /**
     * print日志
     * @param msg 要打印的信息
     */
    function log(msg) {
        $('#consoleDiv').append("<h1 style='color: green;align-content: center'>" + msg + "</h1>");
        $('#consoleDiv').append("<br>");
    }

    /**
     * 取得传入对象的长度
     */
    function getObjectLength(object) {
        if (object) {
            var count = 0;
            $.each(object, function () {
                count++
            });
            return count;
        }
    }


    /**
     * 清空本地缓存中的内容
     *
     * @param key 缓存主键
     */
    function clearLocalStorageItem(key) {
        return window.localStorage.setItem(key, null);
    }

    /**
     * 给本地缓存中的赋值
     *
     * @param key 缓存主键
     * @param item 要赋的值
     */
    function setLocalStorageItem(key, item) {
        return window.localStorage.setItem(key, JSON.stringify(item));
    }

    /**
     * 获取本地缓存中的内容
     *
     * @param key 缓存主键
     */
    function getLocalStorageItem(key) {
        return JSON.parse(window.localStorage.getItem(key)) || {}
    }


}(jQuery, XLSX, moment, JdUtils));

