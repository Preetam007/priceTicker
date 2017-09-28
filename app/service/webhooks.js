const request = require('request');

function procressMessage(event) {
  let sender ,text ;

  if (!!event && !!event.message) {
    sender = event.sender.id;
    text = event.message.text;
  }
  else {
    sender = event.senderId;
    text = event.text;
  }

  request({
      url: 'https://graph.facebook.com/v2.6/me/messages',
      qs: {access_token: 'EAABzjRLllHgBABHjf4jadxDvpKoGUp7Q5P4VfP9vYrqYkKZASpnH0Yvx5aZAbLD9NwRTF8zndZC7F2ldLe3pFZBwmo0hee6nC2FsSYlLJaouHJWLwRzMAIEIwp8pCchFkZCo5BxhP1JgZCU9dBbmepzfhStOXjZBjZCBuNdpwrrYvIvqwAXqJeXl'},
      method: 'POST',
      json: {
          recipient: { id: sender },
          message: { text: text }
      }
  }, function (error, response) {
      if (error) {
        console.log('Error sending message: ', error);
      } else if (response.body.error) {
        console.log('Error: ', response.body.error);
      }
  });
};

function processPostback(event) {
  var senderId = event.sender.id;
  var payload = event.postback.payload;

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
      var greeting = "",name;
      if (error) {
        console.log("Error getting user's name: " +  error);
      } else {
        var bodyObj = JSON.parse(body);
        name = bodyObj.first_name;
        greeting = "Hi " + name + ". ";
      }
      var message = greeting + "My name is BlockChain Evangelist Bot. I can tell you various details regarding blockchain,cryptocurriencies. What topic would you like to know about?";
      procressMessage({senderId : senderId ,text: message});
    });
  }
}



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
    if (req.body.object === 'page') {
      req.body.entry.forEach((entry) => {
            entry.messaging.forEach((event) => {
                if (event.message && event.message.text) {
                  procressMessage(event);
                }

                if (event.postback) {
                  processPostback(event);
                }
            });
      });
      // It is important to return a 200 response as fast as possible. Facebook will wait for a 
      // 200 before sending you the next message. In high volume bots, a delay in returning a 200 can 
      // cause significant delays in Facebook delivering messages to your webhook.
      res.status(200).end();
    }
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