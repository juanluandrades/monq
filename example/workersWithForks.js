var monq = require('../lib/index');
var async = require('async');

var client = monq(process.env.MONGODB_URI || 'mongodb://localhost:27017/monq_example', { safe: true });

/*WORKERS*/
var worker1 = client.worker(['foo1']);

/*QUEUES*/
var queue1 = client.queue('foo1');

initWorkers();
initQueues();
//This worker will run the jobs in differents forks :)
worker1.start();

worker1.on('complete', function (data) {
    console.log("completed project: " +  JSON.stringify(data));
});
worker1.on('jobsProcessed', function (data) {
    console.log("jobs processed!!!!!! ......" +  JSON.stringify(data));
});


function initWorkers() {
    worker1.register({ uppercase: require('./uppercaseForking')});
}

function initQueues() {


    queue1.enqueue('uppercase', { text: 'job:UPrerqerqerqwerqwer ' }, function (err, job) {
        if (err) throw err;
        //console.log(job.data);
    });
    queue1.enqueue('uppercase', { text: 'job:UPrerqerqerqwerqwer ' }, function (err, job) {
        if (err) throw err;
        //console.log(job.data);
    });
    queue1.enqueue('uppercase', { text: 'job:UPrerqerqerqwerqwer ' }, function (err, job) {
        if (err) throw err;
        //console.log(job.data);
    });
    queue1.enqueue('uppercase', { text: 'job:UPrerqerqerqwerqwer ' }, function (err, job) {
        if (err) throw err;
        //console.log(job.data);
    });
}
