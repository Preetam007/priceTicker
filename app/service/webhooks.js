const request = require('request');

function sendMessage(event) {
  let sender = event.sender.id;
  let text = event.message.text;

  request({
      url: 'https://graph.facebook.com/v2.6/me/messages',
      qs: {access_token: 'EAABzjRLllHgBABHjf4jadxDvpKoGUp7Q5P4VfP9vYrqYkKZASpnH0Yvx5aZAbLD9NwRTF8zndZC7F2ldLe3pFZBwmo0hee6nC2FsSYlLJaouHJWLwRzMAIEIwp8pCchFkZCo5BxhP1JgZCU9dBbmepzfhStOXjZBjZCBuNdpwrrYvIvqwAXqJeXl'},
      method: 'POST',
      json: {
          recipient: {id: sender},
          message: {text: text}
      }
  }, function (error, response) {
      if (error) {
          console.log('Error sending message: ', error);
      } else if (response.body.error) {
          console.log('Error: ', response.body.error);
      }
  });
};


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
                    sendMessage(event);
                  }
            });
      });
      res.status(200).end();
    }
	}
};

module.exports = webhooks;