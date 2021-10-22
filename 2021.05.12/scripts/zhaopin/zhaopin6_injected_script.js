(function ($) {
    var siteLoginAccount = window._siteLoginAccount;
    var settingDate = window._resumeSettingDate;
    var resumeSaveToDb = window._resumeSaveToDb;
    var siteSecurityPolicy = JSON.parse(window._siteSecurityPolicy);
    var fromDate = moment(settingDate).format('YYYYMMDD');
    var fromDateTimestamp = moment(settingDate).valueOf();
    var toDate = moment().format('YYYYMMDD');
    var toDateTimestamp = moment().valueOf();


    startExecute();

    function startExecute() {
        showProcessMessage("将" + fromDate + "到" + toDate + "的所有待筛选简历标记为沟通中简历。");
        var resumeItems = [];
        var loadFinished = false;
        var hasError = false;

        //查找所有待筛选的简历数据
        for (var i = 1; i < 100; i++) {
            $.ajax({
                method: 'POST',
                async: false, //设为false就是同步请求
                url: "https://rd6.zhaopin.com/api/candidate/list?_=" + (new Date().getTime()),
                data: JSON.stringify({
                    "startInclude": fromDateTimestamp,
                    "endExclude": toDateTimestamp,
                    "states": ["PENDING"],
                    "pageNo": i,
                    "pageSize": 100
                }),
                headers: {'Content-Type': 'application/json;charset=UTF-8'}
            }).done(function (json) {
                var list = json.data.list;
                if (list.length > 0) {
                    showProcessMessage("正在加载第" + i + "页的待筛选简历");
                    for (var j = 0, len = list.length; j < len; j++) {
                        var jsonObj = list[j];
                        resumeItems.push({
                            jobNumber: jsonObj.jobNumber,
                            resumeNumber: jsonObj.resumeNumber,
                            jobTitle: jsonObj.jobTitle,
                            jobSourceType: jsonObj.jobSourceType,
                            userMasterId: jsonObj.userMasterId
                        });
                    }
                } else {
                    loadFinished = true;
                }
            }).fail(function (response) {
                showProcessMessage(JSON.stringify(response));
                hasError = true;
                loadFinished = true;
            });
            if (loadFinished) {
                break;
            }
        }

        if (hasError) {
            return;
        }

        var finishLength = 0;
        //进行标记
        for (var i = 0, len = resumeItems.length; i < len; i++) {
            changeResumeStateCallBack(resumeItems[i], i).then(function (params) {
                finishLength++;
            });
        }
        var interval = setInterval(function () {
            if (finishLength - len === 0) {
                showProcessMessage("----所有待筛选简历已标记为沟通中----");
                clearInterval(interval);
                //加载简历
                setTimeout(getResumeList, siteSecurityPolicy.beginWaitCommunicateTime, fromDate, toDate);
            }
        }, 1000);
    }

    function changeResumeStateCallBack(json, i) {
        return new Promise(function (resolve, reject) {
            setTimeout(asyncChangeResumeState, siteSecurityPolicy.resumeMarkToWaitHandleIntervalTime * (i + 1), json, i, resolve);
        });
    }

    function asyncChangeResumeState(json, i, resolve) {
        $.ajax({
            method: 'POST',
            async: false, //设为false就是同步请求
            url: "https://rd6.zhaopin.com/api/resume/markInterest",
            data: JSON.stringify({"jobNumber": json.jobNumber, "sideBusinessSubtype": "PENDING_MARK_APPOINTABLE", "userId": json.userMasterId}),
            headers: {'Content-Type': 'application/json;charset=UTF-8'}
        }).done(function (json) {
            resolve();
            console.log(json);
        });
    }

    //加载已沟通的简历
    function getResumeList(fromDate, toDate) {
        showProcessMessage("加载" + fromDate + "到" + toDate + "的所有沟通中简历。");
        var loadFinished = false;
        //一次拉出所有数据
        for (var i = 1; i < 1000; i++) {
            var dataJson = {data: {dataList: [], total: 0}, pageNum: i};
            $.ajax({
                method: 'POST',
                async: false, //设为false就是同步请求
                url: "https://rd6.zhaopin.com/api/candidate/list?_=" + (new Date().getTime()),
                data: JSON.stringify({
                    "startInclude": fromDateTimestamp,
                    "endExclude": toDateTimestamp,
                    "states": ["INTERESTED", "APPOINTABLE"],
                    "pageNo": i,
                    "pageSize": 100
                }),
                headers: {'Content-Type': 'application/json;charset=UTF-8'}
            }).done(function (json) {
                var list = json.data.list;
                if (list.length > 0) {
                    dataJson.data.dataList.push.apply(dataJson.data.dataList, json.data.list);
                } else {
                    loadFinished = true;
                }
            });
            if (loadFinished) {
                var totalPageSize = i - 1;
                showProcessMessage("----所有简历准备完成，共" + totalPageSize + "页。----");
                break;
            } else {
                showProcessMessage("准备加载第" + i + "页简历");
                dataJson.data.total = dataJson.data.dataList.length;
                setTimeout(getResumeListCallBack, siteSecurityPolicy.everyPageResumeLoadingHandleEventIntervalTime, dataJson);
            }
        }
    }

    function getResumeListCallBack(json) {
        var downloadResumes = {};
        var data = json.data;
        var finishLength = 0;
        for (var i = 0; i < data.total; i++) {
            try {
                //取得投递岗位信息
                getPositionInfo(data.dataList[i], (i + 1), json.pageNum).then(function (params) {
                    var resumeBaseInfo = params.resumeBaseInfo;
                    var jobInfo = params.jobInfo;
                    //现在（前）单位
                    var previewCompany = resumeBaseInfo.workExperiences && resumeBaseInfo.workExperiences.length > 0 ? resumeBaseInfo.workExperiences[0].companyName : "";
                    //学校名称
                    var school = resumeBaseInfo.educationExperiences && resumeBaseInfo.educationExperiences.length > 0 ? resumeBaseInfo.educationExperiences[0].schoolName : "";
                    //简历KEY(岗位+姓名+现在（前）单位+学校)
                    var key = jobInfo.applyPosition + '-' + resumeBaseInfo.userName + '-' + previewCompany + '-' + school;
                    var info = {
                        userMasterId: resumeBaseInfo.userMasterId,
                        //简历ID
                        resumeNumber: resumeBaseInfo.resumeNumber,
                        //岗位ID
                        jobNumber: resumeBaseInfo.jobNumber,
                        //岗位名称
                        jobTitle: resumeBaseInfo.jobTitle,
                        //姓名
                        name: resumeBaseInfo.userName,
                        //移动电话
                        mobile: "",
                        //电子邮件
                        email: "",
                        //目前居住地
                        regionName: "",
                        //现在（前）单位
                        previewCompany: previewCompany,
                        //学校名称
                        school: school,
                        jobInfo: jobInfo
                    };
                    downloadResumes[key] = {info: info};
                    console.log("第" + json.pageNum + "页", params.index, key, info);
                    finishLength++;
                });
            } catch (e) {
                console.log(e);
                showProcessMessage("获取岗位信息异常：" + e.message);
                var params = {
                    "module": "智联招聘",
                    "content": e
                };
                finishLength++;
            }
        }

        var interval = setInterval(function () {
            if (finishLength - data.total === 0) {
                clearInterval(interval);
                localStorage.setItem(siteLoginAccount + "_zhaopin_downloadResumes", JSON.stringify(downloadResumes));

                setTimeout(downloadResume, siteSecurityPolicy.beginDownloadResumeTime, downloadResumes, json.pageNum);
            }
        }, 1000);
    }

    //获取岗位详情
    function getPositionInfo(resumeBaseInfo, index, pageNum) {
        var jobId = resumeBaseInfo.jobNumber;
        //获取缓存的岗位信息
        var jobInfos = JSON.parse(window.localStorage.getItem("zhaopin_jobInfo") || "{}") || {};
        if (jobInfos[jobId]) {
            return new Promise(function (resolve, reject) {
                asyncGetPositionInfo(resolve, resumeBaseInfo, index, pageNum, jobInfos[jobId]);
            });
        }

        //ajax同步获取岗位信息
        return new Promise(function (resolve, reject) {
            setTimeout(asyncGetPositionInfo, siteSecurityPolicy.searchApplyPositionInfoIntervalTime * index, resolve, resumeBaseInfo, index, pageNum);
        });
    }

    function asyncGetPositionInfo(resolve, resumeBaseInfo, index, pageNum, jobInfo) {
        showLoadResumeProcessMessage("正在加载第" + pageNum + "页，第" + index + "条简历信息");
        //不是本地存在的数据，则ajax加载
        if (!jobInfo) {
            //投递岗位信息
            jobInfo = {
                releaseCityName: '',
                workArea: '',
                workAddress: '',
                jobId: resumeBaseInfo.jobNumber,
                applyPosition: resumeBaseInfo.jobTitle
            };

            var iframe = document.createElement("iframe");
            iframe.style.display = "none";
            //岗位地址
            iframe.src = '//rd6.zhaopin.com/job/detail?jobNumber=' + jobInfo.jobId;
            document.body.appendChild(iframe);

            var interval = setInterval(function () {
                if (typeof iframe.contentWindow.$ == "function") {
                    clearInterval(interval);
                    //发布城市
                    jobInfo.releaseCityName = $.trim(iframe.contentWindow.$("div.job-detail__creator-job span:contains(工作城市)").text().replace("工作城市：", ""));
                    //工作地区
                    jobInfo.workArea = $.trim(iframe.contentWindow.$("div.job-detail__creator-job span:contains(工作城市)").text().replace("工作城市：", ""));
                    //投递岗位
                    jobInfo.applyPosition = $.trim(iframe.contentWindow.$("div.job-detail__name").text());
                    //工作地址
                    jobInfo.workAddress = $.trim(iframe.contentWindow.$("div.job-detail__map-address").text());
                    //投递公司
                    jobInfo.applyCompany = $.trim(iframe.contentWindow.$('div.job-detail__company-title').text());

                    //获取缓存的岗位信息
                    var jobInfos = JSON.parse(window.localStorage.getItem("zhaopin_jobInfo") || "{}") || {};
                    jobInfos[jobInfo.jobId] = jobInfo;
                    localStorage.setItem("zhaopin_jobInfo", JSON.stringify(jobInfos));

                    var params = {
                        resumeBaseInfo: resumeBaseInfo,
                        jobInfo: jobInfo,
                        index: index
                    };
                    //只能有一个参数
                    resolve(params);

                    iframe.parentElement.removeChild(iframe);
                }
            }, 3000);
        } else {
            var params = {
                resumeBaseInfo: resumeBaseInfo,
                jobInfo: jobInfo,
                index: index
            };
            //只能有一个参数
            resolve(params);
        }
    }

    //简历下载
    function downloadResume(resumesResult, pageNum) {
        if (getObjectLength(resumesResult) < 1) {
            showProcessMessage("无简历可下载，稍后请手动刷新");
            return;
        }
        var data = {fileType: 'EXCEL', exportItems: []};
        var exportItems = [];
        $.each(resumesResult, function (index, item) {
            if (item && item.info) {
                exportItems.push({"jobNumber": item.info.jobNumber, "resumeLanguage": "1", "resumeNumber": item.info.resumeNumber});
            } else {
                console.warn("忽略错误的简历：" + item);
            }
        });
        data.exportItems = exportItems;
        showProcessMessage("开始下载第" + pageNum + "页简历");
        $.ajax({
            method: 'POST',
            url: "https://rd6.zhaopin.com/api/resume/createExportTask?_=" + new Date().getTime(),
            data: JSON.stringify(data),
            headers: {'Content-Type': 'application/json;charset=UTF-8'}
        }).done(function (json) {
            if (json.code != 200) {
                showProcessMessage(json.message);
                return;
            }
            showProcessMessage("等待智联生第" + pageNum + "页简历");
            //验证智联文件是否准备完毕
            $.when(checkFileReady(json.data)).done(function () {
                setTimeout(function () {
                    showProcessMessage("正在下载第" + pageNum + "页简历");
                    var filePath = localStorage.getItem(siteLoginAccount + json.data + "_zhaopin_file_path");
                    downloadFile(resumesResult, filePath);
                }, siteSecurityPolicy.beginDownloadFileIntervalTime);
            });
        });
    }

    /**
     * 检查文件是否可以下载
     *
     * @param fileId 文件ID
     * @returns true 可以
     */
    function checkFileReady(fileId) {
        var dtd = $.Deferred();
        //loadScript将异步加载一个js文件，所以返回值是一个Deffered对象
        var tasks = function () {
            $.ajax({
                method: 'POST',
                url: "https://rd6.zhaopin.com/api/resume/saveLocal/getFile?_=" + new Date().getTime(),
                data: JSON.stringify({fileId: fileId}),
                headers: {'Content-Type': 'application/json;charset=UTF-8'}
            }).done(function (result) {
                if (result.code == 200 && result.data.fileUrl) {
                    console.log("文件准备完毕：" + result.data.fileUrl);
                    localStorage.setItem(siteLoginAccount + fileId + "_zhaopin_file_path", result.data.fileUrl);
                    return dtd.resolve();
                } else {
                    setTimeout(tasks, siteSecurityPolicy.validateFileReadiedIntervalTime);
                }
                return dtd.promise();
            });
        };
        setTimeout(tasks, siteSecurityPolicy.validateFileReadiedIntervalTime);
        //返回自定义的dtd对象，才能保证返回值的done回调在load事件完成后执行
        return dtd.promise();
    }

    /**
     * 下载文件
     * @param resumesResult 简历结果
     * @param times 尝试次数
     * @param url 简历URL
     */
    function downloadFile(resumesResult, url, times) {
        //使用https下载
        url = url.replace("http://", "https://");

        if (resumeSaveToDb === 1) {
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
                //发送信息到插件
                window.postMessage({'action': 'parseResume', 'xls': arrayString, 'resumesResult': resumesResult}, '*');
            };
            oReq.onerror = function (e) {
                if (times == 10) {
                    showProcessMessage("下载简历Excel文件尝试10次失败,请稍后手动重试");
                } else {
                    var newTimes = times ? times : 1;
                    showProcessMessage("下载简历Excel文件失败,正在进行第" + newTimes + "次尝试");
                    setTimeout(downloadFile, siteSecurityPolicy.downloadFileRetryIntervalTime, resumesResult, url, ++newTimes);
                }
            };
            oReq.send();
        } else {
            //下载文件
            window.open(url);
        }
    }

    /**
     * 取得对象的大小
     *
     * @param obj 传的对象
     * @return length 对象的大小
     */
    function getObjectLength(obj) {
        var length = 0;
        $.each(obj, function () {
            length++;
        });
        return length;
    }

    //显示处理进度消息(追加显示)
    function showProcessMessage(msg) {
        $('#consoleDiv').append("<h1 style='color: green;align-content: center'>" + msg + "</h1>");
        $('#consoleDiv').append("<br>");
        $('#consoleDiv').scrollTop(9999999);
    }

    //显示处理进度消息(追加显示)
    function showLoadResumeProcessMessage(msg) {
        if ($('#consoleDiv #resumeProcessH1').length > 0) {
            $('#consoleDiv #resumeProcessH1').text(msg);
        } else {
            $('#consoleDiv').append("<h1 style='color: red;align-content: center;font-weight: bold' id='resumeProcessH1'>" + msg + "</h1>");
            $('#consoleDiv').append("<br>");
        }
        $('#consoleDiv').scrollTop(9999999);
    }

    //删除处理进度消息（从最后行消息开始删除）
    function removeMessage() {
        $('#consoleDiv').find('>h1:last').remove();
        $('#consoleDiv').find('>br:last').remove();
        $('#consoleDiv').scrollTop(9999999);
    }
})(jQuery);
