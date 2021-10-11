(function ($) {
    'use strict';
    $(document).ajaxComplete(function (e, jqXHR, setting) {
        if (!window.sessionStorage.hasOwnProperty("overtime_download_cache") && setting.url === "http://rd2.zhaopin.com/s/resume_preview/OutOrSendResume.asp"
            && jqXHR.status == 200 && jqXHR.responseText.length > 1) {
            window.sessionStorage.setItem("overtime_download_cache", jqXHR.responseText);
        }
    })
}(jQuery))