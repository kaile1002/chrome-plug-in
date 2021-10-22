(function ($, _, moment, _jd) {
        'use strict';

        var BossUtils = function () {
            var _this = this;
            //是否在运行
            this.working = false;
            //已打招呼人数
            this.finishNumber = 0;
            this.totalFinishNumber = 0;

            this.pageIndex = 1;
            //最大能打招呼数
            this.maxNumber = 100;

            //获取localstorage中的插件设置
            this.getJdStorage = function () {
                return JSON.parse(window.localStorage.getItem('jdStorage')) || {};
            };

            //更新保存localstorage中的插件设置
            this.saveJdStorage = function (jdStorage) {
                window.localStorage.setItem('jdStorage', JSON.stringify(jdStorage));
            };

            //获取UTIL的工作条
            this.getToolDiv = function () {
                var toolDiv = $('#jd_toolDiv');
                if (!toolDiv.length) {
                    var container = $('<div id="jd_container" class="jd_container" style="-webkit-user-select: none;user-select: none;color:#fff;position: fixed;left:0;right:0;bottom:0;z-index: 2000;width: 800px;text-align:center;margin:auto;"></div>');
                    var subContainer = $('<div id="jd_subContainer" style="width:100%;background-color:#4582A7;margin:auto">' +
                        '                    <h3 style="margin:auto;border-bottom: solid 1px #e3e3e3;padding: 5px 0;">自动打招呼<span></span></h3>' +
                        '                    <label id="jd_subContainer_close" style="position: absolute; top: 7px;right: 5px; width: 20px;cursor: pointer;">X</label>' +
                        '                    <div id="jd_toolDiv" style="padding: 0 10px;display:none"></div>' +
                        '                 </div>');
                    subContainer.appendTo(container);
                    container.appendTo($('body'));
                    toolDiv = $('#jd_toolDiv');
                    //鼠标经过
                    container.hover(function () {
                        subContainer.css({opacity: 1});
                        if (toolDiv.is(':hidden')) {
                            subContainer.find('h3>span').text('▲');
                        } else {
                            subContainer.find('h3>span').text('▼');
                        }
                    }, function () {
                        subContainer.find('h3>span').text('');
                    });
                    container.find('h3').click(function () {
                        toolDiv.slideToggle();
                    });
                    $("#jd_subContainer_close").click(function () {
                        if (confirm("确定要关闭吗？")) {
                            $('#jd_container').remove();
                        }
                    });
                }
                return toolDiv;
            }

            this.appendMessage = function (msg) {
                var container = $("#jdMessageContainer");
                container.append("<p>" + msg + "</p>").scrollTop(container.prop("scrollHeight"));
            }

            //构建工具类
            this.runTool = function () {
                var textStyle = "color: #fff;font-size: 12px;height:30px;";
                var formControlStyle = "width: 146px;text-indent: 5px; font-size: 12px; height: 30px; padding: 0; border-radius: 0; line-height: 1.5; color: #555; background-image: none; border: 0px solid #ccc; display: block;";
                var btnStyle = "width: 100px;background-color: #e96a59;margin: 0 30px 0 0;height: 30px;padding: 2px 4px;line-height: 22px;border: 0;border-radius: 3px;font-size: 12px;";
                var table = '<table style="width:100%;margin: 0;text-align: left;border-collapse:collapse;padding: 0 5px">' +
                    '           <tr>' +
                    '              <td style="' + textStyle + 'width: 20%"><label>*</label>性别</td>' +
                    '              <td style="' + textStyle + 'width: 20%"><label>*</label>年龄（起）</td>' +
                    '              <td style="' + textStyle + 'width: 20%"><label>*</label>年龄（止）</td>' +
                    '              <td style="' + textStyle + 'width: 40%">执行消息</td>' +
                    '           </tr>' +
                    '           <tr>' +
                    '              <td>' +
                    '                  <select id="jdToolSex" placeholder="请选择性别" style="' + formControlStyle + 'text-indent: 2px;">' +
                    '                      <option value="-1">全部</option>' +
                    '                      <option value="1">男</option>' +
                    '                      <option value="0">女</option>' +
                    '                  </select>' +
                    '              </td>' +
                    '              <td>' +
                    '                 <input type="number" id="jdToolAgeFrom" placeholder="请输入年龄（起）" style="' + formControlStyle + '" min="16" max="100"/>' +
                    '              </td>' +
                    '              <td>' +
                    '                 <input type="number" id="jdToolAgeTo" placeholder="请输入年龄（止）" style="' + formControlStyle + '" min="16" max="100"/>' +
                    '              </td>' +
                    '              <td rowspan="9">' +
                    '                  <div id="jdMessageContainer" style="height: 262px;background-color: #f3f3f3;overflow-y: auto;font-size: 12px;color: #333;padding: 0 10px;width: 290px;">' +
                    '                     <p>未执行</p>' +
                    '                  </div>' +
                    '              </td>' +
                    '           </tr>' +
                    '           <tr>' +
                    '              <td colspan="2" style="' + textStyle + '" title="符合条件关键字（多个关键字使用逗号隔开）">符合条件关键字(多个使用逗号隔开)</td>' +
                    '              <td style="' + textStyle + '" title="符合条件关键字对应的工作经验时长（大于等于多少个月）">工作经验(大于等于月)</td>' +
                    '           </tr>' +
                    '           <tr>' +
                    '              <td colspan="2">' +
                    '                  <input type="text" id="jdToolKeyword" placeholder="如：审核,客服" style="' + formControlStyle + 'width: 302px;">' +
                    '               </td>' +
                    '              <td><input type="number" id="jdToolExperienceTime"placeholder="如：6" style="' + formControlStyle + '" min="0"></td>' +
                    '           </tr>' +
                    '           <tr>' +
                    '              <td colspan="2" style="' + textStyle + '">应届生</td>' +
                    '              <td colspan="1" style="' + textStyle + '" title="应届生求职期望(多个使用逗号隔开)">求职期望(逗号隔开)</td>' +
                    '           </tr>' +
                    '           <tr>' +
                    '              <td colspan="2">' +
                    '                  <select id="jdToolGraduate" placeholder="请选择应届生" style="width:302px;text-indent: 2px;line-height:0" multiple="multiple">' +
                    '                      <option value="24">24届</option>' +
                    '                      <option value="23">23届</option>' +
                    '                      <option value="22">22届</option>' +
                    '                      <option value="21">21届</option>' +
                    '                      <option value="20">20届</option>' +
                    '                      <option value="19">19届</option>' +
                    '                      <option value="18">18届</option>' +
                    '                      <option value="17">17届</option>' +
                    '                      <option value="16">16届</option>' +
                    '                      <option value="15">15届</option>' +
                    '                      <option value="14">14届</option>' +
                    '                  </select>' +
                    '              </td>' +
                    '              <td><input type="text" id="jdToolGraduateKeyWord" placeholder="如：行政专员" style="' + formControlStyle + 'width: 146px;">' +
                    '           </tr>' +
                    '           <tr>' +
                    '              <td colspan="2" style="' + textStyle + '">忽略关键字(多个使用逗号隔开)</td>' +
                    '              <td colspan="2" style="' + textStyle + '">不忽略最小月</td>' +
                    '           </tr>' +
                    '           <tr>' +
                    '              <td colspan="2"><input type="text" id="jdToolSensitiveWord" placeholder="如：今日头条,字节跳动,抖音" style="' + formControlStyle + 'width: 302px;">' +
                    '              <td><input type="number" id="jdToolIgnoreSensitiveWordMonth" placeholder="如：6，默认不填写" style="' + formControlStyle + '" min="0"></td>' +
                    '           </tr>' +
                    '           <tr>' +
                    '              <td style="' + textStyle + '"><label>*</label>同事沟通过是否打招呼</td>' +
                    '              <td style="' + textStyle + '" title="一次打xx个招呼才会停止"><label>*</label>打招呼数</td>' +
                    '              <td style="' + textStyle + '"><label>*</label>打招呼频率</td>' +
                    '           </tr>' +
                    '           <tr>' +
                    '              <td>' +
                    '                  <select id="jdToolCooperate" style="' + formControlStyle + 'text-indent: 2px;">' +
                    '                      <option value="1">是</option>' +
                    '                      <option value="0">否</option>' +
                    '                  </select>' +
                    '              </td>' +
                    '              <td>' +
                    '                  <input type="number" id="jdToolMaxNumber" placeholder="如：6" style="' + formControlStyle + 'width: 147px;" min="1" max="100"></td>' +
                    '              </td>' +
                    '              <td>' +
                    '                  <select id="jdToolFrequency" style="' + formControlStyle + 'text-indent: 2px;">' +
                    '                      <option value="2">2秒</option>' +
                    '                      <option value="3">3秒</option>' +
                    '                      <option value="4">4秒</option>' +
                    '                      <option value="5">5秒</option>' +
                    '                      <option value="6">6秒</option>' +
                    '                      <option value="7">7秒</option>' +
                    '                      <option value="8">8秒</option>' +
                    '                      <option value="9">9秒</option>' +
                    '                  </select>' +
                    '              </td>' +
                    '           </tr>' +
                    '           <tr>' +
                    '             <td colspan="4" style="padding:10px 0;text-align: right;">' +
                    '                <input id="jdToolCopyBtn" type="button" value="复制消息" class="btn" style="' + btnStyle + ';background-color: #5dd5c8;"/>' +
                    '                <input id="jdToolBtn" type="button" value="开始打招呼" class="btn" style="' + btnStyle + '"/>' +
                    '             </td>' +
                    '          </tr>' +
                    '       </table>';
                var toolDiv = _this.getToolDiv();
                toolDiv.empty();
                $(table).appendTo(toolDiv);

                //初始化应届生下来框为select2，并处理相关冲突的样式
                $('#jdToolGraduate').select2().next().css({"lineHeight": "10px"});
                $("#jdToolGraduate").on("select2:open", function (e) {
                    $("span.select2-container.select2-container--default.select2-container--open").css({
                        "z-index": "999999",
                        "font-size": "12px",
                        "line-height": "initial"
                    });
                });

                var jdStorage = _this.getJdStorage();
                //填充存储的条件值
                if (jdStorage.jdToolSex) {
                    $("#jdToolSex").val(jdStorage.jdToolSex);
                }
                if (jdStorage.jdToolAgeFrom) {
                    $("#jdToolAgeFrom").val(jdStorage.jdToolAgeFrom);
                }
                if (jdStorage.jdToolAgeTo) {
                    $("#jdToolAgeTo").val(jdStorage.jdToolAgeTo);
                }
                if (jdStorage.jdToolKeyword) {
                    $("#jdToolKeyword").val(jdStorage.jdToolKeyword);
                }
                if (jdStorage.jdToolExperienceTime) {
                    $("#jdToolExperienceTime").val(jdStorage.jdToolExperienceTime);
                }

                if (jdStorage.jdToolSensitiveWord) {
                    $("#jdToolSensitiveWord").val(jdStorage.jdToolSensitiveWord);
                }
                if (jdStorage.jdToolIgnoreSensitiveWordMonth) {
                    $("#jdToolIgnoreSensitiveWordMonth").val(jdStorage.jdToolIgnoreSensitiveWordMonth);
                }
                if (jdStorage.jdToolGraduate) {
                    $("#jdToolGraduate").val(jdStorage.jdToolGraduate.split(",")).trigger("change");
                }
                if (jdStorage.jdToolGraduateKeyWord) {
                    $("#jdToolGraduateKeyWord").val(jdStorage.jdToolGraduateKeyWord);
                }

                if (jdStorage.jdToolCooperate) {
                    $("#jdToolCooperate").val(jdStorage.jdToolCooperate);
                }
                if (jdStorage.jdToolMaxNumber) {
                    $("#jdToolMaxNumber").val(jdStorage.jdToolMaxNumber);
                }
                if (jdStorage.jdToolFrequency) {
                    $("#jdToolFrequency").val(jdStorage.jdToolFrequency);
                }

                //按钮事件
                $('#jdToolBtn').unbind('click').on('click', function () {
                    _this.triggerWorkingStatus();
                });

                var clipboard = new ClipboardJS("#jdToolCopyBtn", {
                    text: function () {
                        var content = '';
                        $("#jdMessageContainer p").each(function () {
                            content += $(this).text() + "\r\n"
                        });
                        return content;
                    }
                });
                clipboard.on('success', function (e) {
                    alert("复制成功，去粘贴看看吧！");
                });
                clipboard.on('error', function (e) {
                    alert("复制失败！请手动复制");
                });
            }

            //触发更新工作条状态
            this.triggerWorkingStatus = function (trigger) {
                if (_this.working) {
                    _this.stop();
                } else {
                    //校验条件
                    var jdStorage = _this.getJdStorage();
                    jdStorage.jdToolSex = $('#jdToolSex').val();
                    jdStorage.jdToolAgeFrom = $('#jdToolAgeFrom').val();
                    jdStorage.jdToolAgeTo = $('#jdToolAgeTo').val();
                    jdStorage.jdToolKeyword = $('#jdToolKeyword').val();
                    jdStorage.jdToolExperienceTime = $('#jdToolExperienceTime').val();
                    jdStorage.jdToolSensitiveWord = $('#jdToolSensitiveWord').val();
                    jdStorage.jdToolIgnoreSensitiveWordMonth = $('#jdToolIgnoreSensitiveWordMonth').val();
                    jdStorage.jdToolGraduate = $("#jdToolGraduate").val() ? $("#jdToolGraduate").val().join(",") : "";
                    jdStorage.jdToolGraduateKeyWord = $('#jdToolGraduateKeyWord').val();
                    jdStorage.jdToolCooperate = $('#jdToolCooperate').val();
                    jdStorage.jdToolMaxNumber = $('#jdToolMaxNumber').val();
                    jdStorage.jdToolFrequency = $('#jdToolFrequency').val();

                    //关键字和应届生不能同时为空
                    if (jdStorage.jdToolKeyword == "" && jdStorage.jdToolGraduate == "") {
                        alert("请完善插件配置信息：符合条件关键字和应届生不能同时为空。");
                        _this.stop();
                        return;
                    }

                    if (jdStorage.jdToolKeyword != "" && jdStorage.jdToolExperienceTime == "") {
                        alert("请完善插件配置信息：存在符合条件关键字时，工作经验月份必填。");
                        _this.stop();
                        return;
                    }

                    if (jdStorage.jdToolSex != "" && jdStorage.jdToolAgeFrom != "" && jdStorage.jdToolAgeTo != "" && jdStorage.jdToolMaxNumber != "" && jdStorage.jdToolCooperate != "" && jdStorage.jdToolFrequency) {
                        _this.working = true;
                        _this.pageIndex = 1;
                        $('#jdToolBtn').val('停止打招呼');
                        _this.saveJdStorage(jdStorage);
                        _this.appendMessage("开始自动打招呼");
                        _this.sendExecuteLogData();
                        _this.finishNumber = 0;
                        _this.startExecute();
                    } else {
                        alert("请完善插件配置信息。");
                        _this.stop();
                    }
                }
            }

            this.startExecute = function () {
                if (!_this.working) {
                    _this.stop();
                    return;
                }

                if (!_this.validateUrl()) {
                    _this.appendMessage("请转到“推荐牛人”页面在操作。");
                    _this.stop();
                    return;
                }

                if (_this.totalFinishNumber == _this.maxNumber) {
                    _this.appendMessage("已打满" + _this.maxNumber + "个招呼。");
                    _this.stop();
                    return;
                }
                if (_this.finishNumber - _this.getJdStorage().jdToolMaxNumber >= 0) {
                    _this.appendMessage("已打完当前设置招呼数（" + _this.getJdStorage().jdToolMaxNumber + "）。");
                    _this.stop();
                    return;
                }
                $.when(_this.getRecommendGeekList()).done(function () {
                    //页面加一
                    _this.pageIndex++;
                    //加载下一页数据
                    setTimeout(function () {
                        _this.startExecute();
                    }, 5000);
                });
            }

            this.getRecommendGeekList = function () {
                //分类
                var status = _this.getQueryVariable("status");
                var refresh = new Date().getTime();
                var source = _this.getQueryVariable("source");
                //职位ID
                var jobid = _this.getQueryVariable("jobid");

                var salary, experience, degree, intention;
                _this.syncFrameWindow().document.querySelectorAll("div.recommend-filter div.novip dt").forEach(function (el) {
                    var $el = $(el);
                    //经验要求
                    if ($el.html().indexOf("经验要求") > -1) {
                        experience = $el.find("+dd a.cur").map(function () {
                            return $(this).data("value");
                        }).get().join(",") || "0";
                    }
                    //学历要求
                    else if ($el.html().indexOf("学历要求") > -1) {
                        degree = $el.find("+dd a.cur").map(function () {
                            return $(this).data("value");
                        }).get().join(",") || "0";
                    }
                    //薪资待遇
                    else if ($el.html().indexOf("薪资待遇") > -1) {
                        salary = $el.find("+dd a.cur").data("value") || "0";
                    }
                    //求职意向
                    else if ($el.html().indexOf("求职意向") > -1) {
                        intention = $el.find("+dd a.cur").map(function () {
                            return $(this).data("value");
                        }).get().join(",") || "0";
                    }
                });
                /*//薪水
                var salary = $(_this.syncFrameWindow().document.querySelectorAll("a[ka ^='recommend-salary-'].cur")).data("value") || "0";
                //经验
                var experience = $(_this.syncFrameWindow().document.querySelectorAll("a[ka ^='recommend-experience-'].cur")).map(function () {
                    return $(this).data("value");
                }).get().join(",") || "0";
                //学历
                var degree = $(_this.syncFrameWindow().document.querySelectorAll("a[ka ^='recommend-degree-'].cur")).map(function () {
                    return $(this).data("value");
                }).get().join(",") || "0";
                //求职意向
                var intention = $(_this.syncFrameWindow().document.querySelectorAll("a[ka ^='recommend-intention-'].cur")).map(function () {
                    return $(this).data("value");
                }).get().join(",") || "0";*/

                var params = "&cityCode=0&districtCode=0&businessId=0&gender=-1&activation=-1&recentNotView=-1&switchJobFrequency=-1&age=16,-1&school=-1&exchangeResumeWithColleague=0&major=0";
                params = "?jobid=" + jobid + "&status=" + status + "&refresh=" + refresh + "&source=" + source + "&salary=" + salary + "&degree=" + degree
                    + "&experience=" + experience + "&intention=" + intention + "&page=" + _this.pageIndex + "&jobId=" + jobid + params;

                _this.appendMessage("加载第" + _this.pageIndex + "页的数据");
                var dtd = $.Deferred();
                $.ajax({
                    method: 'POST',
                    url: "https://www.zhipin.com/wapi/zpboss/h5/boss/recommendGeekList" + params,
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
                }).done(function (result) {
                    if (result.code == 0) {
                        var list = result.zpData.geekList;
                        if (list.length == 0) {
                            _this.stop();
                        }
                        $.when(_this.sayHello(list)).done(function () {
                            return dtd.resolve();
                        });
                    } else {
                        _this.appendMessage("加载人员数据失败：" + result.message);
                        _this.stop();
                    }
                    return dtd.resolve();
                });
                //返回自定义的dtd对象，才能保证返回值的done回调在load事件完成后执行
                return dtd.promise();
            }

            this.sayHello = function (list) {
                var dtd = $.Deferred();
                for (var i = 0, len = list.length; i < len; i++) {
                    var json = list[i];
                    var resume = json.geekCard.geekName + "/" + (json.geekCard.geekGender == 1 ? "男" : "女") + "/" + json.geekCard.ageDesc + "：" + json.showWorks.map(function (v) {
                        return v.company + "-" + v.positionName + "-" + v.workTime;
                    }).join(",");
                    //分割线
                    _this.appendMessage("<h1 style=\"border-top: 1px dotted;height: 1px;display: block;\"></h1>");
                    //判断是否需要打招呼
                    if (_this.validateSayHello(json)) {
                        //打招呼
                        var tasks = function (json, resume, jdToolMaxNumber) {
                            //超过配置的数量则不再继续执行
                            if (_this.finishNumber - jdToolMaxNumber >= 0 || _this.finishNumber - _this.maxNumber >= 0) {
                                _this.appendMessage("已完成打招呼。");
                                _this.stop();
                                return;
                            }
                            var requestData = {
                                "gid": json.geekCard.encryptGeekId,
                                "suid": json.suid,
                                "jid": json.geekCard.encryptJobId,
                                "expectId": json.geekCard.expectId,
                                "lid": json.geekCard.lid,
                                "from": "",
                                "securityId": json.geekCard.securityId
                            };
                            $.ajax({
                                method: 'POST',
                                url: "https://www.zhipin.com/wapi/zpboss/h5/chat/start?_=" + new Date().getTime(),
                                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                                data: requestData,
                            }).done(function (result) {
                                if (result.code == 0) {
                                    _this.finishNumber++;
                                    _this.totalFinishNumber++;
                                    //输出日志
                                    _this.appendMessage("已完成对" + json.geekCard.geekName + "的打招呼，已打<b>" + _this.finishNumber + "</b>");
                                    _this.appendMessage(resume);
                                } else {
                                    _this.appendMessage("打招呼失败：" + result.message);
                                    _this.stop();
                                }
                                return dtd.resolve();
                            });
                        }
                        setTimeout(tasks, _this.getJdStorage().jdToolFrequency * 1000 + (i * _this.getJdStorage().jdToolFrequency * 1000), json, resume, _this.getJdStorage().jdToolMaxNumber);
                    } else {
                        _this.appendMessage(resume);
                    }
                }

                //返回自定义的dtd对象，才能保证返回值的done回调在load事件完成后执行
                return dtd.promise();
            }

            this.validateSayHello = function (jsonData) {
                var jdStorage = _this.getJdStorage();
                var geekName = jsonData.geekCard.geekName;
                //已打过招呼，则忽略
                if (jsonData.friendGeek || jsonData.isFriend == 1) {
                    _this.appendMessage("忽略打招呼：" + geekName + "已打过招呼。");
                    return false;
                }
                //其他同事已沟通过
                if (jdStorage.jdToolCooperate == "0" && jsonData.cooperate == 2) {
                    _this.appendMessage("忽略打招呼：" + geekName + "其他同事已沟通过。");
                    return false;
                }
                //判断是否刚刚活跃
                if (jsonData.activeTimeDesc != "刚刚活跃") {
                    _this.appendMessage("忽略打招呼：" + geekName + "不是“刚刚活跃”用户。");
                    return false;
                }
                //性别
                if (jdStorage.jdToolSex != "-1" && jsonData.geekCard.geekGender != jdStorage.jdToolSex) {
                    _this.appendMessage("忽略打招呼：" + geekName + "性别不匹配。");
                    return false;
                }

                //年龄
                var age = parseInt(jsonData.geekCard.ageDesc);
                if (!(age - jdStorage.jdToolAgeFrom >= 0 && age - jdStorage.jdToolAgeTo <= 0)) {
                    _this.appendMessage("忽略打招呼：" + geekName + "年龄不匹配。");
                    return false;
                }

                //按应届生
                if (jdStorage.jdToolGraduate) {
                    if (jsonData.geekCard.geekWorkYear.endsWith("应届生")) {
                        //判断届数是否满足
                        var graduate = jsonData.geekCard.geekWorkYear.replace(/[^0-9]/ig, "");
                        if (jdStorage.jdToolGraduate.indexOf(graduate) == -1) {
                            _this.appendMessage("忽略打招呼：" + geekName + "不符合应届要求。");
                            return false;
                        }

                        //屏蔽的关键字
                        var sensitiveWord = jdStorage.jdToolSensitiveWord;
                        //满足条件的关键字
                        var keywords = jdStorage.jdToolGraduateKeyWord ? jdStorage.jdToolGraduateKeyWord.replaceAll("，", ",").split(",") : [];

                        //关键字职位
                        var keywordContent = jsonData.geekCard.expectLocationName + jsonData.geekCard.expectPositionName;
                        //判断是否存在屏蔽的关键字
                        if (sensitiveWord) {
                            var sensitiveWords = sensitiveWord.replaceAll("，", ",").split(",");
                            for (var j = 0, wLen = sensitiveWords.length; j < wLen; j++) {
                                var word = sensitiveWords[j];
                                if (keywordContent.indexOf(word) > -1) {
                                    _this.appendMessage("忽略打招呼：" + geekName + "包含屏蔽关键字：<i>" + word + "</i>");
                                    return false;
                                }
                            }
                        }

                        //判断是否匹配关键字
                        var keywordMatch = keywords.length == 0;
                        for (var j = 0, wLen = keywords.length; j < wLen; j++) {
                            var word = keywords[j];
                            if (keywordContent.indexOf(word) > -1) {
                                keywordMatch = true;
                                break;
                            }
                        }
                        if (!keywordMatch) {
                            _this.appendMessage("忽略打招呼：" + geekName + "求职期望不符合。");
                            return false;
                        }
                    } else {
                        return false;
                    }
                }

                //按照符号条件的工作经验判断
                if (jdStorage.jdToolKeyword) {
                    //屏蔽的关键字
                    var sensitiveWord = jdStorage.jdToolSensitiveWord;
                    //满足条件的关键字
                    var keywords = jdStorage.jdToolKeyword.replaceAll("，", ",").split(",");

                    var isMatch = false;
                    if (jsonData.showWorks != null && jsonData.showWorks.length > 0) {
                        for (var i = 0, len = jsonData.showWorks.length; i < len; i++) {
                            var workData = jsonData.showWorks[i];
                            //工作时长
                            var experienceMonth = 0;
                            var workTime = workData.workTime;
                            if (workTime && workTime.endsWith("年半")) {
                                experienceMonth = parseInt(workTime) * 18;
                            } else if (workTime && workTime.endsWith("年")) {
                                experienceMonth = parseInt(workTime) * 12;
                            } else if (workTime && workTime.endsWith("月")) {
                                experienceMonth = parseInt(workTime);
                            }

                            //需要校验的关键字
                            var keywordContent = workData.company + workData.positionName;
                            //是否需要执行关键字
                            var executeSensitiveWord = true;
                            //忽略“忽略的关键字”最小月
                            var ignoreSensitiveWordMonth = jdStorage.jdToolIgnoreSensitiveWordMonth ? jdStorage.jdToolIgnoreSensitiveWordMonth : 999;
                            //不执行的标准是：有结束日期且结束日期到当月超过忽略的最小月
                            if (workData.endDate && _this.getMonthDiff(new Date(workData.endDate), new Date()) - ignoreSensitiveWordMonth >= 0) {
                                executeSensitiveWord = false;
                            }

                            if (sensitiveWord) {
                                var sensitiveWords = sensitiveWord.replaceAll("，", ",").split(",");
                                for (var j = 0, wLen = sensitiveWords.length; j < wLen; j++) {
                                    var word = sensitiveWords[j];
                                    if (executeSensitiveWord && keywordContent.indexOf(word) > -1) {
                                        _this.appendMessage("忽略打招呼：" + geekName + "包含屏蔽关键字：<i>" + word + "</i>");
                                        return false;
                                    }
                                }
                            }

                            var keywordMatch = false;
                            for (var j = 0, wLen = keywords.length; j < wLen; j++) {
                                var word = keywords[j];
                                if (keywordContent.indexOf(word) > -1) {
                                    keywordMatch = true;
                                    break;
                                }
                            }

                            //关键字匹配且工作时长满足
                            if (keywordMatch && experienceMonth - jdStorage.jdToolExperienceTime >= 0) {
                                isMatch = true;
                                break;
                            }
                        }
                    } else {
                        //设置的工作经验时长0，则无工作信息也符合条件
                        if (jdStorage.jdToolExperienceTime == 0) {
                            isMatch = true;
                        }
                    }

                    if (!isMatch) {
                        _this.appendMessage("忽略打招呼：" + geekName + "工作经验不匹配或不符合关键字。");
                        return false;
                    }
                }

                return true;
            }

            this.getQueryVariable = function (variable) {
                var query = decodeURIComponent(window.location.search.substring(1));
                query = query.substring(query.indexOf("?") + 1);
                var vars = query.split("&");
                for (var i = 0; i < vars.length; i++) {
                    var pair = vars[i].split("=");
                    if (pair[0] == variable) {
                        return pair[1];
                    }
                }
                return "";
            }

            this.syncFrameWindow = function () {
                var syncFrame = _this.isNormalVersion() ? $("iframe[name='recommendFrame']")[0] : $("iframe[name='syncFrame']")[0];
                return syncFrame ? syncFrame.contentWindow : window;
            }

            /**
             * 计算两个日期之间相差的月份
             * @param {Date} fromDate 开始日期
             * @param {Date} toDate 结束日期
             */
            this.getMonthDiff = function (fromDate, toDate) {
                if (fromDate && toDate) {
                    let minYear = fromDate.getFullYear();
                    let minMonth = fromDate.getMonth() + 1;
                    let maxYear = toDate.getFullYear();
                    let maxMonth = toDate.getMonth() + 1;
                    return Math.abs((maxYear * 12 + maxMonth) - (minYear * 12 + minMonth));
                }
                return 0;
            }

            this.validateUrl = function () {
                return this.getVersion() != "unknown";
            }

            this.stop = function () {
                $('#jdToolBtn').val('开始打招呼');
                _this.working = false;
                _this.appendMessage("已停止打招呼。");
            }

            this.sendExecuteLogData = function () {
                var jdAccount = JD.jdAccount.account;
                var jdStorage = JSON.stringify(_this.getJdStorage());
                jdStorage = jdStorage.replace("jdToolSex", "性别");
                jdStorage = jdStorage.replace("jdToolAgeFrom", "年龄（起）");
                jdStorage = jdStorage.replace("jdToolAgeTo", "年龄（止）");
                jdStorage = jdStorage.replace("jdToolKeyword", "符合关键字");
                jdStorage = jdStorage.replace("jdToolExperienceTime", "工作经验月份");
                jdStorage = jdStorage.replace("jdToolSensitiveWord", "忽略关键字");
                jdStorage = jdStorage.replace("jdToolIgnoreSensitiveWordMonth", "不忽略最小月");
                jdStorage = jdStorage.replace("jdToolGraduate", "应届生");
                jdStorage = jdStorage.replace("jdToolGraduateKeyWord", "求职期望");
                jdStorage = jdStorage.replace("jdToolCooperate", "同事沟通过是否打招呼");
                jdStorage = jdStorage.replace("jdToolMaxNumber", "打招呼数");
                jdStorage = jdStorage.replace("jdToolFrequency", "打招呼频率");

                chrome.runtime.sendMessage({
                    jd: "operationLog",
                    url: jdAccount.operationLogURL,
                    data: {
                        'siteLoginAccount': jdAccount.siteLoginAccount,
                        'resumeSiteUid': jdAccount.resumeSiteUid,
                        'operationActionCd': '01',
                        'operationActionParameters': jdStorage
                    }
                }, function (res) {

                })
            }

            this.getVersion = function () {
                //普通版本地址
                if (location.href.indexOf("//www.zhipin.com/web/boss/recommend") > -1) {
                    return "normal";
                }
                //Vue版本地址
                else if (location.href.indexOf("//www.zhipin.com/chat/im?mu=%2Fvue%2Findex%2F%23%2Fdashboard%2Fcandidate%2Frecommend") > -1) {
                    return "vue";
                }
                return "unknown";
            }

            this.isNormalVersion = function () {
                return _this.getVersion() == "normal";
            }
        }

        if (location.href.indexOf("//login.zhipin.com") > -1 || location.href.indexOf("//signup.zhipin.com") > -1) {
            return;
        }

        var JD = new _jd('boss');
        chrome.storage.sync.get(null, function (item) {
            //网站登录
            if (!JD.jdAccount.isLogin() && (location.href.indexOf("//www.zhipin.com/chat/im") > -1 || location.href.indexOf("www.zhipin.com/web/boss") > -1)) {
                JD.jdAccount.login();
            }

            if (JD.jdAccount.isLogin()) {
                var boss = new BossUtils();
                boss.runTool();
            }
        });

        String.prototype.replaceAll = function (s1, s2) {
            return this.replace(new RegExp(s1, "gm"), s2);
        }
    }(jQuery, XLSX, moment, JdUtils)
);
