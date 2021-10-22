(function ($) {
    var siteLoginAccount = window._siteLoginAccount;
    var settingDate = window._resumeSettingDate;
    var resumeSaveToDb = window._resumeSaveToDb;
    var siteSecurityPolicy = JSON.parse(window._siteSecurityPolicy);
    var fromDate = moment(settingDate).format('YYMMDD');
    var toDate = moment().format('YYMMDD');

    if (isIHR()) {
        startExecuteIhr();
    } else {
        startExecute5();
    }

    function startExecute5() {
        showProcessMessage("将" + fromDate + "到" + toDate + "的所有待处理简历标记为待沟通简历。");
        var resumeItems = [];
        var loadFinished = false;
        var hasError = false;

        //查找所有待沟通的简历数据
        for (var i = 1; i < 100; i++) {
            $.ajax({
                method: 'POST',
                async: false, //设为false就是同步请求
                url: "https://rd5.zhaopin.com/api/rd/resume/list?_=" + (new Date().getTime()),
                data: '{"S_ResumeState":"1","S_CreateDate":"' + fromDate + ',' + toDate + '","S_feedback":"","page":' + i + ',"pageSize":100}',
                headers: {'Content-Type': 'application/json;charset=UTF-8'}
            }).done(function (json) {
                var list = json.data.dataList;
                if (list.length > 0) {
                    showProcessMessage("正在加载第" + i + "页的待处理简历");
                    for (var j = 0, len = list.length; j < len; j++) {
                        var jsonObj = list[j];
                        resumeItems.push({
                            flowId: "1",
                            jobNumber: jsonObj.jobNumber,
                            jobResumeid: jsonObj.id,
                            jobTitle: jsonObj.jobTitle,
                            resumeSource: jsonObj.resumeSource,
                            userMasterName: "",
                            userMasterid: ""
                        });
                    }
                } else {
                    loadFinished = true;
                }
            }).fail(function (respone) {
                showProcessMessage(JSON.stringify(respone));
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
        //将数据50一组分配去进行标记
        var result = [];
        for (var i = 0, len = resumeItems.length; i < len; i += 50) {
            result.push(resumeItems.slice(i, i + 50));
        }
        //标记为待处理
        for (var i = 0, len = result.length; i < len; i++) {
            changeResumeState5CallBack(result[i], i).then(function (params) {
                finishLength++;
            });
        }
        var interval = setInterval(function () {
            if (finishLength - len === 0) {
                showProcessMessage("----所有待处理简历已标记为待沟通----");
                clearInterval(interval);
                //加载简历
                setTimeout(getResumeList5, siteSecurityPolicy.beginWaitCommunicateTime, fromDate, toDate);
            }
        }, 1000);
    }

    function startExecuteIhr() {
        setTimeout(getResumeListIhr, 1500);
    }

    function changeResumeState5CallBack(json, i) {
        return new Promise(function (resolve, reject) {
            setTimeout(asyncChangeResumeState5, siteSecurityPolicy.resumeMarkToWaitHandleIntervalTime * (i + 1), json, i, resolve);
        });
    }

    function asyncChangeResumeState5(json, i, resolve) {
        $.ajax({
            method: 'POST',
            async: false, //设为false就是同步请求
            url: "https://rd5.zhaopin.com/api/rd/resume/mark",
            data: '{"userSource":"2","signResumeStatus":2,"resumeItems":' + JSON.stringify(json) + '}',
            headers: {'Content-Type': 'application/json;charset=UTF-8'}
        }).done(function (json) {
            showProcessMessage("已标记完成第" + (i + 1) + "页的待处理简历");
            resolve();
            console.log(json);
        });
    }

    //加载待沟通的简历
    function getResumeList5(fromDate, toDate) {
        showProcessMessage("加载" + fromDate + "到" + toDate + "的所有待沟通简历。");
        var loadFinished = false;
        //一次拉出所有数据
        for (var i = 1; i < 1000; i++) {
            var dataJson = {data: {dataList: [], total: 0}, pageNum: i};
            $.ajax({
                method: 'POST',
                async: false, //设为false就是同步请求
                url: "https://rd5.zhaopin.com/api/rd/resume/list?_=" + (new Date().getTime()),
                data: '{"S_ResumeState":"2","S_CreateDate":"' + fromDate + ',' + toDate + '","S_feedback":"","isNewList":false,"page":' + i + ',"pageSize":100}',
                headers: {'Content-Type': 'application/json;charset=UTF-8'}
            }).done(function (json) {
                var list = json.data.dataList;
                if (list.length > 0) {
                    dataJson.data.dataList.push.apply(dataJson.data.dataList, json.data.dataList);
                } else {
                    loadFinished = true;
                }
            });
            if (loadFinished) {
                var totalPageSize = i - 1;
                showProcessMessage("----所有简历准备完成，共" + totalPageSize + "页。----");

                //会多执行一次，所有总页面需要-1
                window.postMessage({
                    'action': 'saveTotalLoadResumePageSize',
                    'pageSize': totalPageSize,
                    'currentOrgId': $user.loginPoint.orgId
                }, '*');
                break;
            } else {
                showProcessMessage("准备加载第" + i + "页简历");
                dataJson.data.total = dataJson.data.dataList.length;
                setTimeout(getResumeList5CallBack, siteSecurityPolicy.everyPageResumeLoadingHandleEventIntervalTime, dataJson);
            }
        }
    }

    function getResumeList5CallBack(json) {
        var downloadResumes = {};
        var data = json.data;
        var finishLength = 0;
        for (var i = 0; i < data.total; i++) {
            try {
                //取得投递岗位信息
                getPositionInfo5(data.dataList[i], (i + 1), json.pageNum).then(function (params) {
                    var resumeBaseInfo = params.resumeBaseInfo;
                    var jobInfo = params.jobInfo;
                    //简历名称
                    var key = jobInfo.applyPosition + '-' + resumeBaseInfo.userName + '-' + (resumeBaseInfo.name ? resumeBaseInfo.name : "");
                    var info = {
                        //简历ID
                        resumeId: resumeBaseInfo.id,
                        //姓名
                        name: resumeBaseInfo.userName,
                        //移动电话
                        mobile: resumeBaseInfo.phone,
                        //电子邮件
                        email: resumeBaseInfo.email,
                        //目前居住地
                        regionName: resumeBaseInfo.city ? (resumeBaseInfo.city.display ? resumeBaseInfo.city.display : resumeBaseInfo.city) : "",
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
                if (isIHR()) {
                    setTimeout(downloadResumeIhr, siteSecurityPolicy.beginDownloadResumeTime, downloadResumes, json.pageNum, json.loadNextPage);
                } else {
                    setTimeout(downloadResume5, siteSecurityPolicy.beginDownloadResumeTime, downloadResumes, json.pageNum);
                }
            }
        }, 1000);
    }

    //获取岗位详情
    function getPositionInfo5(resumeBaseInfo, index, pageNum) {
        var jobId = resumeBaseInfo.jobNumber;
        //获取缓存的岗位信息
        var jobInfos = JSON.parse(window.localStorage.getItem("zhaopin_jobInfo") || "{}") || {};
        if (jobInfos[jobId]) {
            return new Promise(function (resolve, reject) {
                asyncGetPositionInfo5(resolve, resumeBaseInfo, index, pageNum, jobInfos[jobId]);
            });
        }

        //ajax同步获取岗位信息
        return new Promise(function (resolve, reject) {
            setTimeout(asyncGetPositionInfo5, siteSecurityPolicy.searchApplyPositionInfoIntervalTime * index, resolve, resumeBaseInfo, index, pageNum);
        });
    }

    function asyncGetPositionInfo5(resolve, resumeBaseInfo, index, pageNum, jobInfo) {
        showLoadResumeProcessMessage("正在加载第" + pageNum + "页，第" + index + "条简历信息");
        //不是本地存在的数据，则ajax加载
        if (!jobInfo) {
            //投递岗位信息
            jobInfo = {
                releaseCityName: '',
                workArea: '',
                workAddress: '',
                jobId: resumeBaseInfo.jobNumber,
                applyPosition: isIHR() ? resumeBaseInfo.jobName : resumeBaseInfo.jobTitle
            };

            var iframe = document.createElement("iframe");
            iframe.style.display = "none";
            //岗位地址
            iframe.src = '//rd5.zhaopin.com/job/preview?jobNumber=' + jobInfo.jobId;
            document.body.appendChild(iframe);

            var interval = setInterval(function () {
                if (typeof iframe.contentWindow.$ == "function") {
                    clearInterval(interval);
                    //发布城市
                    jobInfo.releaseCityName = $.trim(iframe.contentWindow.$('.address-tip').text());
                    //工作地区
                    jobInfo.workArea = $.trim(iframe.contentWindow.$('.address-tip').text());
                    //投递岗位
                    jobInfo.applyPosition = $.trim(iframe.contentWindow.$('div.job-title > div > span').text());
                    //工作地址
                    jobInfo.workAddress = $.trim(iframe.contentWindow.$('div.job-address__wrapper > p > span').text());
                    //投递公司
                    jobInfo.applyCompany = $.trim(iframe.contentWindow.$('div.company-name').text());

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
            }, 1500);
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

    //简历下载 5.5版本
    function downloadResume5(resumesResult, pageNum) {
        if (getObjectLength(resumesResult) < 1) {
            showProcessMessage("无简历可下载，稍后请手动刷新");
            return;
        }
        var data = {fileType: '3', jobResumeIds: ''};
        $.each(resumesResult, function (index, item) {
            if (item && item.info) {
                data.jobResumeIds += item.info.resumeId + ","
            } else {
                console.warn("忽略错误的简历：" + item);
            }
        });
        showProcessMessage("开始下载第" + pageNum + "页简历");
        $.ajax({
            method: 'POST',
            url: "https://rd5.zhaopin.com/api/rd/resume/saveToLocal/startTask",
            data: JSON.stringify(data),
            headers: {'Content-Type': 'application/json;charset=UTF-8'}
        }).done(function (json) {
            if (json.code == 1 || json.code == 4) {
                showProcessMessage(json.message);
                return;
            }
            showProcessMessage("等待智联生第" + pageNum + "页简历");
            //验证智联文件是否准备完毕
            $.when(checkFileReady5(json.data)).done(function () {
                setTimeout(function () {
                    showProcessMessage("正在下载第" + pageNum + "页简历");
                    var filePath = localStorage.getItem(siteLoginAccount + json.data.key + "_zhaopin_file_path");
                    downloadFile(resumesResult, filePath);
                }, siteSecurityPolicy.beginDownloadFileIntervalTime);
            });
        });
    }

    /**
     * 检查文件是否可以下载 5.5版本
     *
     * @param url 简历参数JSON
     * @returns true 可以
     */
    function checkFileReady5(url) {
        var dtd = $.Deferred();
        //loadScript将异步加载一个js文件，所以返回值是一个Deffered对象
        var tasks = function () {
            $.ajax({
                method: 'POST',
                url: "https://rd5.zhaopin.com/api/rd/resume/saveToLocal/getFile",
                data: JSON.stringify(url),
                headers: {'Content-Type': 'application/json;charset=UTF-8'}
            }).done(function (result) {
                if (result.data.data.status == 1 && result.data.data.filePath) {
                    console.log("文件准备完毕：" + result.data.data.filePath);
                    localStorage.setItem(siteLoginAccount + url.key + "_zhaopin_file_path", result.data.data.filePath);
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

    function getResumeListIhr(pageNum) {
        //页码
        var pageNum = pageNum ? pageNum : 0;
        //每页条数
        var rowsCount = 30;
        //开始num
        var startNum = pageNum * rowsCount;

        var dataJson = {data: {dataList: [], total: 0}, pageNum: (pageNum + 1), loadNextPage: true};
        //请求参数
        var urlParam = "startNum=" + startNum + "&rowsCount=" + rowsCount + "&onlyLastWork=false&orderFlag=deal&countFlag=1&pageType=all&source=1;2;5&sort=time";
        $.ajax({
            method: 'POST',
            async: false, //设为false就是同步请求
            url: "//ihr.zhaopin.com/resumemanage/resumelistbykey.do?" + urlParam,
            dataType: "JSON",
            headers: {'Content-Type': 'application/json;charset=UTF-8'}
        }).done(function (json) {
            if (json.code == 1) {
                var list = json.data.deal.results;

                //判断是否在时间范围内
                for (var i = 0, len = list.length; i < len; i++) {
                    var data = list[i];
                    //简历投递时间
                    var time = moment(data.createTime);
                    var receiveTime = moment(time.format("YYYY/MM/DD"));
                    //如果投递时间超过设定时间，则忽略
                    if (!(receiveTime.isAfter(settingDate) || receiveTime.isSame(settingDate))) {
                        continue;
                    }
                    dataJson.data.dataList.push(data);
                }

                //数据长度小于每页预定长度则不再继续加载下一页数据
                if (dataJson.data.dataList.length < rowsCount) {
                    dataJson.loadNextPage = false;
                }

                dataJson.data.total = dataJson.data.dataList.length;

                showProcessMessage("已加载第" + dataJson.pageNum + "页简历");
                setTimeout(getResumeListIhrCallBack, 2000, dataJson);
            } else {
                showProcessMessage("加载第" + (pageNum + 1) + "页简历失败");
                setTimeout(getResumeListIhr, 1500, pageNum);
            }
        });
    }

    function getResumeListIhrCallBack(json) {
        getResumeList5CallBack(json);
    }

    //简历下载 IHR版本
    function downloadResumeIhr(resumesResult, pageNum, loadNextPage) {
        if (getObjectLength(resumesResult) < 1) {
            showProcessMessage("无简历可下载，稍后请手动刷新");
            return;
        }
        var jobResumeId = '';
        $.each(resumesResult, function (index, item) {
            if (item && item.info) {
                jobResumeId += item.info.resumeId + ","
            } else {
                console.warn("忽略错误的简历：" + item);
            }
        });
        showProcessMessage("开始下载第" + pageNum + "页简历");
        $.ajax({
            method: 'GET',
            url: "//ihr.zhaopin.com/api/resume/saveLocal.do?fileType=3&jobResumeId=" + jobResumeId,
            dataType: 'json'
        }).done(function (json) {
            if (!!json.code && json.code == 200) {
                var key = json.data;
                showProcessMessage("等待智联生第" + pageNum + "页简历");
                //验证智联文件是否准备完毕
                $.when(checkFileReadyIhr(key)).done(function () {
                    setTimeout(function () {
                        showProcessMessage("正在下载第" + pageNum + "页简历");
                        var filePath = localStorage.getItem(siteLoginAccount + key + "_zhaopin_file_path");
                        //下载文件
                        downloadFile(resumesResult, filePath);
                        //存在下一页数据，则继续加载下一页数据(pageNum从0开始，此处已经加过1)
                        if (loadNextPage) {
                            setTimeout(getResumeListIhr, 1500, pageNum);
                        } else {
                            showLoadResumeProcessMessage("到" + settingDate + "为止简历处理完成。");
                        }
                    }, 1000);
                });
            } else {
                showProcessMessage(json.message);
            }
        });
    }

    /**
     * 检查文件是否可以下载 IHR版本
     *
     * @param key
     * @returns true 可以
     */
    function checkFileReadyIhr(key) {
        var dtd = $.Deferred();
        //loadScript将异步加载一个js文件，所以返回值是一个Deffered对象
        var tasks = function () {
            $.ajax({
                method: 'GET',
                url: "//ihr.zhaopin.com/api/resume/getFile.do?key=" + key,
                dataType: 'json'
            }).done(function (result) {
                if (result.data.status == 1) {
                    console.log("文件准备完毕：" + result.data.filePath);
                    localStorage.setItem(siteLoginAccount + key + "_zhaopin_file_path", result.data.filePath);
                    return dtd.resolve();
                } else {
                    setTimeout(tasks, 5000);
                }
                return dtd.promise();
            });
        };
        setTimeout(tasks, 5000);
        //返回自定义的dtd对象，才能保证返回值的done回调在load事件完成后执行
        return dtd.promise();
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

    /**
     * 是否为ihr版本
     * @returns {boolean}
     */
    function isIHR() {
        return location.href.indexOf("ihr.zhaopin.com") > -1;
    }

    //显示处理进度消息(追加显示)
    function showProcessMessage(msg) {
        $('#consoleDiv').append("<h1 style='color: green;align-content: center'>" + msg + "</h1>");
        $('#consoleDiv').append("<br>");
    }

    //显示处理进度消息(追加显示)
    function showLoadResumeProcessMessage(msg) {
        if ($('#consoleDiv #resumeProcessH1').length > 0) {
            $('#consoleDiv #resumeProcessH1').text(msg);
        } else {
            $('#consoleDiv').append("<h1 style='color: red;align-content: center;font-weight: bold' id='resumeProcessH1'>" + msg + "</h1>");
            $('#consoleDiv').append("<br>");
        }
    }

    //删除处理进度消息（从最后行消息开始删除）
    function removeMessage() {
        $('#consoleDiv').find('>h1:last').remove();
        $('#consoleDiv').find('>br:last').remove();
    }
})(jQuery);
