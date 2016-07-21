/*This child process executes the functions*/
process.on('message', function(m) {
    var func = new Function('return ' + m.jobFunc)();
    var ret = func(m.params, m.cb);
    process.send(ret);
});