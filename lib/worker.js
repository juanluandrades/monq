var events = require('events');
var util = require('util');
var Queue = require('./queue');
var cp = require('child_process');

module.exports = Worker;

function Worker(queues, options) {
    options || (options = {});

    this.empty = 0;
    this.queues = queues || [];
    this.interval = options.interval || 5000;

    this.callbacks = options.callbacks || {};
    this.strategies = options.strategies || {};
    this.universal = options.universal || false;

    // Default retry strategies
    this.strategies.linear || (this.strategies.linear = linear);
    this.strategies.exponential || (this.strategies.exponential = exponential);

    // This worker will only process jobs of this priority or higher
    this.minPriority = options.minPriority;

    this.status = 'SUCCESS';
    this.queueName = '';
    this.jobsRunning = {};

}

util.inherits(Worker, events.EventEmitter);

Worker.prototype.register = function (callbacks) {
    for (var name in callbacks) {
        this.callbacks[name] = callbacks[name];
    }
};

Worker.prototype.strategies = function (strategies) {
    for (var name in strategies) {
        this.strategies[name] = strategies[name];
    }
};

Worker.prototype.start = function () {
    if (this.queues.length === 0) {
        return setTimeout(this.start.bind(this), this.interval);
    }
    this.working = true;
    this.poll();
};

Worker.prototype.stop = function (callback) {
    var self = this;

    function done() {
        if (callback) callback();
    }

    if (!this.working) done();
    this.working = false;

    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = null;
      return done();
    }

    this.once('stopped', done);
};

Worker.prototype.addQueue = function (queue) {
  if (!this.universal)
    this.queues.push(queue);
};

Worker.prototype.poll = function () {
    if (!this.working) {
        return this.emit('stopped');
    }

    var self = this;

    this.dequeue(function (err, job) {
        if (err) {
            self.status = 'ERROR';
            return self.emit('error', { queue: self.queueName, job: job.data, error: err, cause:'jobDequeue' });
        }

        if (job) {
            self.empty = 0;
            self.emit('dequeued', { queue: self.queueName, job: job.data });
            self.work(job);
        } else {
            self.emit('empty', { queue: self.queueName });
            if (self.empty === 0) {
                self.emit('jobsProcessed', { status: self.status });
            }

            if (self.empty < self.queues.length) {
                self.empty++;
            }

            if (self.empty === self.queues.length) {
                // All queues are empty, wait a bit
                self.pollTimeout = setTimeout(function () {
                    self.pollTimeout = null;
                    self.poll();
                }, self.interval);
            } else {
                self.poll();
            }
        }
    });
};

Worker.prototype.dequeue = function (callback) {
    var queue = this.queues.shift();
    this.queueName = queue.name;
    this.queues.push(queue);
    queue.dequeue({ minPriority: this.minPriority, callbacks: this.callbacks }, callback);
};

Worker.prototype.work = function (job) {
    var self = this;
    var finished = false;

    if (job.data.timeout) {
        var timer = setTimeout(function () {
            done(new Error('timeout'));
        }, job.data.timeout);
    }

    function done(err, result) {
        // It's possible that this could be called twice in the case that a job times out,
        // but the handler ends up finishing later on
        if (finished) {
            return;
        } else {
            finished = true;
        }

        clearTimeout(timer);

        self.emit('done', { queue: self.queueName, job: job.data });

        if (err) {
            self.error(job, err, function (err) {
                if (err) {
                    self.status = 'ERROR';
                    return self.emit('error', { queue: self.queueName, job: job.data, error: err, cause:'jobDone' });
                }

                self.emit('failed', { queue: self.queueName, job: job.data, error: err, cause:'jobDone' });
                self.poll();
            });
        } else {
            job.complete(result, function (err) {
                if (err) {
                    self.status = 'ERROR';
                    return self.emit('error', { queue: self.queueName, job: job.data, error: err, cause:'jobComplete' });
                }

                self.emit('complete', { queue: self.queueName, job: job.data });
                self.poll();
            });
        }
    };

    this.process(job.data, done);
};

Worker.prototype.killJob = function (pid) {
    if (this.jobsRunning[pid]) {
        this.jobsRunning[pid].kill();
    }
}

Worker.prototype.process = function (data, callback) {
    var self = this;
    var func = this.callbacks[data.name];

    if (!func) {
        callback(new Error('No callback registered for `' + data.name + '`'));
    } else {
        var childP = cp.fork('./child');
        self.jobsRunning[childP.pid] = childP;
        console.log("job id...", Object.keys(self.jobsRunning));
        childP.on('message', function(res) {
           if (res.err) return callback(res.err);
            callback(null, res.data);
            console.log("killing ....", Object.keys(self.jobsRunning));
            childP.kill();
            delete self.jobsRunning[childP.pid];
        });
        childP.send({jobFunc: func.toString(), params: data.params});
    }
};

Worker.prototype.error = function (job, err, callback) {
    var attempts = job.data.attempts;
    var remaining = 0;

    if (attempts) {
        remaining = attempts.remaining = (attempts.remaining || attempts.count) - 1;
    }

    if (remaining > 0) {
        var strategy = this.strategies[attempts.strategy || 'linear'];
        if (!strategy) {
            strategy = linear;

            console.error('No such retry strategy: `' + attempts.strategy + '`');
            console.error('Using linear strategy');
        }

        if (attempts.delay !== undefined) {
            var wait = strategy(attempts);
        } else {
            var wait = 0;
        }

        job.delay(wait, callback)
    } else {
        job.fail(err, callback);
    }
};

// Strategies
// ---------------

function linear(attempts) {
    return attempts.delay;
}

function exponential(attempts) {
    return attempts.delay * (attempts.count - attempts.remaining);
}
