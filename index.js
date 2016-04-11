var CronJob = require('cron').CronJob;
var jenkins = require('jenkins');
var async = require('async');

var jenkins_url = process.env.JENKINS_URL ||
    'http://admin:2eea3b927d4ee23e@jenkins.rhub.me:8080';

// Time limit to delete job
var TIME_LIMIT = 1000 /* ms */ * 60 /* s */ * 60 /* min */ * 24 * 3;
// How often to run the job reaper, once an hour, at **:42:42
var CRON_JOB_REAPER = '*/5 * * * * *';

var job = new CronJob(CRON_JOB_REAPER, function() {

    var jen = jenkins(jenkins_url);
    jen.job.list(function(err, data) {
	if (err) { console.log('Cannot get Jenkins job list'); return; }
	async.eachLimit(
	    data,
	    3,
	    function(job, cb) { delete_if_old(jen, job, cb); }
	);
    });

}, null, true, 'America/New_York');

function delete_if_old(jen, job, callback) {
    jen.job.get(job.name, function(err, data) {
	if (err) {
	    console.log('Cannot get Jenkins job ' + job.name);
	    return callback(null);
	}
	jen.build.get(job.name, data.lastBuild.number, function(err, data) {
	    if (err) {
		console.log('Cannot get Jenkins build ' + job.name + ' ' +
			    data.lastBuild.number);
		return callback(null);
	    }
	    var diff = new Date() - new Date(data.timestamp);
	    // about three days
	    if (diff > TIME_LIMIT) {
		return delete_job(jen, job, callback);
	    }
	    return callback(null);
	});
    });
}

function delete_job(jen, job, callback) {
    jen.job.destroy(job.name, function(err) {
	if (err) {
	    console.log('Cannot delete Jenkins job ' + job.name);
	} else {
	    console.log('Deleted Jenkins job ' + job.name);
	}
	return(null);
    });
}

module.exports = job;
