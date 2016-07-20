module.exports = function (params, callback) {
    setTimeout(function () {
        var lowercase = params.text.toLowerCase();
        callback(null, lowercase);
    }, 1000);
};