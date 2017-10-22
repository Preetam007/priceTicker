'use strict';
const notifier = require('node-notifier');
const request = require('request');
const async = require('async');
const fs = require('fs');
const test = require('./../app/service/test.json');

exports = module.exports = function(agenda){

  agenda.define('fetch crypto price', function(job, done) {
  
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
  
  

  agenda.define('add new coins',function(job,done) {

      const getcurrencies = {
          method: 'GET',
          url: 'https://bittrex.com/api/v1.1/public/getcurrencies',
          headers:
              { 'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36",
                  'cache-control': 'no-cache'
              }
      }

      let write = require('./../app/service/mapping.json');

      request(getcurrencies, function (error, response, body) {
          if (error) {
              return done(error);
          }

          //console.log(body);

          const price = JSON.parse(body);

          if (!!price.success) {
             var modOj = price.result.reduce(function (obj,curr,i) {

                 obj[curr.Currency.toLocaleLowerCase()] = curr.CurrencyLong.toLocaleLowerCase();

                 return obj;

             },{});

             console.log(modOj);

              fs.open(__dirname+'/../app/service/mapping.json', 'w', function(err, fd) {
                  if (err) {
                      throw 'error opening file: ' + err;
                  }

                  console.log('ok');

                  fs.writeFile(__dirname+'/../app/service/mapping.json',JSON.stringify(modOj), function (err) {
                      if (err) throw err;
                      console.log('Saved!');
                      done();
                  });
              });

          }

      });
  });
  
  
  
  agenda.define('fetch coins social handlers',function (job,done) {
      console.log('once');
      done();


  })


    function graceful() {
        agenda.stop(function() {
            process.exit(0);
        });
    }

    process.on('SIGTERM', graceful);
    process.on('SIGINT' , graceful);


	agenda.on('ready', function() {
    //console.log(process.env.refreshTime,process.env.timePrefix);
          //agenda.every(`${process.env.refreshTime || 30} ${process.env.timePrefix}`, 'fetch crypto price');
          agenda.every('233 hours', 'add new coins');

          agenda.now('fetch coins social handlers');

          agenda.start();
	});


	agenda.on('start', function(job) {  
		console.log("Job %s starting", job.attrs.name);
	});

};


