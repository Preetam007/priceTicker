'use strict';
// require('@risingstack/trace');
var cluster = require('cluster'),
    config = require(__dirname +'/config'),
    mongoose = require('mongoose'),
    Agenda = require('agenda'),
    agenda = new Agenda({maxConcurrency: 20 ,db: {address: config.mongodb.uri, collection: 'agendaJobs'}}),
    jobWorkers = [],
    webWorkers = [],
    jobs = {};
    
        // jobs.utility = require('../util/workflow');
      jobs.db = mongoose.createConnection(config.mongodb.uri);


    agenda.jobs = jobs;   

    /*Use cluster when you want to parallelize the SAME flow of execution
    and server listening.
    Use child_process when you want DIFFERENT flows of execution
    working together. */


    if (cluster.isMaster) {
      let numWorkers  = process.env.WORKERS || require('os').cpus().length;

      console.log('Master cluster setting up ' + numWorkers + ' workers...');

      for(var i = 0; i < numWorkers; i++) {
          //cluster.fork();
        //addJobWorker();
        addWebWorker();
      }

      cluster.on('online', function(worker) {
        console.log('Worker ' + worker.process.pid + ' is online');
      });

      cluster.on('exit', function (worker, code, signal) {

        if (jobWorkers.indexOf(worker.id) != -1) {
          // console.log('job worker ' + worker.process.pid + ' died. Trying to respawn...');
          removeJobWorker(worker.id);
          addJobWorker();
        }

        if (webWorkers.indexOf(worker.id) != -1) {
          //console.log('http worker ' + worker.process.pid + ' died. Trying to respawn...');
          removeWebWorker(worker.id);
          addWebWorker();
        }
      });
    } else {

      if (process.env.web) {
        //console.log('start http server: ' + cluster.worker.id);
        require("./app.js")(agenda);//initialize the http server here
      }

      if (process.env.job) {
        require('./cron/defineAgenda')(agenda);//initialize the agenda here
      }
    }


    function addWebWorker() {
      webWorkers.push(cluster.fork({web: 1}).id);
    }

    function addJobWorker() {
      jobWorkers.push(cluster.fork({job: 1}).id);
    }

    function removeWebWorker(id) {
      webWorkers.splice(webWorkers.indexOf(id), 1);
    }

    function removeJobWorker(id) {
      jobWorkers.splice(jobWorkers.indexOf(id), 1);
    }

    
    process.on('uncaughtException', (err) => {
      console.log(`Caught exception: ${err}`);
      console.error((new Date).toUTCString() + ' uncaughtException:', err.message);
          console.error(err.stack);
           process.exit(1);
    });