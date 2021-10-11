(function ($) {
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (request.action === 'processForm') {
            var form = document.getElementById('formExport');
            var res = {form: {}};
            res.form.action = form.action;
            res.form.datas = [];
            $(form).find('input:hidden').each(function (i, obj) {
                res.form.datas.push({name: obj.name, value: obj.value});
            });
            res.form.type = 'POST';
            sendResponse(res);
        }
    });
}(jQuery));