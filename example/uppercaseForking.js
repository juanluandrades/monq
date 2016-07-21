module.exports = function (params, callback) {

    for (var i = 0;i<20000000000;i++) {}
    console.log("end loop....");
    return {
        err: null,
        data: params.text.toUpperCase(),
        next: callback };
};

