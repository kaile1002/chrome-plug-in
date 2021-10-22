(function ($, _, moment, _jd) {
        'use strict';
        var JD = new _jd('wanzhou');
        var settingDate;
        chrome.storage.sync.get(null, function (syncItem) {
            //获取到登录页面设置的时间段
            settingDate = syncItem.options[JD.types[JD.siteTypeCd]].dateScopeTime;
            var regexpLoginUrl = /.*.\/Company\/CompanyLogin\.aspx/;
            var resumeListUrl = 'http://www.wanzhoujob.com/Company/Resuming/ResumingManage.aspx?pager=';
            var regexpResumeListUrl = /.*.\/Company\/Resuming\/ResumingManage\.aspx*/;
            var regexpResumeInfoUrl = /.*.\/jianli\/\w{16}\.html/;

            var path_username = '#username';
            var path_password = '#password';
            var path_login_button = '#loginform > div.c-login-submit > input';
            var path_logout = '#A2';

            var path_resume_list = '#r-list > ul';
            var path_page = '#__pageSelect';
            //当前页码
            var path_current_page = '#__pageSelect > a.cu';
            //简历唯一标识
            var path_resume_id = '#resume > div.content > div > div.resume-info.clearfix > span.resume-id > p:nth-child(1)';
            if (syncItem.options === undefined) {
                return;
            }
            if (syncItem.options["06"].status === '2') {
                console.log("万州脚本未启动");
                return;
            }
            //简历同步方法
            var syncWanzhou = function () {
                var wanzhou_resumes = JSON.parse(window.localStorage.getItem("wanzhou_resumes"));
                var resumes = [];
                for (var resumeNo in wanzhou_resumes) {
                    resumes.push(wanzhou_resumes[resumeNo]);
                }
                if (syncItem.jdAccount === undefined) {
                    alert("未使用插件账号登陆");
                }
                $.ajax({
                    url: syncItem.jdAccount['06'].receiveURL,
                    data: {
                        'resumePackage': JSON.stringify({
                            resumeSiteUid: syncItem.jdAccount['06'].resumeSiteUid,
                            resumes: resumes
                        })
                    },
                    cache: false,
                    type: 'POST',
                    success: function () {
                        syncItem.options['06'].status = '2';
                        window.localStorage.clear("wanzhou_resumes");
                        alert("所以数据已经上传");
                    }
                });
            };
            //获取简历的投递时间
            var getResumeSendDate = function (nextItem) {
                return $(path_resume_list).find('> li:nth-child(' + nextItem + ') > div.c-resume-main > div.c-resume-title.clearfix > span.c-resume-time').text();
            };
            //简历投递时间转换方法
            var covertTime = function (timeText) {
                var dateNow = new Date();
                var time = null;
                if (timeText.match(/昨天/) != null) {
                    time = dateNow.getFullYear() + '/' + (dateNow.getMonth() + 1) + '/' + (dateNow.getDate() - 1);
                } else if (timeText.match(/天前/) != null) {
                    time = dateNow.getFullYear() + '/' + (dateNow.getMonth() + 1) + '/' + (dateNow.getDate() - timeText.match(/\d/));
                } else if (timeText.match(/小时前/) != null) {
                    time = dateNow.getFullYear() + '/' + (dateNow.getMonth() + 1) + '/' + dateNow.getDate();
                } else if (timeText.match(/分钟前/) !== null) {
                    time = dateNow.getFullYear() + '/' + (dateNow.getMonth() + 1) + '/' + dateNow.getDate();
                } else if (timeText.match(/秒前/) !== null) {
                    time = dateNow.getFullYear() + '/' + (dateNow.getMonth() + 1) + '/' + dateNow.getDate();
                } else if (timeText.match(/\d{4}-\d{2}-\d{2}/) != null) {
                    var s = timeText.split("-");
                    time = new Date(s[0], s[1] - 1, s[2])
                } else {
                    console.warn("无法识别的日期:" + timeText);
                }
                return time;
            };
            //判断简历投递时间是否在设定的时间范围内
            // 是 true
            var checkResumeTime = function (time) {
                var result = true;
                var checkTime = moment(time);

                if (checkTime.isBefore(settingDate)) {
                    result = false;
                }
                return result;
            };
            //模拟登录
            if (window.location.href.match(regexpLoginUrl)) {
                if (!$(path_logout).text()) {
                    $(path_username).val(syncItem.jdAccount['06'].siteLoginAccount);
                    $(path_password).val(syncItem.jdAccount['06'].siteLoginPassword);
                    setTimeout($(path_login_button).trigger('click'), 3000);
                } else {
                    setTimeout(window.location.href = resumeListUrl, 3000);
                }
            } else if (window.location.href.match(regexpResumeListUrl)) {
                //简历管理页面 进行简历抓取
                //处理规则：逐页进行逐条抓取，直至不满足设定的条件
                var $page = $(path_page);
                var maxItemCount = $(path_resume_list).children().length;
                //最大页码
                var maxPageNo = parseInt($($page.children()[$page.children().length - 1]).text());
                //当前页
                var currentPageNo = parseInt($(path_current_page).text());
                var prevItem = window.localStorage.getItem("wanzhou_prev_item");

                console.info("进入简历管理页面:");
                console.info("当前页码:" + currentPageNo + "  最大页码:" + maxPageNo);
                console.info("当前页共有" + maxItemCount + "份简历");
                var nextItem;
                nextItem = prevItem == null ? 1 : parseInt(prevItem) + 1;
                var nextPageNo = currentPageNo + 1;
                // nextItem 当前条数目
                // maxItemCount 当前页的最大条数目
                if (nextItem > maxItemCount) {
                    if (nextPageNo <= maxPageNo) {
                        window.localStorage.removeItem("wanzhou_prev_item");
                        console.info("当前页简历已经获取完毕,进入下一页");
                        setTimeout(function () {
                            window.location.href = resumeListUrl + nextPageNo
                        }, 3000);
                    } else {
                        console.info("已到尾页,任务结束");
                        console.info("save resumes:" + window.localStorage.getItem("wanzhou_resumes"));
                        syncWanzhou();
                    }
                } else {
                    while (nextItem <= maxItemCount) {
                        try {
                            var resumeTime = moment(covertTime(getResumeSendDate(nextItem)));
                            if (!checkResumeTime(resumeTime)) {
                                console.info("当前页(" + currentPageNo + ")的简历(" + nextItem + ")不符合日期筛选条件");

                                syncWanzhou();
                                return;

                            } else {
                                break;
                            }
                            nextItem = nextItem + 1;
                        } catch (e) {
                            var params = {
                                "module": "万州人才网",
                                "content": e
                            };
                            JD.logToCenter(params);
                            console.log(e);
                        }
                    }
                    window.localStorage.setItem("wanzhou_prev_page", currentPageNo);
                    if (nextItem <= maxItemCount) {
                        setTimeout(function () {
                            var $item = $(path_resume_list).find('> li:nth-child(' + nextItem + ') > div.c-resume-main > div.c-resume-title.clearfix > span.c-resume-name > a')[0];
                            console.info("准备获取简历:" + nextItem);
                            console.info("简历URL:" + $item.href);
                            window.localStorage.setItem("wanzhou_prev_item", nextItem);
                            window.location.href = $item.href
                        }, 3000);
                    } else {
                        setTimeout(function () {
                            window.localStorage.setItem("wanzhou_prev_item", 0);
                            pageNo = window.localStorage.getItem("wanzhou_prev_page");
                            if (nextPageNo <= maxPageNo) {
                                window.localStorage.removeItem("wanzhou_prev_item");
                                console.info("当前页简历已经获取完毕,进入下一页");
                                console.log("本页(page:" + pageNo + ")所有简历不符合日期筛选条件,直接进入下一页");
                                setTimeout(function () {
                                    window.document.location.href = "http://www.wanzhoujob.com/Company/Resuming/ResumingManage.aspx?pager=" + (parseInt(pageNo) + 1);
                                }, 3000);
                            } else {
                                console.info("已到尾页,任务结束");
                                console.info("save resumes:" + window.localStorage.getItem("wanzhou_resumes"));
                                syncWanzhou();
                            }
                        }, 3000);
                    }
                }
            } else if (window.location.href.match(regexpResumeInfoUrl)) {
                //简历信息页面 抓取简历的信息
                var pageNo = window.localStorage.getItem("wanzhou_prev_page");
                if (pageNo != null) {
                    //简历信息页面
                    console.info("进入简历信息页面:" + window.location.href);
                    var resume = $('#resume');
                    var linkInfo = $('#LinkInfo');
                    //简历ID
                    var resumeId = $(path_resume_id).text().split("：")[1];
                    //求职意向
                    var $intent = resume.find('> div.content > div > div.resume-main > div.target');
                    var info = {
                        //简历ID
                        resumeId: resumeId,
                        //姓名
                        name: $.trim(resume.find('> div.content > div > div.resume-main > div.infomation.clearfix > div:nth-child(2) > p:nth-child(2)').text()),
                        //性别
                        sexName: resume.find('> div.content > div > div.resume-main > div.infomation.clearfix > div:nth-child(2) > p:nth-child(4)').text(),
                        //年龄
                        age: parseInt(resume.find('> div.content > div > div.resume-main > div.infomation.clearfix > div:nth-child(2) > p:nth-child(6)').text().replace('岁', '')),
                        //工作年限
                        workName: resume.find('> div.content > div > div.resume-main > div.infomation.clearfix > div:nth-child(4) > p:nth-child(6)').text(),
                        //区域名称
                        regionName: resume.find('> div.content > div > div.resume-main > div.infomation.clearfix > div:nth-child(4) > p:nth-child(2)').text(),
                        //手机号码
                        mobile: linkInfo.find('> table > tbody > tr:nth-child(2) > td:nth-child(2)').text(),
                        //电子邮箱
                        email: linkInfo.find('> table > tbody > tr:nth-child(3) > td:nth-child(2)').text(),
                        //婚否
                        marriedName: resume.find('> div.content > div > div.resume-main > div.infomation.clearfix > div:nth-child(3) > p:nth-child(6)').text(),
                        //学历
                        educationName: resume.find('> div.content > div > div.resume-main > div.infomation.clearfix > div:nth-child(4) > p:nth-child(4)').text(),
                        //联系地址
                        contactAddress: linkInfo.find('> table > tbody > tr:nth-child(4) > td:nth-child(2)').text(),
                        //自我介绍
                        introduction: resume.find('> div.content > div > div.resume-main > div.self-evaluation > p').text(),
                        //求职类型
                        jobStateName: resume.find('> div.content > div > div.resume-main > div.infomation.clearfix > div:nth-child(5) > p.infomation-status-c').text(),
                        //期望工作
                        objectiveJob: resume.find('> div.content > div > div.resume-main > div.target > h2 > span').text(),
                        //教育经历
                        educationExperienceList: [],
                        //工作经历
                        workExperienceList: [],
                        //期望工作类型
                        jobTypeName: $(' > div:nth-child(5) > p:nth-child(2)').text(),
                        //期望工作地点
                        jobPlace: $intent.find('> div:nth-child(4) > p.target-term-industry').text().split(';')[1],
                        //期望公司行业
                        jobIndustry: $intent.find('> div:nth-child(2) > p.target-term-industry').text().split(';')[1],
                        //期望公司岗位
                        objectiveJob: $intent.find('>> div:nth-child(3) > p.target-term-industry').text().split(';')[1],
                        //期望薪水
                        expectSalaryName: $intent.find('> div:nth-child(5) > p:nth-child(4)').text()
                    };

                    getWorkAndEducationExperience(info, resume);

                    console.info("保存简历信息:" + JSON.stringify(info));
                    var resumes = window.localStorage.getItem("wanzhou_resumes");
                    if (resumes == null) {
                        resumes = {};
                    } else {
                        resumes = JSON.parse(resumes);
                    }
                    if (resumes[resumeId] == null) {
                        resumes[resumeId] = info;
                        window.localStorage.setItem("wanzhou_resumes", JSON.stringify(resumes));
                    } else {
                        console.warn("简历已存在,略过:" + resumeId);
                    }
                    console.log("回到上一页");
                    window.document.location.href = "http://www.wanzhoujob.com/Company/Resuming/ResumingManage.aspx?pager=" + pageNo
                } else {
                    console.warn("不是插件跳转,什么也不做...");
                }
            } else {
                setTimeout(window.location.href = resumeListUrl, 3000);
            }
        });

        /**
         * 封装简历工作经历和教育经历
         *
         * @param info 简历信息
         * @param resume 网页简历信息
         */
        function getWorkAndEducationExperience(info, resume) {
            var $education = resume.find('> div.content > div > div.resume-main > div.education');
            var educationCount = $education.children().length - 1;
            for (var i = 2; i < educationCount + 2; i++) {
                try {
                    var education = {};
                    var $educationItem = $education.find('> div:nth-child(' + i + ')');
                    if ($educationItem.length > 0) {
                        //简历ID
                        education.id = resumeId;
                        //学校
                        education.school = $educationItem.find('> div:nth-child(1) > p').text().split("（")[0];
                        //学历
                        education.educationName = $educationItem.find('> div:nth-child(2) > p:nth-child(2)').text();
                        //专业
                        education.major = $educationItem.find('> div:nth-child(2) > p:nth-child(6)').text();
                        //在校时间
                        var educationDates = $educationItem.find('> div:nth-child(1) > p > span').text().split('-');
                        if (educationDates.length > 1) {
                            //开始时间
                            if ($.trim(educationDates[0].trim().replace('（', '').replace('年', '/').replace('月', '/') + "01").length === 10) {
                                education.startDate = $.trim(educationDates[0].trim().replace('（', '').replace('年', '/').replace('月', '/') + "01");
                            }
                            //结束时间
                            if ($.trim(educationDates[0].trim().replace('（', '').replace('年', '/').replace('月', '/') + "01").length === 10) {
                                education.endDate = $.trim(educationDates[0].trim().replace('（', '').replace('年', '/').replace('月', '/') + "01");
                            }
                        }
                    }
                    info.educationExperienceList.push(education);
                } catch (e) {
                    console.log(e);
                }
            }

            var $experience = resume.find('> div.content > div > div.resume-main > div.experience');
            var experienceCount = $experience.children().length - 1;
            for (var i = 2; i < experienceCount + 2; i++) {
                try {
                    var experience = {};
                    experience.id = resumeId;
                    var $experienceItem = $experience.find('> div:nth-child(' + i + ')');
                    if ($experienceItem.length > 0) {
                        //工作单位
                        experience.workUnit = $experienceItem.find('> div:nth-child(1) > p').text().split('（')[0];
                        //企业性质
                        experience.companyNutureName = $experienceItem.find('> div:nth-child(2) > p:nth-child(2)').text();
                        //企业行业
                        experience.companyIndustryName = $experienceItem.find('> div:nth-child(2) > p:nth-child(4)').text();
                        //工作岗位
                        experience.position = $experienceItem.find('> div:nth-child(3) > p:nth-child(2)').text();
                        //工作内容
                        experience.jobContent = $experienceItem.find('> div:nth-child(4) > p').text().substr(5);
                        var experienceDates = $experienceItem.find('> div:nth-child(1) > p > span').text().split('-');
                        if (experienceDates.length > 1) {
                            if ($.trim(experienceDates[0].trim().replace('（', '').replace('年', '/').replace('月', '/') + "01").length === 10) {
                                experience.startDate = $.trim(experienceDates[0].trim().replace('（', '').replace('年', '/').replace('月', '/') + "01");
                            }
                            var endDateTmp = experienceDates[1].split("共");

                            if ($.trim(endDateTmp[0].trim().replace('（', '').replace('）', '').replace('年', '/').replace('月', '/') + "01").length === 10) {
                                experience.endDate = $.trim(endDateTmp[0].trim().replace('（', '').replace('）', '').replace('年', '/').replace('月', '/') + "01");
                            }
                        }
                        info.workExperienceList.push(experience);
                    }
                } catch (e) {
                    console.log(e);
                }
            }
        }
    }(jQuery, XLSX, moment, JdUtils)
);