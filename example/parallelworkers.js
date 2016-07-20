/*This example shows how to use this library with different workers executing different queues in parallel*/
/*Actually the parallel work will be for I/O operations because as we know once we receive the callback, it will go to the callback queque until the
* eventLoops grab it and put it in the call stack*/
var monq = require('../lib/index');
var async = require('async');

var client = monq(process.env.MONGODB_URI || 'mongodb://localhost:27017/monq_example', { safe: true });

/*WORKERS*/
var worker1 = client.worker(['foo1']);
var worker2 = client.worker(['foo2']);
var worker3 = client.worker(['foo3']);

/*QUEUES*/
var queue1 = client.queue('foo1');
var queue2 = client.queue('foo2');
var queue3 = client.queue('foo3');
var queue4 = client.queue('foo4');

initWorkers();
initQueues();

/*HERE THE PARALLEL EXECUTION*/
async.parallel([
    function(callback) {processWorker(worker1,callback);},
    function(callback) {processWorker(worker2,callback);},
    function(callback) {processWorker(worker3,callback);}
],function (err, data) {
    if (err) {
        console.log(err); return err;
    }
    console.log(data);
});


function processWorker(worker, cb) {
    worker.start();
    worker.on('jobsProcessed', function (data) {
        cb(null, data);
    });

    /*THE STATUS OF THE WORKER*/
    /*NOTE: HERE WE Can track the behaviour of any event for the particular worker
    * also we have now a more meaningful response so we now in case of error which queue was, the job
    * and the error itself. Then we will proceed with the cb function accordingly.*/

/*    worker.on('dequeued', function (data) {
        console.log('Dequeued:');
        console.log(data);
    });

    worker.on('failed', function (data) {
        console.log('Failed:');
        console.log(data);
    });

    worker.on('complete', function (data) {
        console.log('Complete:');
        console.log(data);
    });

    worker.on('error', function (err) {
        console.log('Error:');
        console.log(err);
        worker.stop();
    });*/
}

function initWorkers() {
    worker1.register({ uppercase: require('./uppercase'), lowerCase: require('./lowerCase') });
    worker2.register({ lowerCase: require('./lowerCase'), uppercase: require('./uppercase') });
    worker3.register({ uppercase: require('./uppercase') });
}

function initQueues() {
    /*queue 1 with 5 jobs*/
    for (var i = 0; i<3; i++) {
        queue1.enqueue('uppercase', { text: 'job: ' + i }, function (err, job) {
            if (err) throw err;
            //console.log(job.data);
        });
    }

    queue1.enqueue('lowerCase', { text: 'job:4'}, function (err, job) {
        if (err) throw err;
        //console.log(job.data);
    });

    /*queue 2 with 6 jobs*/
    for (var i = 0; i<6; i++) {
        queue2.enqueue('uppercase', { text: 'job: ' + i }, function (err, job) {
            if (err) throw err;
            //console.log(job.data);
        });
    }

    queue2.enqueue('lowerCase', { text: 'job:4'}, function (err, job) {
        if (err) throw err;
        //console.log(job.data);
    });

    /*queue 3 with 2 jobs*/
    for (var i = 0; i<2; i++) {
        queue3.enqueue('uppercase', { text: 'job: ' + i }, function (err, job) {
            if (err) throw err;
            //console.log(job.data);
        });
    }

    /*queue 4 with 2 jobs*/
    for (var i = 0; i<2; i++) {
        queue4.enqueue('uppercase', { text: 'job: ' + i }, function (err, job) {
            if (err) throw err;
            //console.log(job.data);
        });
    }
}
