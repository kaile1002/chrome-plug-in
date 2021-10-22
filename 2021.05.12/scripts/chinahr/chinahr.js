(function ($, moment, _jd) {
        'use strict';
        var JD = new _jd('chinahr');
        var settingDate;
        var currentLoginName;
        var downloadList;
        var uploadUrl;
        window.alert = function (str) {
            console.log(str);
            if (str.indexOf('简历已被球求职者删除') > -1) {
                var params = window.location.href.split('?')[1].split('&');
                //服务器错误 刷新
                if (document.title.indexOf('Error') > -1 || document.title.indexOf('错误') > -1) {
                    window.location.reload();
                    return;
                }
                var param = params[0].split("=")[1];
                delete  downloadList[param];
                goToDownloadData();
            }
        };

        //登录（插件将取得的网站账号和密码赋值到登录页面的用户和密码中）
        function login() {
            if (JD.jdAccount.isLogin() || $('#main > div > div.mainContainer > div > div.mainHeader > div > div.rtHeader > div.comOpts > div > ul > li:nth-child(3) > a').text() == '退出登录') {
                JD.jdAccount.login();
            } else {
                if (!JD.jdAccount.isLogin()) {
                    var options = {};
                    options.login = function (jdAccount) {
                        $('#username').val(jdAccount.siteLoginAccount);
                        $(".toogle-eye input").val(jdAccount.siteLoginPassword);
                    };
                    // $('#normal-login > div.form-field.img-code-wrap.hide').attr('display','none');
                    options.loginURL = 'http://passport.chinahr.com/qy/buser/login';
                    JD.login(options);
                }
            }
        }

        //策略如下
        //登录
        //进入简历列表 种子页面
        //翻页 记录简历id 和 url
        //翻页结束  跳转简历url
        //100份简历加载完毕或所有简历加载完毕 上传
        //结束
        chrome.storage.sync.get(null, function (syncItem) {
            setTimeout(function () {
                login();
                settingDate = syncItem.options[JD.types[JD.siteTypeCd]].dateScopeTime;
                currentLoginName = syncItem.jdAccount['09'].siteLoginAccount;
                uploadUrl = syncItem.jdAccount['09'].receiveURL;
                downloadList = JSON.parse(localStorage.getItem(currentLoginName + "_wait_to_download_cvm_list") || "{}");
                console.log("还有" + getObjectLength(downloadList) + "份简历需要下载");
                alert(window.location.href);
                if (window.location.href.indexOf('http://qy.chinahr.com/cvm/getCvList?type=1&status=3&tab=4&') > -1) {
                    //简历列表页面工作开始http://qy.chinahr.com/cvm/getCvList/
                    goToLoadResumeList();
                } else if (window.location.href.indexOf('cvm/preview') > -1) {
                    goToLoadResumeInfo();
                }
                else if (window.location.href.indexOf('center/index') > -1) {
                    window.location.href = 'http://qy.chinahr.com/cvm/getCvList/';

                }

                else if (window.location.href.indexOf('http://qy.chinahr.com/cvm/getCvList') > -1) {
                    changeStatusList();
                }

                window.localStorage.setItem(currentLoginName + "_finished_cvm_list", []);
            }, 1500);
        });

        /**
         * 翻页改待筛选中的记录，将符合条件的改成已安排面试
         */
        function changeStatusList() {
            //取到第一页中所有class=cv的元素，遍历其属性 添加到cvm中
            var flag = true;
            var total = $('#listTab1 > span.default.on > em').text();
            if (total == 0 || total == '') {
                flag = false;
            }
            var tempList = $('body > div.container >div.main > div.content > div.right > div.cvlist').find('> div.cv');
            $.each(tempList, function (index, item) {
                var receiveDate = moment(trimHtml($(item).find('> div.til_cv > span.date_til').text().replace('来源手机端', '')), 'YYYY/MM/DD');
                if (receiveDate.isBefore(settingDate)) {
                    console.log("有时间不在范围内的");
                    flag = false;
                    return false;
                } else {
                    var remoteUrl = 'http://qy.chinahr.com/cvm/handle?op=3&unid=' + $(item).attr('data-unid') + '&cvid=' + $(item).attr('data-cvid') + '&jobid=' + $(item).attr('data-jobid') + '&type=1';
                    setTimeout(function () {
                        $.ajax({
                            url: remoteUrl,
                            cache: false,
                            type: 'POST',
                            sync: false,
                            success: function (ses) {
                                var code = ses.code;
                                if (code != 0) {
                                    console.log("模拟请求失败");
                                }
                            },
                            error: function () {
                                console.log("模拟请求失败");
                            }
                        });
                    }, 3000)

                }

            });
            if (flag) {
                goToNextChangePage();
            } else {
                window.location.href = 'http://qy.chinahr.com/cvm/getCvList?type=1&status=3&tab=4&';
            }
        }

        /**
         * 下载简历列表 ‘
         * 记录简历ID 和 简历页的URL 和 申请职位
         */
        function goToLoadResumeList() {
            //遍历所有当天的简历
            //取到第一页中所有class=cv的元素，遍历其属性 添加到cvm中
            var flag = true;

            var tempList = $('body > div.container >div.main > div.content > div.right > div.cvlist').find('> div.cv');
            $.each(tempList, function (index, item) {

                var param = $(item).attr('data-unid');
                if (typeof param == 'undefined' || typeof downloadList[param] != 'undefined') {
                    return true;
                }
                var receiveDate = moment(trimHtml($(item).find('> div.til_cv > span.date_til').text().replace('来源手机端', '')), 'YYYY/MM/DD');
                // 获取到的格式为2016-11-30 12:57
                var sendDate = trimHtml($(item).find('> div.til_cv > span.date_til').text().replace('来源手机端', '')).substring(0, 10);
                var sendTime = sendDate.split("-")[0] + "/" + sendDate.split("-")[1] + "/" + sendDate.split("-")[2];
                //日期区间判断
                if (receiveDate.isBefore(settingDate)) {
                    console.log("有时间不在范围内的");
                    flag = false;
                    return false;
                } else {
                    var url = 'http://qy.chinahr.com/cvm/preview?unid=' + param + '&cvid=' + $(item).attr('data-cvid') + '&jobid=' + $(item).attr('data-jobid') + '&type=1&status=1&tab=1&tab=100';
                    var objJob = trimHtml($(item).find('> div.til_cv > span.pos_til').text());
                    downloadList[param] = url + '*' + sendTime + '||' + objJob;
                }
            });
            saveDownloadData();

            //如果在日期范围内 继续翻页
            if (flag) {
                goToNextPage();
            }
            //超出下载的日期范围则结束翻页 进行下载简历信息
            else {
                goToDownloadData();
            }
        }

        /**
         * 去下载简历
         */
        function goToDownloadData() {
            localStorage.setItem(currentLoginName + "_wait_to_download_cvm_list", JSON.stringify(downloadList));
            //获取第一份简历
            var resume = getFirstResumeFromList();
            //加载简历详细信息的URL
            var url = resume.url;
            //判断简历是否加载完毕
            if (typeof url == 'undefined' || url == null) {
                //都加载完毕了
                console.log("没有简历可加载了,上传简历去鸟");
                goToUploadResumeList();
            } else {
                console.log("加载简历" + resume.param);
                url = resume.url.split('||')[0];
                setTimeout(function () {
                    window.location.href = url;
                }, 3000);

            }
        }

        /**
         * 上传简历
         */
        function goToUploadResumeList() {
            console.log("开始上传简历");
            var waitToUploadResumeList = JSON.parse(localStorage.getItem(currentLoginName + "_wait_to_upload_cvm_list") || "{}");
            var resumes = [];
            $.each(waitToUploadResumeList, function (key, value) {
                resumes.push(value);
            });
            if (getObjectLength(resumes) == 0) {
                alert("没有最新简历可上传");
            }
            var jdAccount = JD.jdAccount.account;
            var uploadData = {
                'resumePackage': JSON.stringify({
                    resumeSiteUid: jdAccount.resumeSiteUid,
                    resumes: resumes
                })
            };
            $.ajax({
                url: jdAccount.receiveURL,
                data: uploadData,
                cache: false,
                type: 'POST',
                success: function () {
                    var finishedResumeList = JSON.parse(localStorage.getItem(currentLoginName + "_finished_cvm_list") || "{}");
                    $.each(resumes, function (index, item) {
                        finishedResumeList[item.resumeId] = {};
                    });
                    var consoleDiv = '<div id="consoleDiv" style="margin-left: 155px;"></div>';
                    $('body').prepend(consoleDiv);

                    log("当前" + currentLoginName + "已经上传  " + getObjectLength(finishedResumeList) + "份简历");
                    window.localStorage.setItem(currentLoginName + "_finished_cvm_list", JSON.stringify(finishedResumeList));
                    log("上传简历结束,欢迎下次刷新光临");
                    localStorage.setItem(currentLoginName + "_wait_to_upload_cvm_list", "{}");
                    log("上传简历完成 " + resumes.length + "  份");
                    var resume = getFirstResumeFromList();
                    var url = resume.url;
                    if (typeof url != 'undefined' && url != null) {
                        console.log("还有未下载的简历 继续下载");
                        goToLoadResumeInfo();
                    }
                    log("有定制简历需要手动下载:" + JSON.stringify(saveCustomResume(null)));
                },
                error: function () {
                    alert("上传失败");
                    log("上传失败:" + JSON.stringify(uploadData));
                    setTimeout(goToUploadResumeList, 10000);
                }
            });
        }

        /**
         * 保存简历信息到本地内存
         * @param param 简历ID
         * @param url 简历访问URL
         */
        function saveCustomResume(param, url) {
            var customResumes = JSON.parse(localStorage.getItem(currentLoginName + "_custom_cvm_list") || "{}");
            if (param != null) {
                customResumes[param] = url;
            }
            localStorage.setItem(currentLoginName + "_custom_cvm_list", JSON.stringify(customResumes));
            return customResumes;
        }

        /**
         * 取得传入对象的长度
         * @param obj 传入的对象
         * @return {*} length 传入的对象的长度
         */
        function getObjectLength(obj) {
            var length = 0;
            $.each(obj, function () {
                length++;
            });
            return length;
        }

        //所学专业
        var resumeMajor = '';
        //上份工作岗位
        var resumePost = '';

        /**
         * 工作经历 抓取方法
         * @returns {Array} 工作经历列表
         */
        function workExperience() {
            //工作经历
            var workExperienceList = [];
            var workExperience = $('.box-myResume > div.main-myResume >div.work-mr >div.inforWork > div.ctInfor');
            $.each(workExperience, function (index, item) {
                //起始年份
                var workDate = $(item).find('> div.boxWork01 > div.conWork > div.jobTime').text();
                workDate = $.trim(workDate);
                var postValue = $('.box-myResume > div.main-myResume >div.work-mr >div.inforWork > div.ctInfor > div.tilEdit > h3').text();
                // 如果是最近的一份工作经历 获取工作岗位 填充到简历信息中的上一份工作岗位中
                if (index == 0) {
                    resumePost = postValue;
                }
                //工作经历数据例：
                //  例1：2011.10
                //  例2：2011.11-至今
                //  例3：2011.11-2014.11
                //  例4：空白
                var startDate = '';
                var endDate = '';
                if (workDate != '' && workDate.length > 7) {
                    if (workDate.indexOf("-") > 0 && workDate.indexOf("至今") > 0) {
                        startDate = $.trim(workDate.split('-')[0].replace(".", "/")) + '/01';
                        endDate = '';
                    } else {
                        startDate = $.trim(workDate.split('-')[0].replace(".", "/")) + '/01';
                        endDate = $.trim(workDate.split('-')[1].replace(".", "/")) + '/01';
                    }
                } else if (workDate.length == 7) {
                    startDate = $.trim(workDate.replace(".", "/")) + '/01';
                    endDate = '';
                }
                //公司信息
                var companyInfo = $(item).find('> div.boxWork01 > div.conWork > div.conCom >p:first > em:first').text();
                //公司行业
                var Industry = $(item).find('> div.boxWork01 > div.conWork > div.conCom >p:nth-child(2)').text();
                //部门
                var department = $(item).find('> div.boxWork01 > div.conWork > div.conCom >p:nth-child(3)').text();
                //工作内容
                var jobContent = $(item).find('> div.boxWork01 > div.conWork > div.conJob').text();

                //工作信息
                var work = {
                    //开始时间
                    startDate: $.trim(startDate),
                    //结束时间
                    endDate: $.trim(endDate),
                    //工作单位
                    workUnit: companyInfo,
                    //工作内容
                    jobContent: jobContent,
                    //公司行业
                    companyIndustryName: Industry,
                    //工作岗位
                    position: postValue,
                    //工作部门
                    department: department
                };
                workExperienceList.push(work);
            });
            return workExperienceList;
        }

        /**
         * 教育经历 抓取方法
         * @returns {Array} 教育经历列表
         */
        function educationExperience() {
            //教育经历
            var educationExperienceList = [];
            var educationExperience = $('.box-myResume > div.main-myResume >div.edu-mr >div.inforWork >div.ctInfor ');
            $.each(educationExperience, function (index, item) {
                var studyDate = $(item).find('.boxWork01 > div.conWork > div.jobTime').text();
                studyDate = $.trim(studyDate);

                //教育经历数据例：
                //  例1：2011.10
                //  例2：2011.11-至今
                //  例3：2011.11-2014.11
                //  例4：空白
                var startDate = '';
                var endDate = '';
                //学校
                var fromSchool = $(item).find('.tilEdit > h3').text();
                // 如果是最近的一份教育经历 获取所学专业 填充到简历信息中的所学专业中
                if (index == 0) {
                    resumeMajor = $(item).find('.boxWork01 > div.conWork > div.conCom > p > em:nth-child(2)').text();
                }
                var specialize = $(item).find('.boxWork01 > div.conWork > div.conCom > p > em:nth-child(2)').text();
                if (studyDate != '' && studyDate.length > 7) {
                    if (studyDate.indexOf("-") > 0 && studyDate.indexOf("至今") > 0) {
                        startDate = $.trim(studyDate.split('-')[0].replace(".", "/")) + '/01';
                        endDate = '';

                    } else {
                        startDate = $.trim(studyDate.split('-')[0].replace(".", "/")) + '/01';
                        endDate = $.trim(studyDate.split('-')[1].replace(".", "/")) + '/01';
                    }
                } else if (studyDate.length == 7) {
                    startDate = $.trim(studyDate.split('-')[0].replace(".", "/")) + '/01';
                    endDate = '';
                }
                //教育信息
                var education = {
                    //学校
                    school: trimHtml(fromSchool),
                    //开始时间
                    startDate: $.trim(startDate),
                    //结束时间
                    endDate: $.trim(endDate),
                    //专业
                    major: specialize
                };
                educationExperienceList.push(education);
            });
            return educationExperienceList;
        }


        /**
         * 加载简历详细
         */
        function goToLoadResumeInfo() {
            //完整格式 http://qy.chinahr.com/cvm/preview?unid=20857356693121&cvid=57d6bf94e4b0c59439c33b62&jobid=19693395655808&type=1&status=3&tab=103*2016/11/30
            //获取当前URL上的参数信息
            var allParams = window.location.href.split('?')[1].split('*');
            //
            var params = allParams[0].split('&');
            //服务器错误 刷新
            if (document.title.indexOf('Error') > -1 || document.title.indexOf('错误') > -1) {
                window.location.reload();
                return;
            }

            var param = params[0].split("=")[1];
            if (param == "") {
                console.warn("今天无法查看:");
                goToDownloadData();
            }
            //工作经历
            var workExperienceList = workExperience();
            //教育经历
            var educationExperienceList = educationExperience();
            var waitDownloadList = JSON.parse(localStorage.getItem(currentLoginName + "_wait_to_download_cvm_list") || "{}");

            var objJob = waitDownloadList[param].split('||')[1];

            var resume = $('.box-myResume').find(' > div.main-myResume');
            var $intent = resume.find(' > div.inten-mr > div.inforInten');
            //期望工作
            var objectiveJob = $intent.find(':contains("期望工作") > div.rtInInten01').text().replace('\n\t\t\t\t\t\t\t', '');
            //期望行业
            var jobProfession = $intent.find(':contains("期望行业") > div.rtInInten01').text().replace('\n\t\t\t\t\t\t\t', '');
            //求职性质
            var jobType = $intent.find(':contains("求职性质") > div.rtInInten01').text().replace('\n\t\t\t\t\t\t\t', '');
            //期望地点
            var jobPlace = $intent.find(':contains("期望地点") > div.rtInInten01').text().replace('\n\t\t\t\t\t\t\t', '');
            //期望薪水
            var jobSalary = $intent.find(':contains("期望薪水") > div.rtInInten01').text().replace('\n\t\t\t\t\t\t\t', '');

            var height = $.trim(resume.find(' > div.base-mr > div.inforBase  > div.lfInBase > ul li:eq(0) > div.conInBase >p:last ').text());
            var married = '';
            if (height.indexOf("婚") > 0 || height.indexOf("身") > 0) {
                married = $.trim(resume.find(' > div.base-mr > div.inforBase  > div.lfInBase > ul li:eq(0) > div.conInBase >p:last >em:last').text());
            }
            var email = resume.find(' > div.base-mr > div.inforBase  > div.rtInBase > ul li:eq(2) > div.conInBase >p >em:first').text();
            if (email.indexOf("@") < 0) {
                email = '';
            }

            //工作经验
            var work = $.trim(resume.find(' > div.base-mr > div.inforBase  > div.lfInBase > ul li:eq(1) > div.conInBase >p:first >em:last').text());
            if (work === '') {
                work = 0;
            } else if (work.indexOf("以下工作经验") > 0) {
                work = 1;
            } else if (work.indexOf("工作经验") > 0 && work.indexOf("一年以下工作经验") < 0) {
                work = work.replace('年工作经验', '');
            }

            var info = {
                //用户ID
                resumeId: param,
                //用户名称
                name: $.trim(resume.find('> div.name-mr > div.pro-name > div.wz-name >h3 ').text()),
                //性别
                sexName: $.trim(resume.find(' > div.base-mr > div.inforBase  > div.lfInBase > ul li:eq(0) > div.conInBase >p:first >em:first ').text()),
                //年龄
                age: parseInt($.trim(resume.find(' > div.base-mr > div.inforBase  > div.lfInBase > ul li:eq(0) > div.conInBase >p:first >em:nth-child(2)').text()).replace('岁', '')),
                //婚姻状况
                marriedName: married,
                //学历
                educationName: $.trim(resume.find(' > div.base-mr > div.inforBase  > div.lfInBase > ul li:eq(1) > div.conInBase >p >em:first').text()),
                //工作年限
                workName: work,
                //居住地址
                contactAddress: $.trim(resume.find(' > div.base-mr > div.inforBase  > div.rtInBase > ul li:eq(0) > div.conInBase >p:first').text()).replace('目前居住地：', ''),
                //户籍
                registerAddress: $.trim(resume.find(' > div.base-mr > div.inforBase  > div.rtInBase > ul li:eq(0) > div.conInBase >p:last').text()).replace('户口所在地：', ''),
                //手机号码
                mobile: $.trim(resume.find(' > div.base-mr > div.inforBase  > div.rtInBase > ul li:eq(1) > div.conInBase >p >em:first').text().replace('如空号/错号请点击', '')),
                //邮箱
                email: $.trim(email),
                //其他联系方式
                otherPhone: '',
                //投递时间
                sendTime: $.trim(allParams[1]),
                //申请职位
                applyPosition: objJob,
                //自我评价
                introduction: $.trim(resume.find('> div.evalue-mr > div.inforEvalue ').text()),
                //教育经历
                educationExperienceList: educationExperienceList,
                //工作经历
                workExperienceList: workExperienceList,
                //期望职位
                objectiveJob: objectiveJob,
                //期望行业
                jobIndustry: jobProfession,
                //求职性质
                jobTypeName: jobType,
                //期望工作地点
                jobPlace: jobPlace,
                //期望薪水
                expectSalaryName: jobSalary,
                //专业
                major: resumeMajor,
                //上份工作岗位
                previewPost: resumePost,
                //语言技能
                personSkill: $.trim(resume.find('> div.lang-mr > div.inforLang > ul ').text())
            };
            saveResumeInfo(param, info);
            goToDownloadData();
        }

        /**
         * 保存简历信息 然后去下一份简历
         * @param param 简历ID
         * @param resumeInfo 简历信息
         *
         */
        function saveResumeInfo(param, resumeInfo) {
            var waitToUploadResumeList = JSON.parse(localStorage.getItem(currentLoginName + "_wait_to_upload_cvm_list") || "{}");
            console.log(JSON.stringify(waitToUploadResumeList));
            var waitToDownloadResumeList = JSON.parse(localStorage.getItem(currentLoginName + "_wait_to_download_cvm_list") || "{}");
            console.log(JSON.stringify(waitToDownloadResumeList));
            waitToUploadResumeList[param] = resumeInfo;

            delete waitToDownloadResumeList[param];
            delete downloadList[param];
            localStorage.setItem(currentLoginName + "_wait_to_upload_cvm_list", JSON.stringify(waitToUploadResumeList));
            localStorage.setItem(currentLoginName + "_wait_to_download_cvm_list", JSON.stringify(waitToDownloadResumeList));
            if (getObjectLength(waitToUploadResumeList) > 100) {
                goToUploadResumeList();
            }
        }

        /**
         * 保存已经加载的简历
         */
        function saveDownloadData() {
            localStorage.setItem(currentLoginName + "_wait_to_download_cvm_list", JSON.stringify(downloadList));
        }

        /**
         * 去空格 去html空格
         * @param str 待处理字符串
         * @returns {*}  str 处理后的字符串
         */
        function trimHtml(str) {
            if (typeof str != 'undefined' && str != null) {
                return $.trim(str.replace("&nbsp;", ''));
            } else {
                return '';
            }
        }


        /**
         * print日志上传日志
         * @param msg 要打印的信息
         */
        function log(msg) {
            $('#consoleDiv').append("<h1 style='color: green;align-content: center'>" + msg + "</h1>");
            $('#consoleDiv').append("<br>");
        }

        /**
         * 取得首个待加载简历
         * @returns {{jwsn: *, url: *}} 简历相关信息
         */
        function getFirstResumeFromList() {
            var waitDownloadResumeList = JSON.parse(localStorage.getItem(currentLoginName + "_wait_to_download_cvm_list") || "{}");
            var resumeUrl = null;
            var param = null;
            $.each(waitDownloadResumeList, function (key, value) {
                param = key;
                resumeUrl = value;
                return resumeUrl === ',';
            });
            return {param: param, url: resumeUrl}
        }

        /**
         * 翻页方法 、
         * 翻页规则 直至页面上的投递日期不在设定的日期范围内结束
         */
        function goToNextPage() {
            var nextEle = $('body  > div.container > div.main > div.content > div.right > div.pageList> a:contains("下一页")');
            if (nextEle.length == 0) {
                console.log("已经到最后一页,翻页完毕,开始加载简历。");
                goToDownloadData();
            }
            var nextPageBtn = $('<span>&nbsp;</span>');
            nextEle.append(nextPageBtn);
            nextPageBtn.trigger('click');
            var pageInterval = setInterval(function () {
                if (nextEle.length > 0) {
                    clearInterval(pageInterval);
                    setTimeout(goToLoadResumeList, 3000);
                }
            }, 4000);
        }

        /**
         * 待安排-->已安排面试 翻页方法
         * 目的:为提高网站反馈率
         */
        function goToNextChangePage() {
            var nextEle = $('body  > div.container > div.main > div.content > div.right > div.pageList > a:contains("下一页")');
            if (nextEle.length == 0) {
                console.log("已经到最后一页,翻页完毕,开始加载简历。");
                goToDownloadData();
            }
            var nextPageBtn = $('<span>&nbsp;</span>');
            nextEle.append(nextPageBtn);
            nextPageBtn.trigger('click');
            var pageInterval = setInterval(function () {
                if (nextEle.length > 0) {
                    clearInterval(pageInterval);
                    setTimeout(changeStatusList, 3000);
                }
            }, 4000);
        }
    }(jQuery, moment, JdUtils)
);