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


  });


    agenda.define('buy ,sell ,ico alerts and breaking news', function(job, done) {

        console.log(job.attrs.data.msg);

        agenda.jobs.db.model('User').count({}, function( err, count) {
            if(err) {
                console.log(err.stack);
                return done(err);
            }


            const arr = [];
            /*
               ##TODO http://thecodebarbarian.com/cursors-in-mongoose-45
             */

            let streams =  agenda.jobs.db.model('User').find({},{ uid : 1 }).limit(count).lean().cursor();

            streams.on('data', function (product) {
                /*
                  need to pause for data processing
                */

                streams.pause();


                const options = {
                    url: 'https://graph.facebook.com/v2.6/me/messages',
                    qs: {access_token: 'EAABzjRLllHgBABHjf4jadxDvpKoGUp7Q5P4VfP9vYrqYkKZASpnH0Yvx5aZAbLD9NwRTF8zndZC7F2ldLe3pFZBwmo0hee6nC2FsSYlLJaouHJWLwRzMAIEIwp8pCchFkZCo5BxhP1JgZCU9dBbmepzfhStOXjZBjZCBuNdpwrrYvIvqwAXqJeXl'},
                    method: 'POST',
                    json: {
                        recipient: { id: product.uid },
                        message: {
                            text : job.attrs.data.msg
                        }
                    }
                };

                request(options, function (error, response, body) {
                    if (error) {
                        console.log('Error sending message: ', error);
                        return done(err,'error in product find');
                    } else if (response.body.error) {
                        console.log('Error: ', response.body.error);
                        return done(err,'error in product find');
                    }

                    arr.push(product.uid);

                    // streams.emit('update track status',product._id);
                    streams.emit('done updating');
                    // cb(null, 'mongo entry success');

                });
            });

            streams.on('done updating',function() {

                if(arr.length == count ) {
                    done(null, 'done sent messages---------------------------------------');
                    streams.emit('close');
                } else {
                    console.log('sending-----------------keep patience--------------------------------');
                    /*
                    resume after processing data
                     */
                    streams.resume();
                }
            });

            streams.on('error', function (err) {
                // handle err
                return done(err, 'done getting records');
            });

            streams.on('close', function () {
                // all done
                console.log('all done');
                // cb(null, 'done getting records');
            });
        });
    });


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
          //agenda.every('233 hours', 'add new coins');

          //agenda.now('fetch coins social handlers');

          agenda.start();
	});


	agenda.on('start', function(job) {  
		console.log("Job %s starting", job.attrs.name);
	});

};


