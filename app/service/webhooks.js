'use strict';
const request = require('request');

const webhooks = {
	verification  : function verification(req,res) {
        if (req.query["hub.verify_token"] === "this_is_my_token") {
          console.log("Verified webhook");
          res.status(200).send(req.query["hub.challenge"]);
        } else {
          console.error("Verification failed. The tokens do not match.");
          res.sendStatus(403);
        }
	},
	messageHandler : function messageHandler(req,res) {
         
        if (req.body.object === 'page') {
          req.body.entry.forEach((entry) => {
            entry.messaging.forEach((event) => {
                if (event.message) {
                  procressMessage(event);
                } else if (event.postback) {
                  processPostback(event);
                }
            });
          });
          // It is important to return a 200 response as fast as possible. Facebook will wait for a
          // 200 before sending you the next message. In high volume bots, a delay in returning a 200 can
          // cause significant delays in Facebook delivering messages to your webhook.
          res.status(200).end();
        }

        function procressMessage(event) {
          console.log('procressMessage');
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
                case "blockchain":
                  getXml({key :'blockchain' ,sender :sender } );
                  break;
                case "cryptocurrenicies":
                  getXml({key :'cryptocurrency' ,sender :sender } );
                  break;
                case "crypto":
                  getXml({key :'cryptocurrency' ,sender :sender } );
                  break;
                case "btc":
                  getdata({key :'bitcoin' ,sender :sender } );
                  break;
                case "bitcoin":
                  getdata({key :'bitcoin' ,sender :sender });
                  break;
                case "ether":
                  getdata({key :'ethereum' ,sender :sender });
                  break;
                case "eth":
                  getdata({key :'ethereum' ,sender :sender });
                  break;
                case "ethereum":
                  getdata({key :'ethereum' ,sender :sender });
                  break;
                default:
                  sendMessage({sender : sender ,text : text});
              }

            } else if (event.message.attachments) {
              text = "Sorry, I don't understand your request.";
              sendMessage({sender : sender ,text : text});
            }
          }
        };


        function getdata(data) {
          console.log('getdata');
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

          request(requestOptions, function requestOptions(error, response, body) {
            if (error) {
              console.log(error);
            }

            const price = JSON.parse(body);
            console.log(price);
            const buy =  data.key == 'ethereum' ? price.ask : price.buy;
            const sell = data.key == 'ethereum' ? price.bid : price.sell;

            let pushString = `current ${data.key} buy rate is ${buy} INR and sell rate is ${sell} INR`;

            sendMessage({sender : data.sender  ,text : pushString});
          });
        };


        function getXml(data) {
          // @TO do - user IP parmaeter
          const options = {
            method: 'GET',
            url: `https://news.google.com/news/rss/search/section/q/${data.key} coinTelegraph/${data.key} coinTelegraph`,
            qs: { hl: 'en-IN', ned: 'in' },
            headers:
              {
              'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36",
               'cache-control': 'no-cache'
              }
          };

          let messages = {
            "attachment": {
              "type": "template",
              "payload": {
                "template_type": "list",
                "top_element_style": "compact",
                "elements": null,
                "buttons": [
                  {
                    "title": "View More",
                    "type": "postback",
                    "payload": "payload ${data.key}"
                  }
                ]
              }
            }
          }

          request(options, function (error, response, body) {
            if (error)  {
              return console.log(error);
            }

            let parseString = require('xml2js').parseString;
            parseString(body, function (err, result) {
              if (err) {
                return console.log(err);
              }

              if (((result.rss.channel)[0]) && ((result.rss.channel)[0].item)) {

                let reducedArray = ((result.rss.channel)[0]).item.reduce(function(arr,curr,i) {

                  if (i < 4) {
                    arr.push ({
                      "title": curr.title.join(''),
                      "subtitle":   curr.title.join('').slice(0,20),
                      //"image_url": "https://peterssendreceiveapp.ngrok.io/img/collection.png",
                      "buttons": [
                        {
                          "title": "View",
                          "type": "web_url",
                          "url": curr.link.join(''),
                          "messenger_extensions": true,
                          "webview_height_ratio": "tall",
                          "fallback_url": "https://blockchainevangelist.in/"
                        }
                      ]
                    });
                  }

                  return arr;
                },[]);

                messages.attachment.payload.elements = reducedArray;
                sendMessage({sender : data.sender  ,attachment : messages.attachment });
              } else {
                sendMessage({sender : data.sender  ,text : 'Sorry, No result found'});
              }
            });
          });
        }

        function processPostback(event) {
          console.log('processPostback');
          console.log(event);
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
              sendMessage({sender : senderId ,text: message});
            });
          }
          else if (payload === 'payload') {
              //getXml({ sender : senderId ,})
              getXml({key :'cryptocurrency' ,sender :senderId } );
             sendMessage({sender : senderId ,text: 'in development'});
          }
        };

        function sendMessage(data) {
          console.log('sendMessage');

          const json = {
            recipient : { id : data.sender },
            message : null
          };

          if (data.text) {
            json.message = { text : data.text };
          }
          else if (data.attachment) {
            json.message = { attachment :  data.attachment };
          }

          console.log(JSON.stringify(json,null,6));
          request({
              url: 'https://graph.facebook.com/v2.6/me/messages',
              qs: {access_token: 'EAABzjRLllHgBABHjf4jadxDvpKoGUp7Q5P4VfP9vYrqYkKZASpnH0Yvx5aZAbLD9NwRTF8zndZC7F2ldLe3pFZBwmo0hee6nC2FsSYlLJaouHJWLwRzMAIEIwp8pCchFkZCo5BxhP1JgZCU9dBbmepzfhStOXjZBjZCBuNdpwrrYvIvqwAXqJeXl'},
              method: 'POST',
              json: json
          }, function (error, response) {
              if (error) {
                console.log('Error sending message: ', error);
              } else if (response.body.error) {
                console.log('Error: ', response.body.error);
              }

              //console.log(response);
          });
        };
	},
  // to enable show greeting(get started button) message , for this we have to handle postback callback and subscribe
  // messaging_postbacks
  
  xmltoJson : function xmltoJson(req,res) {
    //var request = require("request");

    const options = { 
      method: 'GET',
      url: `https://news.google.com/news/rss/search/section/q/blockchain coinTelegraph/blockchain coinTelegraph`,
      qs: { hl: 'en-IN', ned: 'in' },
      headers: 
        { 
        'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36",
         'cache-control': 'no-cache',

        } 
    };


    let messages = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "list",
          "top_element_style": "compact",
          "elements": null,
          "buttons": [
            {
              "title": "View More",
              "type": "postback",
              "payload": "payload"            
            }
          ]
        }
      }
    }    

    request(options, function (error, response, body) {
      if (error)  {
        return console.log(error);
      }
      
      var parseString = require('xml2js').parseString;
      //var xml = body;
      parseString(body, function (err, result) {
       // console.log((((result.rss.channel)[0]).item));
       // console.log((((result.rss.channel)[0].item)[0]).description.join().trim())
        let reducedArray = ((result.rss.channel)[0]).item.reduce(function(arr,curr,i) {
          
          if (i < 4) {
             arr.push ({
              "title": curr.title.join(''),
              "subtitle":   curr.title.join('').slice(0,15),
              //"image_url": "https://peterssendreceiveapp.ngrok.io/img/collection.png",          
              "buttons": [
                {
                  "title": "View",
                  "type": "web_url",
                  "url": curr.link.join(''),
                  "messenger_extensions": true,
                  "webview_height_ratio": "tall",
                  "fallback_url": "https://blockchainevangelist.in/"            
                }
              ]
            }) 
          }
           

                   
          return arr;
        },[]);

        messages.attachment.payload.elements = reducedArray

        res.send(messages);
      }); 

    });

  },
  sendMessage : function (req,res) {

    var options = { 
      url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token: 'EAABzjRLllHgBABHjf4jadxDvpKoGUp7Q5P4VfP9vYrqYkKZASpnH0Yvx5aZAbLD9NwRTF8zndZC7F2ldLe3pFZBwmo0hee6nC2FsSYlLJaouHJWLwRzMAIEIwp8pCchFkZCo5BxhP1JgZCU9dBbmepzfhStOXjZBjZCBuNdpwrrYvIvqwAXqJeXl'},
        method: 'POST',
        json: {
          recipient: { id: '1701904353175444' },
          message: { 
            "attachment": {
            "type": "template",
              "payload": {
                  "template_type": "list",
                  "top_element_style": "compact",
                  "elements": [
                      {
                          "title": "Trump Administration Focuses on Blockchain Technology Adoption",
                          "subtitle": "Trump Administr",
                          "buttons": [
                              {
                                  "title": "View",
                                  "type": "web_url",
                                  "url": "https://cointelegraph.com/news/trump-administration-focuses-on-blockchain-technology-adoption",
                                  "messenger_extensions": true,
                                  "webview_height_ratio": "tall",
                                  "fallback_url": "https://blockchainevangelist.in/"
                              }
                          ]
                      },
                      {
                          "title": "Blockchain Powers Shift To Decentralization In Media",
                          "subtitle": "Blockchain Powe",
                          "buttons": [
                              {
                                  "title": "View",
                                  "type": "web_url",
                                  "url": "https://cointelegraph.com/news/blockchain-powers-shift-to-decentralization-in-media",
                                  "messenger_extensions": true,
                                  "webview_height_ratio": "tall",
                                  "fallback_url": "https://blockchainevangelist.in/"
                              }
                          ]
                      },
                      {
                          "title": "Hyperledger Blockchain 'Shadows' Canadian Bank's International Payments",
                          "subtitle": "Hyperledger Blo",
                          "buttons": [
                              {
                                  "title": "View",
                                  "type": "web_url",
                                  "url": "https://cointelegraph.com/news/hyperledger-blockchain-shadows-canadian-banks-international-payments",
                                  "messenger_extensions": true,
                                  "webview_height_ratio": "tall",
                                  "fallback_url": "https://blockchainevangelist.in/"
                              }
                          ]
                      },
                      {
                          "title": "Tokenization: The Force Behind Blockchain Technology",
                          "subtitle": "Tokenization: T",
                          "buttons": [
                              {
                                  "title": "View",
                                  "type": "web_url",
                                  "url": "https://cointelegraph.com/news/tokenization-the-force-behind-blockchain-technology",
                                  "messenger_extensions": true,
                                  "webview_height_ratio": "tall",
                                  "fallback_url": "https://blockchainevangelist.in/"
                              }
                          ]
                      }
                  ]
              }
            } 
          }
        }
    };

    request(options, function (error, response, body) {
      if (error) {
          console.log('Error sending message: ', error);
        } else if (response.body.error) {
          console.log('Error: ', response.body.error);
        }
        //console.log(body);
        res.send(body);
    });

  },
  payloadHandler :  function payloadHandler(req,res) {

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
  },
  whiteListDomains : function(req,res) {

    var options = { method: 'POST',
      url: 'https://graph.facebook.com/v2.6/me/messenger_profile',
      qs: { access_token: 'EAABzjRLllHgBABHjf4jadxDvpKoGUp7Q5P4VfP9vYrqYkKZASpnH0Yvx5aZAbLD9NwRTF8zndZC7F2ldLe3pFZBwmo0hee6nC2FsSYlLJaouHJWLwRzMAIEIwp8pCchFkZCo5BxhP1JgZCU9dBbmepzfhStOXjZBjZCBuNdpwrrYvIvqwAXqJeXl' },
      headers: { 'content-type': 'application/json' },
      body: 
       { whitelisted_domains: 
          [ 'https://coinmarketcap.com','https://blockchainevangelist.in','https://cointelegraph.com','https://www.coindesk.com'] },
      json: true };

    request(options, function (error, response, body) {
      if (error) throw new Error(error);

      res.send(body);
    });
  }
};

module.exports = webhooks;