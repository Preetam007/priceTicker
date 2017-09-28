'use strict';
const request = require('request');

const webhooks = {
	verification  : function(req,res) {
    if (req.query["hub.verify_token"] === "this_is_my_token") {
      console.log("Verified webhook");
      res.status(200).send(req.query["hub.challenge"]);
    } else {
      console.error("Verification failed. The tokens do not match.");
      res.sendStatus(403);
    }
	},
	messageHandler : function(req,res) {
    console.log(req.body);
    
    let workflow = req.app.utility.workflow(req, res);
    
    workflow.on('validate', function validateUpdate() {
        
      if (req.body.object === 'page') {
        req.body.entry.forEach((entry) => {
          entry.messaging.forEach((event) => {
              if (event.message) {
                workflow.emit('procressMessage',event);
              }

              if (event.postback) {
                workflow.emit('processPostback',event);
              }
          });
        });
        // It is important to return a 200 response as fast as possible. Facebook will wait for a 
        // 200 before sending you the next message. In high volume bots, a delay in returning a 200 can 
        // cause significant delays in Facebook delivering messages to your webhook.
        res.status(200).end();
      } 
    });


    workflow.emit('procressMessage',function(event) {
      let sender ,text ;
          sender = event.sender.id;

      if (!!event && !!event.message) {

        if (event.message.text) { 
          text = event.message.text;
          const formattedMsg = text.toLowerCase().trim();

          // If we receive a text message, check to see if it matches any special
          // keywords and send back the corresponding movie detail.
          // Otherwise, search for new movie.
          switch (formattedMsg) {
            // case "blockchain":
            //   text = text;
            //   break;
            // case "cryptocurrenicies":
            //   text = text;
            //   break;
            // case "crypto":
            //   text = text;
            //   break;
            case "btc":
              workflow.emit('getata',{key :bitcoin ,sender :sender } );
              break;
            case "bitcoin":
              workflow.emit('getata',{key :bitcoin ,sender :sender });
              break;
            case "ether":  
              workflow.emit('getata',{key :ethereum ,sender :sender });
              break;
            case "ethereum":
              workflow.emit('getdata',{key :ethereum ,sender :sender });
              break;
            default:
              workflow.emit('sendMessage',{sender : sender ,text : text});
          }

        } else if (event.message.attachments) {
          text = "Sorry, I don't understand your request.";
          workflow.emit('sendMessage',{sender : sender ,text : text});
        }
      }
    });


    workflow.emit('getdata',function(data){
      let requestOptions ='',url = '';

      if (data.key == 'ethereum') {
        url =  'https://api.ethexindia.com/ticker/';
      }
      else {
        url = 'https://www.zebapi.com/api/v1/market/ticker/btc/inr';
      }

      requestOptions = { 
        method: 'GET',
        url :  url,
        headers: 
        { 'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36",
          'cache-control': 'no-cache' 
        } 
      };

      request(requestOptions, function (error, response, body) {
        if (error) {
          console.log(error);
        }

        const price = JSON.parse(body);
        console.log(price);
        const buy =  data.key == 'ethereum' ? price.bid : price.buy;
        const sell = data.key == 'ethereum' ? price.ask : price.sell;

        let pushString = `current ${key} buy rate is ${buy} INR and sell rate is ${sell} INR`;

        workflow.emit('sendMessage',{sender : data.sender  ,text : pushString});
      });
    });

    workflow.emit('processPostback',function(event) {

      const senderId = event.sender.id;
      const payload = event.postback.payload;

      if (payload === "Greeting") {
        // Get user's first name from the User Profile API
        // and include it in the greeting
        request({
          url: "https://graph.facebook.com/v2.6/" + senderId,
          qs: {
            access_token: 'EAABzjRLllHgBABHjf4jadxDvpKoGUp7Q5P4VfP9vYrqYkKZASpnH0Yvx5aZAbLD9NwRTF8zndZC7F2ldLe3pFZBwmo0hee6nC2FsSYlLJaouHJWLwRzMAIEIwp8pCchFkZCo5BxhP1JgZCU9dBbmepzfhStOXjZBjZCBuNdpwrrYvIvqwAXqJeXl',
            fields: "first_name"
          },
          method: "GET"
        }, function(error, response, body) {
          let greeting = "",name;
          if (error) {
            console.log("Error getting user's name: " +  error);
          } else {
            const bodyObj = JSON.parse(body);
            name = bodyObj.first_name;
            greeting = "Hi " + name + ". ";
          }
          let message = greeting + "My name is BlockChain Evangelist Bot. I can tell you various details regarding blockchain,cryptocurriencies. What topic would you like to know about?";
          workflow.emit('sendMessage',{sender : senderId ,text: message});
        });
      }

    });

    workflow.emit('sendMessage',function(data) {
      request({
          url: 'https://graph.facebook.com/v2.6/me/messages',
          qs: {access_token: 'EAABzjRLllHgBABHjf4jadxDvpKoGUp7Q5P4VfP9vYrqYkKZASpnH0Yvx5aZAbLD9NwRTF8zndZC7F2ldLe3pFZBwmo0hee6nC2FsSYlLJaouHJWLwRzMAIEIwp8pCchFkZCo5BxhP1JgZCU9dBbmepzfhStOXjZBjZCBuNdpwrrYvIvqwAXqJeXl'},
          method: 'POST',
          json: {
              recipient: { id: data.sender },
              message: { text: data.text }
          }
      }, function (error, response) {
          if (error) {
            console.log('Error sending message: ', error);
          } else if (response.body.error) {
            console.log('Error: ', response.body.error);
          }
      });
    });

    workflow.emit('validate');

	},
  // to enable show greeting(get started button) message , for this we have to handle postback callback and subscribe
  // messaging_postbacks
  payloadHandler :  function(req,res) {

    request({
      url: 'https://graph.facebook.com/v2.6/me/thread_settings',
      qs: {access_token: 'EAABzjRLllHgBABHjf4jadxDvpKoGUp7Q5P4VfP9vYrqYkKZASpnH0Yvx5aZAbLD9NwRTF8zndZC7F2ldLe3pFZBwmo0hee6nC2FsSYlLJaouHJWLwRzMAIEIwp8pCchFkZCo5BxhP1JgZCU9dBbmepzfhStOXjZBjZCBuNdpwrrYvIvqwAXqJeXl'},
      method: 'POST',
      json: {
        "setting_type":"call_to_actions",
        "thread_state":"new_thread",
        "call_to_actions":[
          {
            "payload":"Greeting"
          }
        ]
      }
    }, function (error, response) {
      if (error) {
        console.log('Error setting showgreeting message: ', error);
      } else if (response.body.error) {
        console.log('Error: ', response.body.error);
      }
      else {
        res.send(response);
      }
    });
  }
};

module.exports = webhooks;