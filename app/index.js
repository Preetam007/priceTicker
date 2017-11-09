'use strict';
//dependencies
const config = require('./config'),
  express = require('express'),
  redis = require('redis'),
  http = require('http'),
  path = require('path'),
  helmet = require('helmet'),
  favicon = require('serve-favicon'),
  bodyParser =  require('body-parser'),
  Agendash = require('agendash'),
  mongoose = require('mongoose');

//create express app
const app = express();

exports = module.exports = function(agenda){

  //keep reference to config
  app.config = config;
  // to avoid bottleneckin of system
  http.globalAgent.maxSockets = Infinity;

  //setup the web server
  app.server = http.createServer(app);

  //setup mongoose
  app.db = mongoose.createConnection(config.mongodb.uri);
  app.db.on('error', console.error.bind(console, 'mongoose connection error: '));
  app.db.once('open', function () {
    //and... we have a data store
  });


    app.db.on('disconnected', function() {
        console.warn('MongoDB event disconnected');
    });

  // If the Node process ends, close the Mongoose connection
    process.on('SIGINT', function() {
        app.db.close(function () {
            console.log('Mongoose default connection disconnected through app termination');
            process.exit(0);
        });
    });

//config data models
  require(__dirname+'/models')(app, mongoose);

    // keep reference to redis client
  app.client = redis.createClient(app.config.redisPort);

  app.client.on('ready',function() {
      console.log("Redis is ready");
  });

  app.client.on('error',function() {
      console.log("Error in Redis");
  });


  app.disable('x-powered-by');
  app.enable('trust proxy'); 
  app.set('port', config.port);

  app.use(require('compression')());
  app.use(bodyParser.urlencoded({extended: false}));
  app.use(bodyParser.json());
  app.use(bodyParser.json({type: 'application/vnd.api+json'}));


  //using a single line of code will attach 7 protecting middleware to Express appapp.use(helmet());
  //additional configurations can be applied on demand, this one mislead the caller to think we’re using PHP 🙂
  app.use(helmet.hidePoweredBy({ setTo: 'PHP 4.2.0' }));//other middleware are not activated by default and requires explicit configuration .
  //app.use(helmet.referrerPolicy({ policy: 'same-origin' }));

  //app.use(favicon(__dirname + '/favicon.ico'));
  app.use(express.static(__dirname + '/public'));
  app.use('/dash', Agendash(agenda));

  // routes ======================================================================
  require('./routes')(app);

  //setup utilities
  app.utility = {};
  app.utility.agenda = agenda;
  app.utility.workflow = require(__dirname+'/helpers/workflow');

    //custom (friendly) error handler
    //
  app.use(require(__dirname + '/service/http').http500);
  
  //listen up
  app.server.listen(app.config.port, function(){
    //and... we're live
      console.log('Server is running on port ' + config.port);
  });

  return app;
}	


