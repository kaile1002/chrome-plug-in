(function ($) {
    var ZhaopinUtils = function () {
        this.siteLoginAccount = window._siteLoginAccount;
        this.settingDate = window._resumeSettingDate;
        this.siteSecurityPolicy = JSON.parse(window._siteSecurityPolicy);
        this.fromDate = moment(this.settingDate).format('YYYYMMDD');
        this.fromDateTimestamp = moment(this.settingDate).valueOf();
        this.toDate = moment().format('YYYYMMDD');
        this.toDateTimestamp = moment().valueOf();
        var _this = this;

        this.startExecute = function () {
            _this.showProcessMessage("加载" + _this.fromDate + "到" + _this.toDate + "的所有沟通中<b>主动投递</b>的沟通中、已约面、不合适的简历。");
            //加载简历
            setTimeout(_this.getResumeList, _this.siteSecurityPolicy.beginWaitCommunicateTime, _this.fromDate, _this.toDate);
        }

        this.changeResumeStateExecute = function (resumeItems, index) {
            //标记完成后
            if (index == resumeItems.length) {
                _this.showProcessMessage("所有待筛选简历已标记为沟通中");
                _this.showProcessMessage("加载" + _this.fromDate + "到" + _this.toDate + "的所有沟通中<b>主动投递</b>的沟通中、已约面、不合适的简历。");
                //加载简历
                setTimeout(_this.getResumeList, _this.siteSecurityPolicy.beginWaitCommunicateTime, _this.fromDate, _this.toDate);
                return;
            }
            _this.changeResumeState(resumeItems[index], index).then(function (params) {
                _this.changeResumeStateExecute(resumeItems, index + 1);
            });
        }

        this.getResumeList = function (fromDate, toDate, pageNumber) {
            pageNumber = pageNumber ? pageNumber : 1;
            var resumeDataJson = {data: {dataList: [], total: 0}, pageNum: pageNumber};
            $.ajax({
                method: 'POST',
                async: false, //设为false就是同步请求
                url: "https://rd6.zhaopin.com/api/candidate/list?_=" + (new Date().getTime()),
                data: JSON.stringify({
                    "startInclude": _this.fromDateTimestamp,
                    "endExclude": _this.toDateTimestamp,
                    "orderType": "MODIFIED_TIME",
                    "sourceTypes": ["APPLY", "INTERNAL_RECOMMEND"],
                    "states": ["INTERESTED", "APPOINTABLE", "APPOINTED", "INAPPROPRIATE"],
                    "pageNo": pageNumber,
                    "pageSize": 100
                }),
                headers: {'Content-Type': 'application/json;charset=UTF-8'}
            }).done(function (json) {
                var list = json.data.list;
                if (list.length > 0) {
                    resumeDataJson.data.dataList.push.apply(resumeDataJson.data.dataList, list);
                    resumeDataJson.data.total = resumeDataJson.data.dataList.length;
                    _this.showProcessMessage("准备加载第" + pageNumber + "页简历，共" + resumeDataJson.data.total + "条简历");

                    _this.getResumeListCallBack(resumeDataJson).then(function (params) {
                        //加载下一页简历
                        setTimeout(_this.getResumeList, _this.siteSecurityPolicy.everyPageResumeLoadingHandleEventIntervalTime, fromDate, toDate, pageNumber + 1);
                    });
                } else {
                    var totalPageSize = pageNumber - 1;
                    _this.showProcessMessage("所有简历处理完成，共" + totalPageSize + "页。");
                }
            }).fail(function (response) {
                _this.showProcessMessage("加载简历列表失败:" + JSON.stringify(response));
            });
        }

        this.getResumeListCallBack = function (resumeDataJson) {
            return new Promise(function (resolve, reject) {
                _this.syncGetResumeListCallBack(resumeDataJson, resolve);
            });
        }

        this.syncGetResumeListCallBack = function (resumeDataJson, resolve) {
            console.log('resumeDataJsonresumeDataJson',resumeDataJson);
            var finishLength = 0;
            var resumeList = [];
            for (let i = 0, len = resumeDataJson.data.total; i < len; i++) {
                var resume = resumeDataJson.data.dataList[i];
                //加载简历详情数据
                _this.getResumeDetail(resume, resumeDataJson.pageNum, i).then(function (params) {
                    var resume = resumeDataJson.data.dataList[i];
                    if (params) {
                        resume.detailData = params;
                        resumeList.push(resume);
                    }
                    finishLength++;
                    console.log(resume.userName, resume);
                });
            }

            var interval = setInterval(function () {
                if (finishLength - resumeDataJson.data.total === 0) {
                    _this.showLoadResumeProcessMessage("第" + resumeDataJson.pageNum + "页所有简历加载完毕，共" + finishLength + "条简历。");
                    clearInterval(interval);

                    //获取岗位信息
                    _this.getPositionList(resumeList, resumeDataJson.pageNum);

                    resolve();

                }
            }, 1000);
        }

        this.getResumeDetail = function (resume, pageNum, index) {
            return new Promise(function (resolve, reject) {
                setTimeout(_this.asyncGetResumeDetail, _this.siteSecurityPolicy.beginDownloadResumeTime * (index + 1), resume, pageNum, index, resolve);
            });
        }

        this.asyncGetResumeDetail = function (resume, pageNum, index, resolve) {
            _this.showLoadResumeProcessMessage(moment().format("HH:mm:ss.SSS") + " 正在加载第" + pageNum + "页，第" + (index + 1) + "条简历信息");
            $.ajax({
                method: 'GET',
                async: false, //设为false就是同步请求
                url: "//rd6.zhaopin.com/resume/detail?jobNumber=" + resume.jobNumber + "&resumeNumber=" + resume.resumeNumber + "&resumeLanguage=" + resume.resumeLanguage,
            }).done(function (response) {
                var initialState = _this.getPageInitialStateJson(response);
                console.log('getPageInitialStateJson',initialState);
                if (initialState) {
                    var key = Object.keys(initialState.store.resumeDetail.resumes)[0];
                    resolve(initialState.store.resumeDetail.resumes[key]);
                } else {
                    resolve();
                }
            }).fail(function (response) {
                _this.showProcessMessage("第" + pageNum + "页，第" + (index + 1) + "条简历明细获取失败,已忽略:" + JSON.stringify(response));
                resolve();
            });
        }

        this.getPositionList = function (resumeList, pageNum) {
            var jobJsonData = {};
            var jobNumberList = Array.from(new Set(resumeList.map(a => a.jobNumber)));
            var finishLength = 0;
            _this.showProcessMessage("开始加载第" + pageNum + "页岗位数据，共" + jobNumberList.length + "份岗位。");

            for (let i = 0, len = jobNumberList.length; i < len; i++) {
                var jobNumber = jobNumberList[i];
                //加载简历详情数据
                _this.getPositionDetail(jobNumber, i, pageNum).then(function (params) {
                    var jobNumber = jobNumberList[i];
                    if (params) {
                        jobJsonData[jobNumber] = params;
                    }
                    finishLength++;
                    console.log(jobNumber, params);
                });
            }

            var interval = setInterval(function () {
                if (finishLength - jobNumberList.length === 0) {
                    _this.showLoadPositionProcessMessage("第" + pageNum + "页所有岗位数据加载完毕。");
                    clearInterval(interval);

                    //处理简历数据
                    _this.parseResume(resumeList, jobJsonData, pageNum);
                }
            }, 1000);
        }

        this.getPositionDetail = function (jobNumber, index, pageNum) {
            return new Promise(function (resolve, reject) {
                setTimeout(_this.asyncGetPositionDetail, _this.siteSecurityPolicy.searchApplyPositionInfoIntervalTime * (index + 1), jobNumber, index, pageNum, resolve);
            });
        }

        this.asyncGetPositionDetail = function (jobNumber, index, pageNum, resolve) {
            _this.showLoadPositionProcessMessage(moment().format("HH:mm:ss.SSS") + " 正在加载第" + pageNum + "页第" + (index + 1) + "条岗位信息");

            //获取缓存的岗位信息
            var jobInfos = JSON.parse(window.localStorage.getItem("zhaopin_job_detail_json") || "{}") || {};
            if (jobInfos[jobNumber]) {
                resolve(jobInfos[jobNumber]);
                return;
            }

            $.ajax({
                method: 'GET',
                async: false, //设为false就是同步请求
                url: "//rd6.zhaopin.com/job/detail?jobNumber=" + jobNumber,
            }).done(function (response) {
                var initialState = _this.getPageInitialStateJson(response);
                console.log('getPageInitialStateJson',initialState);
                if (initialState) {
                    var jobInfos = JSON.parse(window.localStorage.getItem("zhaopin_job_detail_json") || "{}") || {};
                    jobInfos[jobNumber] = initialState.jobDetail;
                    //放入本地数据
                    try {
                        localStorage.setItem("zhaopin_job_detail_json", JSON.stringify(jobInfos));
                    } catch (e) {
                        console.log("已超过localStorage最大存储容量。");
                        //清空本地存储数据
                        localStorage.setItem("zhaopin_job_detail_json", "");
                    }

                    resolve(initialState.jobDetail);
                } else {
                    resolve();
                }
            }).fail(function (response) {
                _this.showProcessMessage("第" + pageNum + "页第" + (index + 1) + "条岗位明细（岗位编号：" + jobNumber + "）获取失败,已忽略:" + JSON.stringify(response));
                resolve();
            });
        }

        this.changeResumeState = function (json, i) {
            return new Promise(function (resolve, reject) {
                setTimeout(_this.asyncChangeResumeState, _this.siteSecurityPolicy.resumeMarkToWaitHandleIntervalTime * (i + 1), json, i, resolve);
            });
        }

        this.asyncChangeResumeState = function (json, i, resolve) {
            _this.showLoadResumeProcessMessage(moment().format("HH:mm:ss.SSS") + " 标记为沟通中简历：正在处理第" + (i + 1) + "条简历信息");
            $.ajax({
                method: 'POST',
                async: false, //设为false就是同步请求
                url: "https://rd6.zhaopin.com/api/resume/markInterest",
                data: JSON.stringify({
                    "jobNumber": json.jobNumber,
                    "sideBusinessSubtype": "PENDING_MARK_APPOINTABLE",
                    "userId": json.userMasterId
                }),
                headers: {'Content-Type': 'application/json;charset=UTF-8'}
            }).done(function (json) {
                resolve();
                console.log(json);
            }).fail(function (response) {
                _this.showProcessMessage("标记第" + (i + 1) + "条的待筛选简历失败:" + JSON.stringify(response));
                resolve();
            });
        }

        this.parseResume = function (resumeList, jobJsonData, pageNum) {
            var syncResumes = [];
            for (let i = 0, len = resumeList.length; i < len; i++) {
                try {
                    var resume = resumeList[i];
                    var resumeDetail = resume.detailData;
                    var jobData = jobJsonData[resume.jobNumber];
                    var syncResume = {};
                    if (resumeDetail.user.phoneVirtual) {
                        _this.showProcessMessage("当前简历手机号为虚拟号码，已忽略：" + resumeDetail.user.name + "[" + resumeDetail.job.title + "]");
                        continue;
                    }
                    if (!resumeDetail.user.phone) {
                        _this.showProcessMessage("当前简历手机号无法获取，已忽略：" + resumeDetail.user.name + "[" + resumeDetail.job.title + "]");
                        continue;
                    }
                    //简历ID
                    syncResume.resumeId = resume.resumeNumber;
                    //姓名
                    syncResume.name = resume.userName;
                    //性别
                    syncResume.sexName = resume.gender;
                    //出生日期
                    syncResume.birthday = resumeDetail.user.birthYear + "/" + resumeDetail.user.birthMonth + "/01";
                    //age 年龄
                    syncResume.age = resume.age;
                    //电话
                    syncResume.mobile = resumeDetail.user.phone;
                    //电子邮件
                    syncResume.email = resumeDetail.user.email;
                    //婚姻状况
                    syncResume.marriedName = resumeDetail.user.marriage;
                    //户口
                    syncResume.registerAddress = resumeDetail.user.huKouLabel ? resumeDetail.user.huKouLabel.replace("户籍", "") : "";
                    //邮编
                    syncResume.zipCode = "";
                    //目前居住地
                    syncResume.regionName = resumeDetail.user.cityLabel ? resumeDetail.user.cityLabel.replace("现居", "") : "";
                    //工作年限
                    syncResume.workName = resume.workYears;
                    //最高学历
                    syncResume.educationName = resume.educationLevel;
                    //通讯地址
                    syncResume.contactAddress = syncResume.regionName;
                    //发布城市
                    syncResume.releaseCityName = jobData ? jobData.address.releaseCityLabel : "";
                    //工作地区
                    syncResume.workArea = jobData ? jobData.address.jobCityLabel : "";
                    //工作地址
                    syncResume.workAddress = jobData ? jobData.address.jobAddress : "";
                    //投递公司
                    syncResume.applyCompany = jobData ? jobData.company.companyName : "";
                    //应聘职位
                    syncResume.applyPosition = resume.jobTitle;
                    //求职意向
                    syncResume.jobIntentionInfo = resumeDetail.resume.purposes ? resumeDetail.resume.purposes.map(a => a.jobTypeLabel).join(",") : "";
                    //期望工作性质
                    syncResume.jobTypeName = resumeDetail.resume.purposes ? resumeDetail.resume.purposes.map(a => a.jobNatureLabel).join(",") : "";
                    //期望从事职业
                    syncResume.objectiveJob = resume.desiredJobType;
                    //期望从事行业
                    syncResume.jobIndustry = resumeDetail.resume.purposes ? resumeDetail.resume.purposes.map(a => a.industryLabel).join(",") : "";
                    //期望工作地区
                    syncResume.jobPlace = resume.desiredCity;
                    //期望月薪
                    syncResume.expectSalaryName = resume.desiredSalary;
                    //目前状况
                    syncResume.dutyTimeName = resume.careerStatus;
                    //自我评价
                    syncResume.introduction = resumeDetail.resume.selfEvaluation;
                    //教育经历
                    syncResume.educationExperienceList = [];
                    for (var j = 0, eduLen = resumeDetail.resume.educationExperiences.length; j < eduLen; j++) {
                        var education = resumeDetail.resume.educationExperiences[j];
                        syncResume.educationExperienceList.push({
                            //开始时间
                            startDate: moment(education.beginTime).format("YYYY/MM/DD"),
                            //结束时间
                            endDate: education.endTime && education.endTime > 0 ? moment(education.endTime).format("YYYY/MM/DD") : "",
                            //学校
                            school: education.schoolName,
                            //专业
                            major: education.major,
                            //学历
                            educationName: education.educationLabel
                        });
                    }
                    //工作经历
                    syncResume.workExperienceList = [];
                    for (var j = 0, workLen = resumeDetail.resume.workExperiences.length; j < workLen; j++) {
                        var work = resumeDetail.resume.workExperiences[j];
                        syncResume.workExperienceList.push({
                            //开始年月
                            startDate: moment(work.beginTime).format("YYYY/MM/DD"),
                            //结束年月
                            endDate: work.endTime && work.endTime > 0 ? moment(work.endTime).format("YYYY/MM/DD") : "",
                            //工作单位
                            workUnit: work.orgName,
                            //职位
                            position: work.jobTitle,
                            //公司行业
                            companyIndustryName: _this.getIndustry(work.industryType),
                            //企业性质
                            companyNutureName: "",
                            //规模
                            companyScaleName: "",
                            //工作内容
                            jobContent: work.description
                        });
                    }
                    //项目经验
                    syncResume.projectExperienceList = [];
                    for (var j = 0, projectLen = resumeDetail.resume.projectExperiences.length; j < projectLen; j++) {
                        var project = resumeDetail.resume.projectExperiences[j];
                        syncResume.projectExperienceList.push({
                            //开始年月
                            projectStartDate: moment(project.beginTime).format("YYYY/MM/DD"),
                            //结束年月
                            projectEndDate: project.endTime && project.endTime > 0 ? moment(project.endTime).format("YYYY/MM/DD") : "",
                            //项目名称
                            projectName: project.name,
                            //责任描述
                            responsibilities: "",
                            //项目描述
                            projectDescribe: project.description
                        });
                    }
                    //培训经历
                    syncResume.trainingExperience = "";
                    for (var j = 0, trainingLen = resumeDetail.resume.trainingExperiences.length; j < trainingLen; j++) {
                        var training = resumeDetail.resume.trainingExperiences[j];
                        syncResume.trainingExperience += training.timeLabel + " " + training.name + "；";
                    }
                    //现在单位
                    syncResume.previewCompany = syncResume.workExperienceList.length > 0 ? syncResume.workExperienceList[0].workUnit : "";
                    //专业名称
                    syncResume.major = syncResume.educationExperienceList.length > 0 ? syncResume.educationExperienceList[0].major : "";
                    //学校名称
                    syncResume.school = syncResume.educationExperienceList.length > 0 ? syncResume.educationExperienceList[0].school : "";
                    //证书
                    syncResume.certificates = resumeDetail.resume.certificates ? resumeDetail.resume.certificates.map(a => a.name).join(",") : "";
                    //在校学习情况
                    syncResume.graduatesInfo = "";
                    //在校实践经验
                    syncResume.socialEvents = "";
                    //语言能力
                    syncResume.languageAbility = resumeDetail.resume.languageSkills ? resumeDetail.resume.languageSkills.map(a => a.name).join(",") : "";
                    //专业技能
                    syncResume.personSkill = resumeDetail.resume.professionalSkills ? resumeDetail.resume.professionalSkills.map(a => a.name).join(",") : "";
                    //兴趣爱好
                    syncResume.interest = "";
                    //投递时间
                    syncResume.sendTime = moment(resume.createTime).format("YYYY/MM/DD");
                } catch (e) {
                    _this.showProcessMessage("解析简历出现异常,已忽略:" + resume.userName + "[" + resume.jobTitle + "]简历。");
                    console.error("解析简历出现异常:" + resumeDetail, e);
                }
                syncResumes.push(syncResume);
            }
            _this.showProcessMessage("第" + pageNum + "页上传数据准备完成，共" + syncResumes.length + "份简历需要上传");
            //发送信息到插件
            console.log('处理简历数据>>>>>：',syncResumes);
            window.postMessage({'action': 'uploadResume', 'syncResumes': syncResumes}, '*');
        }

        this.metaIndustry = [["100000000", "0", "互联网/IT/电子/通信", "Information"], ["400000000", "0", "房地产/建筑", "Real estate or construction"], ["300000000", "0", "金融业", "Finance"], ["1200000000", "0", "教育培训/科研", "Educational & Scientific Research"], ["900000000", "0", "广告/传媒/文化/体育", "Advertising or media or culture or sports"], ["1300000000", "0", "制药/医疗", "Pharmaceutical or medical"], ["700000000", "0", "批发/零售/贸易", "Wholesale & Retail Trade"], ["500000000", "0", "制造业", "Manufacturing"], ["1600000000", "0", "汽车", "Automobile"], ["1000000000", "0", "交通运输/仓储/物流", "Transportation & Warehousing"], ["800000000", "0", "专业服务", "Professional Services"], ["1500000000", "0", "生活服务", "Residential Services"], ["1100000000", "0", "能源/环保/矿产", "Mining, Quarrying, & Environmental Protection"], ["1400000000", "0", "政府/非盈利机构", "Government or nonprofit"], ["600000000", "0", "农/林/牧/渔", "Agriculture or forestry or animal husbandry or fishing"]];

        this.getIndustry = function (id) {
            var industry = "";
            if (id) {
                var ids = id.split(",");
                for (let i = 0; i < ids.length; i++) {
                    var array = _this.metaIndustry.filter(o => o[0] == ids[i])[0];
                    industry += array ? array[2] + "," : "";
                }
            }
            return industry;
        }

        this.showProcessMessage = function (msg) {
            $('#consoleDiv').append("<h1 style='color: green;align-content: center;height: 40px;'>" + msg + "</h1>");
            $('#consoleDiv').scrollTop(9999999);
        }

        //显示处理进度消息(追加显示)
        this.showLoadResumeProcessMessage = function (msg) {
            if ($('#consoleDiv #resumeProcessH1').length > 0) {
                $('#consoleDiv #resumeProcessH1').remove();
            }
            $('#consoleDiv').append("<h1 style='color: red;align-content: center;font-weight: bold;height: 40px;' id='resumeProcessH1'>" + msg + "</h1>");
            $('#consoleDiv').scrollTop(9999999);
        }

        this.showLoadPositionProcessMessage = function (msg) {
            if ($('#consoleDiv #positionProcessH1').length > 0) {
                $('#consoleDiv #positionProcessH1').remove();
            }
            $('#consoleDiv').append("<h1 style='color: #985f0d;align-content: center;font-weight: bold;height: 40px;' id='positionProcessH1'>" + msg + "</h1>");
            $('#consoleDiv').scrollTop(9999999);
        }

        //删除处理进度消息（从最后行消息开始删除）
        this.removeMessage = function () {
            $('#consoleDiv').find('>h1:last').remove();
            $('#consoleDiv').find('>br:last').remove();
            $('#consoleDiv').scrollTop(9999999);
        }

        this.getPageInitialStateJson = function (html) {
            try {
                //第一步：匹配加载的页面中是否含有js
                var regDetectJs = /<script(.|\n)*?>(.|\n|\r\n)*?<\/script>/ig;
                var jsContained = html.match(regDetectJs);

                //第二步：如果包含js，则一段一段的取出js再加载执行
                if (jsContained) {
                    //分段取出js正则
                    var regGetJS = /<script(.|\n)*?>((.|\n|\r\n)*)?<\/script>/im;

                    //按顺序分段执行js
                    var jsNums = jsContained.length;
                    for (var i = 0; i < jsNums; i++) {
                        var jsSection = jsContained[i].match(regGetJS);

                        var script = jsSection[2];
                        if (script && script.indexOf("__INITIAL_STATE__") > -1) {
                            return JSON.parse(script.replace('__INITIAL_STATE__=', ""));
                        }
                    }
                }
            } catch (e) {
                _this.showProcessMessage("解析简历/岗位详细脚本数据出错，请与技术支持联系：" + e);
                console.log("解析简历/岗位详细脚本数据出错：", e);
            }
            return null;
        }

        this.destroyIframe = function (iframe) {
            //把iframe指向空白页面，这样可以释放大部分内存。
            iframe.src = "about:blank";
            try {
                iframe.contentWindow.document.write("");
                iframe.contentWindow.document.clear();
                iframe.contentWindow.document.close();
            } catch (e) {
            }
            //把iframe从页面移除
            iframe.parentElement.removeChild(iframe);
            iframe = null;
        }
    }
    var zhaopin = new ZhaopinUtils();
    zhaopin.startExecute();
})(jQuery);
