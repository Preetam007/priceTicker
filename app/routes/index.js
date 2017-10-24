'use strict';
//const nodemailer = require('nodemailer');
const webhooks = require('../service/webhooks');

module.exports = function (app,agenda) {

    // Note that res.sendFile() is not implemented with the sendfile system call, which 
    // would make it far more efficient. Instead, use serve-static middleware (or something 
    // equivalent), that is optimized for serving files for Express apps. An even better option 
    // is to use a reverse proxy to serve static files; see Use a reverse proxy for more information

    app.get('/', function(req,res) {
       res.sendFile(require('path').join(__dirname, '../views/index.html'));
    });

    app.get('/stream',function (req,res) {
       res.sendFile(require('path').join(__dirname, '../views/stream.html'))
    });

    // Facebook Webhook
    // Used for verification
    // Facebook doesn’t just check these tokens when you first establish the connection.
    // It will continuously recheck the credentials from time to time, so your server should be able to send back
    // the same Verify Token whenever required
    app.get("/webhook", webhooks.verification);

    /* Handling all messenges */
    app.post('/webhook', webhooks.messageHandler);

    /* get started button */
    app.post('/showgreeting/setup',webhooks.welcomeScreen);
    
    // get xml from google neww
    app.get('/getxml',webhooks.xmltoJson);

    // to test coinmarket cap apis
    app.get('/getdata',webhooks.getData);

    // for testing message
    app.post('/testmessage',webhooks.sendMessage);

    app.post('/send',webhooks.alerts_BreakingNews);

    // for testing button messages
    app.post('/buttons',webhooks.buttonTemplate);

    // for testing generic template messages
    app.post('/testgenericmessage',webhooks.genericTemplate);

    // for quick replies
    app.post('/quickreplies',webhooks.quickReplies);

    // for testing opengraph template messages
    app.post('/podcast',webhooks.openGraph);

    // for testing transaction receipt  template messages
    app.post('/receipt',webhooks.receiptTemplate);

    // for dapps
    app.get('/dapps',webhooks.getDapps);

    // for whitelisting domains
    app.post('/whitelist',webhooks.whiteListDomains);

    // for testing tweets
    app.get('/tweets',webhooks.getTweets);

    // for messenger app menu
    app.post('/appmenu',webhooks.appMenu);

    app.get('/robots.txt', function(req,res) {
        res.sendFile(require('path').join(__dirname, '../robots.txt'));
    });


    // app.post('/api/sendemail', function(req,res) {
		  
  		// let transporter = nodemailer.createTransport({
  		//     host: 'smtp.gmail.com',
  		//     port: 465,
  		//     secure: true, // secure:true for port 465, secure:false for port 587
  		//     auth: {
  		//         user: 'teamplatoworks@gmail.com',
  		//         pass: 'myway$1A'
  		//     },
    //       tls: {
    //           // do not fail on invalid certs
    //           rejectUnauthorized: false
    //       }
  		// });
     
  		// let mailOptions = {
  		//     from: `"${req.body.name} 👻" <${req.body.email}>`, // sender address
  		//     to: 'raopreetam007@gmail.com', // list of receivers
  		//     subject: `PLATOWORKS INQUIRY FROM ${req.body.email}`, // Subject line
    //       html : `<b>${req.body.email}</b><br>${req.body.message}`
  		// };

  		// // send mail with defined transport object
  		// transporter.sendMail(mailOptions, (error, info) => {
  		//     if (error) {
  		//         return res.status(404).send("Oh uh, something went wrong");
  		//     }
  		//     console.log('Message %s sent: %s', info.messageId, info.response);
    //       res.json("success");
  		// });
    // });

    app.get('*',function(req,res) {
      res.redirect('/');
    });
};