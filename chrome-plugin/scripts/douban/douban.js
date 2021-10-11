(function ($) {
    'use strict';
    if (location.href.match(/publish/)) {
        location.href = 'https://m.douban.com/group/#!/topics/mine';
        return;
    }
    if (location.href != 'https://m.douban.com/group/#!/topics/mine') {
        return;
    }
    const sleep = time => new Promise(resolve => setTimeout(resolve, time))
    //显示处理进度消息(追加显示)
    let showProcessMessage = (msg) => {
        $('#consoleDiv').find('>h1:last').remove();
        $('#consoleDiv').append("<h1 style='color: green;align-content: center;margin-top: 0'>" + msg + "</h1>");
    };
    //取得所有发起的帖子
    let getAllTopic = (userId, start = 0, topicResult = []) => {
        showProcessMessage(`开始获取待回复帖子 开始:${start}`);
        let dtd = $.Deferred();
        let size = 100;
        let requestData = {
            start: start,
            count: size,
            ck: getCookie("ck"),
            for_mobile: 1
        };
        $.ajax({
            url: `https://m.douban.com/rexxar/api/v2/group/user/posted_topics`,
            method: 'GET',
            data: requestData
        }).done(function (response) {
            let topics = response['topics'];
            if (topics.length == 0) {
                showProcessMessage(`取得所有待回复帖子结束:${topicResult.length}份待回复`);
                return dtd.resolve(topicResult);
            }
            for (let topic of topics) {
                if (moment().add(-$(".days").val(), 'days').isSame(moment(topic['create_time']), 'days')) {
                    topicResult.push(topic);
                }
            }
            return sleep(500).then(() => {
                $.when(getAllTopic(userId, start + size, topicResult)).then((topicResult) => {
                    if (topicResult.length > $(".number").val()) {
                        topicResult = getRandomArrayElements(topicResult, $(".number").val());
                    }
                    return dtd.resolve(topicResult);
                })
            });
        });
        return dtd.promise();
    };

    let getRandomArrayElements = (arr, count) => {
        let shuffled = arr.slice(0), i = arr.length, min = i - count, temp, index;
        while (i-- > min) {
            index = Math.floor((i + 1) * Math.random());
            temp = shuffled[index];
            shuffled[index] = shuffled[i];
            shuffled[i] = temp;
        }
        return shuffled.slice(min);
    };

    let getCookie = (cname) => {
        let name = cname + "=";
        let ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i].trim();
            if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
        }
        return "";
    };
    let replyTopic = (topic) => {
        let dtd = $.Deferred();
        let deployTopic = topic[0];
        let formData = {
            tid: deployTopic['id'],
            text: $(".replyContent").val(),
            ref_cid: '',
            ck: getCookie("ck")
        };
        $.ajax({
            url: `https://m.douban.com/j/add_comment/`,
            method: 'POST',
            headers: {Accept: 'application/json, text/javascript, */*; q=0.01', ContentType: 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest'},
            data: formData
        }).done(() => {
            sleep(3000).then(() => {
                if (topic.length == 0) {
                    return dtd.resolve(topic);
                } else {
                    showProcessMessage(`回复帖子完毕${deployTopic['title']} 还有${topic.length - 1}份${$(".days").val()}天前发表的帖子需要回复.`);
                    return replyTopic(topic.splice(1));
                }
            });
        });
        return dtd.promise();
    };
    $(".topic-list-section")
        .before('<input class="replyContent" placeholder="请输入回复自动回复内容" value="具体情况请加微信,注明豆瓣求职~~~" style="margin-left: 10px;' +
            '    margin-top: 10px;' +
            '    width: 300px;' +
            '    height: 30px;' +
            '    border-radius: 20px">')
        .before('<a class="replyButton" style="' +
            '    margin-left: 10px;' +
            '    background: red;' +
            '    color: white;' +
            '    border-radius: 3px;' +
            '    font-size: 14px;' +
            '    padding: 5px 10px;' +
            '">自动顶</a>')
        .before('<input type="text" class="days" style="margin-left: 10px; margin-top: 10px;width: 30px;height: 30px;border-radius: 20px" value="3"/>天前<input type="text" class="number" ' +
            'style="margin-left: 10px;margin-top: 10px;width: 30px;height: 30px;border-radius: 20px" value="30"/>份帖子')
        .before('<div id="consoleDiv"></div>');
    $(".replyButton").on('click', () => {
        $(".replyButton").text("自动回复ing").attr("disabled", true);
        $.when(getAllTopic()).then((topic) => {
            showProcessMessage("开始自动回复帖子");
            showProcessMessage("取得所有Topic开始");
            showProcessMessage(`共有${topic.length}份${$(".days").val()}天前发表的帖子需要回复.`);
            if (topic.length > 0) {
                $.when(replyTopic(topic)).then(() => {
                    $(".replyButton").text("自动回复").attr("disabled", false);
                    showProcessMessage("自动回复结束.");
                })
            }
        });
    });

}(jQuery, moment));