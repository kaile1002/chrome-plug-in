(function ($) {
    'use strict';
    //显示处理进度消息(追加显示)
    let showProcessMessage = (msg) => {
        $('#consoleDiv').append("<h1 style='color: green;align-content: center;margin-top: 5px'>" + msg + "</h1>");
    };
    //删除处理进度消息（从最后行消息开始删除）
    let removeMessage = () => {
        $('#consoleDiv').find('>h1:last').remove();
        $('#consoleDiv').find('>br:last').remove();
    };
    //检查职位是否可发布
    let checkPosition = (checkJobInfo) => {
        let dtd = $.Deferred();
        $.ajax({
            url: 'https://ihr.zhaopin.com/api/job/CheckRepeatJob.do',
            method: 'POST',
            headers: {'X-Requested-With': 'XMLHttpRequest'},
            data: checkJobInfo,
        }).done(function (deployResonse) {
            return dtd.resolve();
        });
        return dtd.promise();
    };
    //发布职位
    let deployPosition = (deployInfo) => {
        let dtd = $.Deferred();
        $.ajax({
            url: 'https://ihr.zhaopin.com/api/job/jobaddpost.do?type=1',
            method: 'POST',
            headers: {'X-Requested-With': 'XMLHttpRequest'},
            data: deployInfo,
        }).done(function (deployResponse) {
            showProcessMessage(`${deployInfo.jobtitle}发布完毕${deployResponse.code}:${deployResponse.message} 职位编号:${deployResponse.data.jobnumber}`,);
            return dtd.resolve(deployResponse);
        });
        return dtd.promise();
    };
    //复制职位并发布
    let deploy = (position) => {
        let dtd = $.Deferred();
        $.ajax({url: "https://ihr.zhaopin.com/job/jobedittojson.do?jobnumber=" + position.jobNumber}).done(function (response) {
            let editInfo = response.data;
            const element = document.createElement('div');
            element.innerHTML = editInfo.jobdescription;
            let deployInfo = {
                'groupid': 0,
                'jobpostionnumber': '',
                'currentdate': editInfo.currentdate,
                'filterid': editInfo.filterid,
                'jobTemplates': '',
                'jobtitle': updatePositionTitle(editInfo.jobtitle, editInfo.benefit),
                'positionnature': editInfo.positionnature,
                'jobTypeMain': editInfo.jobTypeMain,
                'subJobTypeMain': editInfo.subJobTypeMain,
                'provinceid': editInfo.provinceid,
                'cityid': editInfo.cityid,
                'cqid': editInfo.cqid,
                'workplace': editInfo.workplace,
                'startdate': moment().format("YYYY-MM-DD"),
                'enddate': editInfo.enddate,
                'monthsalary': editInfo.monthsalary,
                'quantity': editInfo.quantity,
                'mineducationlevel': editInfo.mineducationlevel,
                'minyearsval': editInfo.minyearsval,
                'minyears': editInfo.minyears,
                'jobdescription': element.innerText + 1,
                'benefit': editInfo.benefit,
                'jobfocus': editInfo.jobfocus,
                'emaillist': editInfo.emaillist,
                'departmentid': editInfo.departmentid,
                'notifyothers': editInfo.notifyothers,
                'latitude': editInfo.latitude,
                'longitude': editInfo.longitude,
                'mulJobcityDto[0].cityId': 538,
                'mulJobcityDto[0].cqId': 2021,
                'mulJobcityDto[0].jobnumber': '',
                'mulJobcityDto[0].jobAddress': editInfo.workplace,
                'mulJobcityDto[0].latitude': editInfo.latitude,
                'mulJobcityDto[0].longitude': editInfo.longitude,
                'seqnumber': editInfo.seqnumber,
                'applicationmethod': editInfo.applicationmethod
            };
            let checkJobInfo = {
                jobTitle: deployInfo.jobtitle,
                jobDescribe: deployInfo.jobdescription,
                'jobCityList[0].cityId': deployInfo['mulJobcityDto[0].cityId'],
                'jobCityList[0].regionId': deployInfo['mulJobcityDto[0].cqId'],
                'jobCityList[0].jobnumber': '',
                'jobCityList[0].workAddress': deployInfo['mulJobcityDto[0].jobAddress'],
                'jobCityList[0].latitude': deployInfo['mulJobcityDto[0].latitude'],
                'jobCityList[0].longitude': deployInfo['mulJobcityDto[0].longitude']
            };
            $.when(checkPosition(checkJobInfo)).then(() => {
                $.when(deployPosition(deployInfo)).then((deployResponse) => {
                    return dtd.resolve(deployResponse);
                });
            });
        });
        return dtd.promise();

    };
    //按顺序阻塞发布职位
    let deployPositions = (positions, index) => {
        let dtd = $.Deferred();
        $.when(deploy(positions[index])).then(function (deployResponse) {
            if (deployResponse.code != 200) {
                showProcessMessage(`发布职位异常结束 发布返回码:${deployResponse.code} 发布返回信息:${deployResponse.message}`);
                return dtd.resolve();
            }
            if (index + 1 < positions.length) {
                return deployPositions(positions, index + 1);
            } else {
                return dtd.resolve();
            }
        });
        return dtd.promise();
    };
    //取得在线职位列表
    let getPositionList = () => {
        let dtd = $.Deferred();
        showProcessMessage(`取得在线职位列表开始`);
        $.ajax({
            url: 'https://rdapi.zhaopin.com/rd/job/list?jobState=publish&page=1&pageSize=500&follow=false',
            method: 'GET',
        }).done(function (response) {
            let data = response.data;
            showProcessMessage(`取得在线职位数量:${data.dataList.length}`);
            return dtd.resolve(data.dataList)
        });
        return dtd.promise();
    };
    //铺满职位
    let autoDeployPosition = () => {
        let dtd = $.Deferred();
        showProcessMessage(`取得可发布职位数开始`);
        $.when(getMaxDeployTimes()).then((maxDeployTimes) => {
            showProcessMessage(`取得可发布职位数完成`);
            showProcessMessage(`取得在线职位列表`);
            if (maxDeployTimes == 0) {
                showProcessMessage(`职位数量已满,无需发布职位`);
                return dtd.resolve();
            }
            $.when(getPositionList()).then((positionList) => {
                showProcessMessage(`取得在线职位列表完成`);
                let positionObject = {};
                for (let position of positionList) {
                    if (!positionObject[position.jobType]) {
                        positionObject[position.jobType] = [];
                    }
                    positionObject[position.jobType].push(position);
                }
                let minCount = 9999;
                let lastMinCount = 9999;
                let willDeployPosition = [];
                let willDeployPositionType = '';
                for (let jobType in positionObject) {
                    showProcessMessage(`所有在线职位中[${jobType}]${positionObject[jobType].length}份`);
                    if (minCount > positionObject[jobType].length) {
                        minCount = positionObject[jobType].length;
                        lastMinCount = minCount;
                        willDeployPosition = positionObject[jobType];
                        willDeployPositionType = jobType;
                    }
                }
                showProcessMessage(`${willDeployPositionType}职位发布数最少.${willDeployPosition.length}份`);
                $.when(deployPositions(willDeployPosition, 0)).then(() => {
                    if (willDeployPosition.length < maxDeployTimes) {
                        return autoDeployPosition();
                    } else {
                        showProcessMessage("所有职位已发布完毕");
                        return dtd.resolve();
                    }
                })
            })
        });
        return dtd.promise();
    };
    //随机设置标题
    let updatePositionTitle = (title, welfare) => {
        title = title.replace(/\/\d+|\+|-|\/|、|，|包吃住|包食宿|六险一金|（|\(|\)|）|\d+日带薪年假|接收应届生|接受实习生应届生|国外旅游|月薪\d+千|月薪\d+k|月薪\d+K|薪资\d+|均薪\d+|底薪\d+|月薪\d+|月均\d+|以上|\d+K|\d+k|住贴|欢迎应届生实习生|欢迎应届生/g, ' ')
        if (title.indexOf(' ') > -1) {
            title = title.split(' ')[0];
            return updatePositionTitle(title, welfare)
        }
        let welfareObj = {
            '10000': '五险一金', '10001': '年底双薪', '10002': '绩效奖金', '10003': '年终分红', '10004': '股票期权', '10005': '加班补助', '10006': '全勤奖', '10007': '包吃',
            '10008': '包住', '10009': '交通补助', '10010': '餐补', '10011': '房补', '10012': '通讯补贴', '10013': '采暖补贴', '10014': '带薪年假',
            '10015': '弹性工作', '10016': '补充医疗保险', '10017': '定期体检', '10018': '免费班车', '10019': '员工旅游', '10020': '高温补贴', '10021': '节日补贴',
            '20000': '接受应届生',
        };
        //25+%接受应届生
        welfare = welfare + ',20000,20000,20000,20000,20000';
        for (let key in welfareObj) {
            title = title.replace(welfareObj[key], '')
        }
        title = title.trim();
        let welfareArray = welfare.split(',');
        let welfare1 = welfareObj[welfareArray[Math.floor(Math.random() * welfareArray.length)]]
        let welfare2 = welfareObj[welfareArray[Math.floor(Math.random() * welfareArray.length)]]
        if (welfare1 === welfare2 && welfare1) {
            title = title.trim() + ' ' + welfare1
        } else if (!welfare1 || !welfare2) {
            return updatePositionTitle(title, welfare)
        } else {
            title = title.trim() + ' ' + welfare1 + '+' + welfare2
        }
        title = title.replace('  ', ' ');
        return title
    };
    //最大可发布数量
    let getMaxDeployTimes = () => {
        let dtd = $.Deferred();
        showProcessMessage(`开始取得可发布职位数`);
        $.ajax('https://rdapi.zhaopin.com/rd/vip/basic').done(function (basic) {
            $.ajax('https://rdapi.zhaopin.com/rd/job/summary').done(function (summary) {
                showProcessMessage(`当前会员等级:${basic.data.name} 每日可发布-已发布职位数-今日可发布职位次数:${basic.data.dayLimit}-${summary.data.publishCount}-${summary.data.mayPublishCount}`);
                let maxTimes = basic.data.dayLimit - summary.data.publishCount;
                if (maxTimes > summary.data.mayPublishCount) {
                    maxTimes = summary.data.mayPublishCount;
                }
                showProcessMessage(`自动发布准备发布职位数:${maxTimes}`);
                showProcessMessage(`可发布职位数:${maxTimes}`);
                return dtd.resolve(maxTimes);
            });
        });
        return dtd.promise();
    };
    //设置日志div
    let consoleDiv = '<div id="consoleDiv"></div>';
    $('body').first().prepend(consoleDiv);
    //是否登录
    let isLogin = $("a:contains(安全退出)").length != 0 || $('a:contains(退出)').length != 0 || $("button:contains(退出登录)").length != 0;
    //未登录直接返回
    if (!isLogin) {
        return;
    }
    let isPositionManageUrl = location.href == 'https://rd5.zhaopin.com/job/manage';
    //未非管理职位页面直接返回
    if (!isPositionManageUrl) {
        return;
    }

    $('.k-tabs__slot:first').before(
        '<a class="button-new k-button is-dark is-small" target="_blank" style="margin-right: 30px;">自动发布职位</a>')
    ;
    $(".is-dark").on('click', function () {
        $(".is-dark").text("发布ing");
        $.when(autoDeployPosition()).then(() => {
            $(".is-dark").text("自动发布职位");
        });
    });
}(jQuery, moment));
