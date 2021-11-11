//0：测试环境 1：sim环境 2：正式环境
var env = 2;
var enums = {
  0: "rpo-test",
  1: "rpo-sim",
  2: "rpo",
};
var host = `https://${enums[env]}.doumi.com`;
var loginUrl = "";
var remoteUrl = "";
//接收简历文件方法的URL
var receiveFileUrl = "";
//插件操作日志URL
var operationLogURL = "";
//获取账号列表接口
var accountList = `${host}/api/plugin/getAccountList`;
//接受简历接口
var receiveUrl = `${host}/api/plugin/saveResume`;
