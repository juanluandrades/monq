module.exports = function (params, callback) {
    function waitALittle () {
        setTimeout(function () {}, 3000);
    }
    waitALittle();
    //do stuffs
    return {
        err: null,
        data: params.text.toUpperCase(),
        next: callback };
};

