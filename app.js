'use strict';
//dependencies
const config = require('./config'),
  express = require('express'),
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

  //app.use(favicon(__dirname + '/favicon.ico'));
  app.use(express.static(__dirname + '/public'));
  app.use('/dash', Agendash(agenda));

  // routes ======================================================================
  require('./app/routes.js')(app);
  
  //listen up
  app.server.listen(app.config.port, function(){
    //and... we're live
      console.log('Server is running on port ' + config.port);
  });

  return app;
}	


