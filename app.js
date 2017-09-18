'use strict';
//dependencies
const config = require('./config'),
  express = require('express'),
  http = require('http'),
  path = require('path'),
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
		 
		  app.use('/dash', Agendash(agenda));

		  //listen up
		  app.server.listen(app.config.port, function(){
		    //and... we're live
		      console.log('Server is running on port ' + config.port);
		  });

		  return app;
  }	


