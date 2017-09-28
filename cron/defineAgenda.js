'use strict';
const notifier = require('node-notifier');
const request = require('request');
const async = require('async');

exports = module.exports = function(agenda){

  agenda.define('fetch ethereum price', function(job, done) {
  
    const ethexOptions = { 
      method: 'GET',
      url: 'https://api.ethexindia.com/ticker/',
      headers: 
      { 'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36",
        'cache-control': 'no-cache' 
      } 
    };

    const zebpayOptions = {
      method: 'GET',
      url: 'https://www.zebapi.com/api/v1/market/ticker/btc/inr',
      headers: 
      { 'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36",
        'cache-control': 'no-cache' 
      } 
    };

    async.parallel([
        function(callback) {
          request(ethexOptions, function (error, response, body) {
            if (error) {
              return callback(error);
            }

            const price = JSON.parse(body);
            callback(null,price);
          });
        },
        function(callback) {
          request(zebpayOptions, function (error, response, body) {
            if (error) {
              return callback(error);
            }

            const price = JSON.parse(body);
            callback(null,price);
          });
        }
    ],
    // optional callback
    function(err, results) {
      console.log(results);
      if (err) {
        notifier.notify('something went wrong');
        return done();
        // the results array will equal ['one','two'] even though
      }

      notifier.notify({
        'title': 'ethexIndia price ticker',
        'message': `ethexIndia
        sell - ${results[0].ask} 
        buy - ${results[0].bid} \n`
      });

      setTimeout(function(){
        notifier.notify({
          'title': 'zebPay price ticker',
          'message': `
          sell - ${results[1].sell}
          buy - ${results[1].buy}`
        });
      },2000);

      done();
    });

  });

  agenda.define('get new data', function(job, done) {
    console.log('yess');
    done();
  });


	agenda.on('ready', function(arguments) {
    console.log(process.env.refreshTime,process.env.timePrefix)
	  agenda.every(`${process.env.refreshTime || 30} ${process.env.timePrefix}`, 'fetch ethereum price');
	  agenda.start();
	});


	agenda.on('start', function(job) {  
		console.log("Job %s starting", job.attrs.name);
	});

};


