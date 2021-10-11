(function ($, moment, _jd) {
        'use strict';
        var JD = new _jd('0757rc');
        var settingDate;
        var currentLoginName;
        var downloadList;
        var uploadUrl;
        window.alert = function (str) {
            if (str.indexOf('简历已被球求职者删除') > -1) {
                var params = window.location.href.split('?')[1].split('&');
                //服务器错误 刷新
                if (document.title.indexOf('Error') > -1 || document.title.indexOf('错误') > -1) {
                    window.location.reload();
                    return;
                }
                var resumeId = params[0].split("=")[1];
                delete  downloadList[resumeId];
                goToDownloadData()
            }
        };
        //登录方法
        function login() {
            if (JD.jdAccount.isLogin() || $('#ctl00_header1_entislogin').find('> div > div.entloginimages.entloginkuan > a.exit').length >= 1) {
                JD.jdAccount.login();
            } else {
                if (!JD.jdAccount.isLogin()) {
                    var options = {};
                    options.login = function (jdAccount) {
                        $('#ctl00_ContentPlaceHolder1_txtLoginID').val(jdAccount.siteLoginAccount);
                        $('#ctl00_ContentPlaceHolder1_txtLoginPwd').val(jdAccount.siteLoginPassword);
                    };
                    options.loginURL = 'http://www.0757rc.com/login/entlogin.aspx';
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
            login();
            settingDate = syncItem.options[JD.types[JD.siteTypeCd]].dateScopeTime;
            currentLoginName = syncItem.jdAccount['07'].siteLoginAccount;
            uploadUrl = syncItem.jdAccount['07'].receiveURL;
            downloadList = JSON.parse(localStorage.getItem(currentLoginName + "_wait_to_download_resume_list") || "{}");
            console.log("还有" + getObjectLength(downloadList) + "份简历需要下载");
            if (window.location.href.match(/.*.ent\/recresume\.aspx*/)) {
                //简历列表页面工作开始
                goToLoadResumeList();
            } else if (window.location.href.match(/.*.ent\/showresume\.aspx*/)) {
                goToLoadResumeInfo();
            } else if (window.location.href.match(/.*.Ent\/manage\.aspx/) ||
                window.location.href.match(/.*.ent\/manage\.aspx/)) {
                window.location.href = 'http://www.0757rc.com/ent/recresume.aspx';
            } else if (window.location.href.match(/.*.ResTemp\/.*.\/index\.aspx.*./)) {
                //http://www.0757rc.com/ResTemp/xina/index.aspx?jwsn=5279081
                //过滤自定义简历页面
                console.warn("自定义页面 请手动记录");
                var resumeInfo = window.location.href.split("=");
                saveCustomResume(resumeInfo[1], window.location.href);
                delete  downloadList[resumeInfo[1]];
                goToDownloadData();
            }
        });

        /**
         * 保存简历信息到本地内存
         * @param resumeId 简历ID
         * @param url 简历页加载的URL
         */
        function saveCustomResume(resumeId, url) {
            var customResumes = JSON.parse(localStorage.getItem(currentLoginName + "_custom_resume_list") || "{}");
            if (resumeId != null) {
                customResumes[resumeId] = url;
            }
            localStorage.setItem(currentLoginName + "_custom_resume_list", JSON.stringify(customResumes));
            return customResumes;
        }

        /**
         * 取得传入对象的长度
         * @param obj 传入的对象
         */
        function getObjectLength(obj) {
            var length = 0;
            $.each(obj, function () {
                length++;
            });
            return length;
        }

        /**
         * 加载简历详细
         */
        function goToLoadResumeInfo() {
            var params = window.location.href.split('?')[1].split('&');
            //服务器错误 刷新
            if (document.title.indexOf('Error') > -1 || document.title.indexOf('错误') > -1) {
                window.location.reload();
                return;
            }
            var resumeId = params[0].split("=")[1];
            //注：网页上手机号码DOMID实际命名为[moblie]，但需要兼容将来正确的DOMID[mobile]
            if ($.trim($('#moblie').text()) == "" && $.trim($('#mobile').text()) == "") {
                console.warn("今天无法查看:" + resumeId);
                goToDownloadData();
            }
            var applyPosition = $('#aspnetForm > div.ResumeBox > div.Left.l > div:nth-child(1) > div:nth-child(3) > span:nth-child(2)').text();
            //专业
            var major = '';
            //简历信息
            var resume = $('#aspnetForm').find('> div.ResumeBox > div.Left.l');
            //工作经历
            var workExperience = $(resume).find('> div:nth-child(11)').text();
            var workExperienceList = [];
            var workExperiences = {
                id: resumeId,
                jobContent: $.trim(workExperience)
            };
            workExperienceList.push(workExperiences);
            //教育经历
            //例：2014年07月毕业
            var education = $(resume).find('> div:nth-child(7)').html();
            var educationList = [];
            var educationExperience = education.split('<br>');
            $.each(educationExperience, function (index, item) {
                try {
                    var dateSchool = item.split('毕业');
                    var endDate = dateSchool[0];
                    var endYear = endDate.split('年')[0];
                    var endMonth = endDate.split('年')[1].replace("月", "");
                    var school = dateSchool[1].split('&nbsp;&nbsp;')[0];
                    var educationName = dateSchool[1].split('&nbsp;&nbsp;')[1];
                    var major = dateSchool[1].split('&nbsp;&nbsp;')[2];
                    var education = {
                        id: resumeId,
                        startDate: "",
                        endDate: trimHtml(endYear) + '/' + trimHtml(endMonth) + "/01",
                        school: trimHtml(school),
                        educationName: trimHtml(educationName),
                        major: trimHtml(major)
                    };
                    educationList.push(education)
                } catch (e) {
                    console.warn(e)
                }
            });
            //求职意向
            var $intent = resume.find(' > div.JwWant');
            //投递时间
            var sendTime = $.trim($('#aspnetForm > div.ResumeBox > div.Right.l > div > div.LastLogin').text().replace("[ 最近登录时间：", '').replace(']', ''));
            var info = {
                resumeId: resumeId,
                //姓名
                name: $.trim(resume.find('> div.JwInfo > div:nth-child(1) > div.Content.l').text().replace("马上交谈", '')),
                //性别
                sexName: $.trim(resume.find(' > div.JwInfo > div:nth-child(2) > div.Content.l').text()),
                //年龄
                age: parseInt($.trim(resume.find(' > div.JwInfo > div:nth-child(4) > div.Content.l').text()).replace('岁', '')),
                //工作年限
                workName: $.trim(resume.find(' > div.JwInfo > div:nth-child(10) > div.Content.l').text()),
                //地区
                regionName: $.trim(resume.find(' > div.JwInfo > div:nth-child(8) > div.Content.l').text()),
                //手机号码
                mobile: $.trim($('#moblie').text()),
                //婚否
                marriedName: $.trim(resume.find(' > div.JwInfo > div:nth-child(11) > div.Content.l').text()),
                //学历
                educationName: $.trim(resume.find(' > div.JwInfo > div:nth-child(16) > div.Content.l').text()),
                //联系地址
                contactAddress: $.trim($('#address').text()),
                //自我介绍
                introduction: $.trim(resume.find('> div:nth-child(13)').text()),
                //教育经历
                educationList: educationList,
                //工作经历
                workExperienceList: workExperienceList,
                //工作地点
                jobPlace: $intent.find('> div:nth-child(4) > p.target-term-industry').text().split(';')[1],
                //期望行业
                jobIndustry: $intent.find('> div:nth-child(2) > p.target-term-industry').text().split(';')[1],
                //期望岗位
                objectiveJob: $intent.find('>> div:nth-child(3) > p.target-term-industry').text().split(';')[1],
                //期望薪水
                expectSalaryName: $intent.find('> div:nth-child(5) > p:nth-child(4)').text(),
                //专业
                major: major,
                //应聘岗位
                applyPosition: applyPosition,
                //大佛山投递日期 获取
                sendTime: moment(sendTime, "YYYY-MM-DD").format("YYYY/MM/DD")
            };

            //TODO教育经历
            var $education = resume.find('> div:nth-child(7)').html();
            info.educationList = getEducationExperienceList($education, resumeId);
            var $workInfo = resume.find('> div:nth-child(11)').text();
            info.educationList = getWorkExperienceList($workInfo, resumeId);
            saveResumeInfo(resumeId, info);
            goToDownloadData();
        }

        /**
         * 保存简历id和URL 然后去下一份简历
         * @param resumeId 简历ID
         * @param resumeInfo 简历信息
         */
        function saveResumeInfo(resumeId, resumeInfo) {
            var waitToUploadResumeList = JSON.parse(localStorage.getItem(currentLoginName + "_wait_to_upload_resume_list") || "{}");
            var waitToDownloadResumeList = JSON.parse(localStorage.getItem(currentLoginName + "_wait_to_download_resume_list") || "{}");
            waitToUploadResumeList[resumeId] = resumeInfo;
            delete waitToDownloadResumeList[resumeId];
            delete downloadList[resumeId];
            localStorage.setItem(currentLoginName + "_wait_to_upload_resume_list", JSON.stringify(waitToUploadResumeList));
            localStorage.setItem(currentLoginName + "_wait_to_download_resume_list", JSON.stringify(waitToDownloadResumeList));
            if (getObjectLength(waitToUploadResumeList) > 10) {
                goToUploadResumeList();
            }
        }

        /**
         * 保存已经加载的简历
         */
        function saveDownloadData() {
            localStorage.setItem(currentLoginName + "_wait_to_download_resume_list", JSON.stringify(downloadList));
        }

        /**
         * 去空格 去html空格
         * @param str 传入的字符串
         * @returns str 处理后的字符串
         */
        function trimHtml(str) {
            if (typeof str != 'undefined' && str != null) {
                return $.trim(str.replace("&nbsp;", ''));
            } else {
                return '';
            }
        }

        /**
         * 解析工作经历
         *  @param workInfo 工作经历列表
         * @param resumeId 简历ID
         */
        function getWorkExperienceList(workInfo, resumeId) {
            var workExperienceList = [];
            var workExperience = {
                id: resumeId,
                jobContent: $.trim(workInfo)
            };
            workExperienceList.push(workExperience);
            return workExperienceList;
        }

        /**
         * 时间转换
         */

        function formatDate(dateString) {
            if (dateString.length() < 7) {
                return null;
            } else {
                return dateString + "/01";
            }
        }

        /**
         * 解析教育经历
         * @param educationEle 教育信息列表
         * @param resumeId 简历ID
         */
        function getEducationExperienceList(educationEle, resumeId) {
            var educationExperienceList = [];
            var educationExperience = educationEle.split('<br>');
            $.each(educationExperience, function (index, item) {
                try {
                    //例：2010/10-2014/07，学校名称
                    var dateSchool = item.replaceAll('，', ',').split(',');

                    var startDate = dateSchool[0].split('-')[0];
                    var endDate = dateSchool[0].split('-')[1];
                    var education = {
                        id: resumeId,
                        startDate: formatDate(startDate),
                        endDate: formatDate(endDate),
                        school: trimHtml(dateSchool[1])
                    };
                    educationExperienceList.push(education)
                } catch (e) {
                    console.warn(e)
                }
                return educationExperienceList;
            });
        }

        /**
         * 取得待下载的简历列表
         */
        function goToLoadResumeList() {
            //修改每页显示最大条数  每页100条
            var myPageSize = $('#ctl00_ContentPlaceHolder1_mypagesize');
            if (myPageSize.val() < 100) {
                console.log("修改每页显示100条");
                myPageSize.val(100);
            }
            var endFlg = false;
            //记录简历id 和 url
            var resumeList = $('#ctl00_ContentPlaceHolder1_UpdatePanel1').find('> div.innerbodywrapper > table > tbody > tr');
            console.log("开始加载列表:条目" + resumeList.length);
            $.each(resumeList, function (index, item) {
                var jwsn = $(item).attr("jwsn");
                //过滤非简历数据和重复简历
                if (typeof jwsn == 'undefined' || typeof downloadList[jwsn] != 'undefined') {
                    //continue
                    return true;
                }
                $('#ctl00_ContentPlaceHolder1_UpdatePanel1').find('> div.innerbodywrapper > table > tbody > tr')
                //接收时间
                var receiveDate = moment($(item).find("> td:nth-child(5)").text(), 'YYYY/MM/DD');
                //是否查阅
                var viewed = trimHtml($(item).find('> td:nth-child(6)').text()) != '未查阅';
                //有已查阅的并且时间不在范围内的 就结束页加载
                if (viewed && receiveDate.isBefore(settingDate)) {
                    //break
                    console.log("有已查阅的并且时间不在范围内的");
                    endFlg = true;
                    return false;
                }
                //简历url
                var urlEle = $(item).find("> td:nth-child(2) > a");
                var url = $(urlEle).attr("href");
                if (typeof url != 'undefined') {
                    downloadList[jwsn] = url;
                }
            });
            if (!endFlg) {
                goToNextPage();
            } else {
                saveDownloadData();
                goToDownloadData();
            }

        }

        /**
         * 去下载简历
         */
        function goToDownloadData() {
            localStorage.setItem(currentLoginName + "_wait_to_download_resume_list", JSON.stringify(downloadList));

            var resume = getFirstResumeFromList();
            var url = resume.url;
            if (typeof url == 'undefined' || url == null) {
                console.log("没有简历可加载了,开始上传简历。");
                goToUploadResumeList();
            } else {
                console.log("加载简历" + resume.jwsn);
                setTimeout(function () {
                    window.location.href = "http://www.0757rc.com/ent/" + url;
                }, 3000);
            }
        }

        /**
         * 上传简历
         */
        function goToUploadResumeList() {
            console.log("开始上传简历");
            var waitToUploadResumeList = JSON.parse(localStorage.getItem(currentLoginName + "_wait_to_upload_resume_list") || "{}");
            var resumes = [];
            $.each(waitToUploadResumeList, function (key, value) {
                resumes.push(value);
            });
            if (resumes.length == 0) {
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
                    var finishedResumeList = JSON.parse(localStorage.getItem(currentLoginName + "_finished_resume_list") || "{}");
                    $.each(resumes, function (index, item) {
                        finishedResumeList[item.resumeId] = item.mobile;
                    });
                    var consoleDiv = '<div id="consoleDiv"></div>';
                    $('body').prepend(consoleDiv);
                    log("当前" + currentLoginName + "已经上传  " + getObjectLength(finishedResumeList) + "份简历");
                    window.localStorage.setItem(currentLoginName + "_finished_resume_list", JSON.stringify(finishedResumeList));
                    localStorage.setItem(currentLoginName + "_wait_to_upload_resume_list", "{}");
                    log("上传简历完成 " + resumes.length + "  份。");
                    var resume = getFirstResumeFromList();
                    var url = resume.url;
                    if (typeof url != 'undefined' && url != null) {
                        console.log("还有未下载的简历 继续下载");
                        goToLoadResumeInfo();
                    }
                    log("有定制简历需要手动下载:" + JSON.stringify(saveCustomResume(null)));
                },
                error: function () {
                    log("上传失败:" + JSON.stringify(uploadData));
                    setTimeout(goToUploadResumeList, 10000);
                }
            });
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
         * @returns {{jwsn: *, url: *}}
         */
        function getFirstResumeFromList() {
            var waitDownloadResumeList = JSON.parse(localStorage.getItem(currentLoginName + "_wait_to_download_resume_list") || "{}");
            var resumeUrl = null;
            var jwsn = null;
            $.each(waitDownloadResumeList, function (key, value) {
                jwsn = key;
                resumeUrl = value;
                //break
                return false;
            });
            return {jwsn: jwsn, url: resumeUrl}
        }

        /**
         * 翻页方法
         */
        function goToNextPage() {
            var nextEle = $('#ctl00_ContentPlaceHolder1_AspNetPager1 > a:contains(后页)');
            if ($(nextEle).attr('disabled') == 'disabled') {
                console.log("已经到最后一页,翻页完毕,开始加载简历。");
                goToDownloadData();
            }
            var nextPageBtn = $('<span>&nbsp;</span>');
            nextEle.append(nextPageBtn);
            nextPageBtn.trigger('click');
            var pageInterval = setInterval(function () {
                if ($('#ctl00_ContentPlaceHolder1_AspNetPager1 > a:contains(后页)').attr("href") !== nextEle.attr('href')) {
                    clearInterval(pageInterval);
                    goToLoadResumeList();
                }
            }, 2000);
        }
    }(jQuery, moment, JdUtils)
);