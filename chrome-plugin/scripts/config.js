//本地环境插件登录的URL
// var loginUrl = 'http://172.17.11.244:8080/login';
//测试环境插件登录的URL
// var remoteUrl = 'http://172.17.11.244:8080';
/***************************************************************************************** */
//生产环境插件登录的URL
// var loginUrl = 'http://cas.renruihr.com/login?service=https://rptask.renruihr.com/shiro-cas';
var loginUrl = 'http://castest.renruihr.com/login?service=https://rptask.renruihr.com/shiro-cas';
//old地址
// var remoteUrl = 'https://rptask.renruihr.com';
var remoteUrl = 'https://rptasktest.renruihr.com';
//接收简历方法的URL
// var receiveUrl = remoteUrl + '/rp/receive/resume';
// var receiveUrl = remoteUrl + '/rp/receive/resumetest';
var receiveUrl = "https://rpo-test.doumi.com/api/plugin/saveResume";//doumi
//接收简历文件方法的URL
// var receiveFileUrl = remoteUrl + '/rp/receive/resumeFile';
var receiveFileUrl = remoteUrl + '/rp/receive/resumeFiletest';
//插件操作日志URL
// var operationLogURL = remoteUrl + '/rp/resumepluginoperationlog/operationActionPush';
var operationLogURL = remoteUrl + '/rp/resumepluginoperationlog/operationActionPushtest';
