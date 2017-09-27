'use strict';
//dependencies
const config = require('./config'),
  express = require('express'),
  http = require('http'),
  path = require('path'),
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

		  app.use(bodyParser.urlencoded({extended: false}));
      app.use(bodyParser.json());
		 
      if (!!process.env.mode && process.env.mode == 'development') {
      	app.use('/dash', Agendash(agenda));
      }

      // Server index page
			app.get("/", function (req, res) {
			  res.send("Deployed!");
			});

			// Facebook Webhook
			// Used for verification
			app.get("/webhook", function (req, res) {
			  if (req.query["hub.verify_token"] === "this_is_my_token") {
			    console.log("Verified webhook");
			    res.status(200).send(req.query["hub.challenge"]);
			  } else {
			    console.error("Verification failed. The tokens do not match.");
			    res.sendStatus(403);
			  }
			});



		  //listen up
		  app.server.listen(app.config.port, function(){
		    //and... we're live
		      console.log('Server is running on port ' + config.port);
		  });

		  return app;
  }	


