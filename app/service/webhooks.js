'use strict';
const request = require('request');

const mapping= require('./mapping.json');
const about = require('./about.json');

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

        /**
         * To process message sent by user except postback
         * @param event
         */

        function procressMessage(event) {
            let sender ,text ;
                sender = event.sender.id;

            if (!!event && !!event.message) {

                if (event.message.text) {
                   text = event.message.text;
                   const formattedMsg = text.toLowerCase().trim();

                   // If we receive a text message, check to see if it matches any special
                   // keywords and send back the corresponding  detail.
                    

                    if (formattedMsg.indexOf(":") >= 0) {
                        senderAction ({sender : sender ,action : 'typing_on'});
                        getdata({key :formattedMsg ,sender :sender });
                    }
                    else if (formattedMsg.indexOf("-") >= 0) {
                        if (formattedMsg.split("-")[1] === "news") {
                            senderAction ({sender : sender ,action : 'typing_on'});
                            getXml({key : mapping[formattedMsg.split("-")[0]] || "bitcoin" ,sender :sender ,page :1});
                        }
                        else if (formattedMsg.split("-")[1] === "about") {
                            //senderAction ({sender : sender ,action : 'typing_on'});
                            getAbout({key : formattedMsg , sender :  sender});
                            //senderAction ({sender : sender ,action : 'typing_off'});
                        }
                        else {
                            sendMessage({sender : sender  ,text : `no data found for ${formattedMsg.split("-")[1]}`});
                        }
                    }
                    else if (formattedMsg.indexOf("=") >= 0 && !! formattedMsg.split("=")[1]) {
                        senderAction ({sender : sender ,action : 'typing_on'});
                        getDapps({ key : formattedMsg.split("=")[1] ,sender : sender });
                    }
                    else {
                        switch (formattedMsg) {
                            case "blockchain":
                                senderAction ({sender : sender ,action : 'typing_on'});
                                getXml({key :'blockchain' ,sender :sender ,page :1});
                                break;
                            case "cryptocurrenicies":
                                senderAction ({sender : sender ,action : 'typing_on'});
                                getXml({key :'cryptocurrency' ,sender :sender ,page : 1 });
                                break;
                            case "crypto":
                                senderAction ({sender : sender ,action : 'typing_on'});
                                getXml({key :'cryptocurrency' ,sender :sender ,page :1 });
                                break;
                            default:
                                sendMessage({sender : sender ,text : text});
                        }
                    } 

                } else if (event.message.attachments) {
                  text = "Sorry, I don't understand your request.";
                  sendMessage({sender : sender ,text : text});
                }
            }
        };

        function getDapps(data) {

            const limit = data.limit || 4;
            const lastIndex = !!data.page ? (parseInt(data.page || 1) - 1)*limit : 0;


            const messages = {
                "attachment": {
                    "type": "template",
                    "payload": {
                        "template_type": "list",
                        "top_element_style": "compact",
                        "elements": null
                        // ,
                        // "buttons": [
                        //     {
                        //         "title": "View More",
                        //         "type": "postback",
                        //         "payload": "payload"
                        //     }
                        // ]
                    }
                }
            };

            const options = {
                method: 'GET',
                url: 'https://api.stateofthedapps.com/v1/dapps',
                qs:
                    { category: 'recently added',
                        refine: 'nothing',
                        'tags[]': data.key,
                        text: ''
                    },
                headers:
                    {
                        'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36",
                        'cache-control': 'no-cache'
                    }
            };

            request(options, function (error, response, body) {
                if (error) throw new Error(error);

                let dapps = JSON.parse(body);

                console.log(dapps);

                if(Array.isArray(dapps) && dapps.length > 0) {
                    let reducedArray = dapps.slice(lastIndex,lastIndex+4).reduce(function(arr,curr,i) {


                        arr.push ({
                          "title": curr.teaser,
                          "subtitle":   curr.name,
                          //"image_url": "https://peterssendreceiveapp.ngrok.io/img/collection.png",
                          "buttons": [
                            {
                              "title": "View",
                              "type": "web_url",
                              "url": `https://www.stateofthedapps.com/dapps/${curr.slug}`,
                              "messenger_extensions": true,
                              "webview_height_ratio": "tall",
                              "fallback_url": "https://blockchainevangelist.in/"
                            }
                          ]
                        });


                      return arr;
                    },[]);
                    //
                    messages.attachment.payload.elements = reducedArray;
                    sendMessage({sender : data.sender  ,attachment : messages.attachment });
                }
                else {
                    sendMessage({sender : data.sender  ,text : `no dApps found for ${data.key} category`});
                }

                sendMessage({sender : data.sender  ,attachment : messages.attachment });
            });

        }

        /**
         * To get about coin - coin info from about.json
         * @param data
         */

        function getAbout(data) {
            if (!!about[data.key.split("-")[0]]) {
                sendMessage({sender : data.sender  ,text :about[data.key.split("-")[0]] });
            }
            else {
                sendMessage({sender : data.sender  ,text : `no data found for ${data.key.split("-")[0]}`});
            }
        };

        /**
         * To show bot is typing on or typing off
         * @param data
         */

        function senderAction(data) {

            const json = {
                recipient : { id : data.sender},
                sender_action : data.action || 'typing_on'
            }

            const options = {
                method : 'POST',
                url : 'https://graph.facebook.com/v2.6/me/messages',
                qs: {access_token: 'EAABzjRLllHgBABHjf4jadxDvpKoGUp7Q5P4VfP9vYrqYkKZASpnH0Yvx5aZAbLD9NwRTF8zndZC7F2ldLe3pFZBwmo0hee6nC2FsSYlLJaouHJWLwRzMAIEIwp8pCchFkZCo5BxhP1JgZCU9dBbmepzfhStOXjZBjZCBuNdpwrrYvIvqwAXqJeXl'},
                json: json
            }

            request(options, function (error, response) {
                if (error) {
                    console.log('Error sending message: ', error);
                } else if (response.body.error) {
                    console.log('Error: ', response.body.error);
                }
                //console.log(response);
            });
        }

        /**
         * To get altcoin pricing
         * @param data
         */
        function getdata(data) {
            let requestOptions ='',url = '';
                url = `https://api.coinmarketcap.com/v1/ticker/${mapping[data.key.split(":")[0]]}/?convert=${data.key.split(":")[1]}`;

            if (!!mapping[data.key.split(":")[0]]) {
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
                        return sendMessage({sender : data.sender  ,text : 'something went wrong...'});
                    }

                    const price_data = JSON.parse(body);
                    let pushString = `current ${data.key.split(":")[0].toUpperCase()} price is ${Math.round((price_data[0])['price_'+data.key.split(":")[1]]) || Math.round((price_data[0])['price_usd'])} ${ (price_data[0])['price_'+data.key.split(":")[1]] ? data.key.split(":")[1].toUpperCase() : 'USD'  }`;

                    sendMessage({sender : data.sender  ,text : pushString});
                });
            }
            else {
                sendMessage({sender : data.sender  ,text : `No data found for ${data.key.split(":")[1]} symbol` });
            }
        };

        /**
         * To get xml from google rss feed
         * @param data
         */

        function getXml(data) {
           // @TO do - user IP parmaeter
            //let lastIndex = 0;
            const limit = data.limit || 4;
            const lastIndex = !!data.page ? (parseInt(data.page || 1) - 1)*limit : 0;

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

            const messages = {
                "attachment": {
                    "type": "template",
                    "payload": {
                        "template_type": "list",
                        "top_element_style": "compact",
                        "elements": null
                    }
                }
            };


            if (data.page < 3) {
                messages.attachment.payload.buttons = [
                    {
                        "title": "View More",
                        "type": "postback",
                        // test if we can pass object
                        "payload": `view more payload ${parseInt(data.page || 1)+1}`
                    }
                ]
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

                    let reducedArray = ((result.rss.channel)[0]).item.slice(lastIndex,lastIndex+limit).reduce(function(arr,curr,i) {
                        
                        arr.push ({
                              "title": curr.title.join(''),
                              "subtitle": `${curr.title.join('').slice(0,25)} ...`,
                              //"image_url": "https://peterssendreceiveapp.ngrok.io/img/collection.png",
                              "buttons": [
                                    {
                                      "title": "View",
                                      "type": "web_url",
                                      "url": curr.link.join(''),
                                      "messenger_extensions": true,
                                      "webview_height_ratio": "tall",
                                      // @TO DO - why fallback url coming in web view , in messenger it is working fine
                                      "fallback_url": "https://blockchainevangelist.in/"
                                    }
                              ]
                        });
                      
                      return arr;
                    },[]);
                       messages.attachment.payload.elements = reducedArray;

                       sendMessage({sender : data.sender  ,attachment : messages.attachment });
                  } else {
                      senderAction ({sender : data.sender ,action : 'typing_off'});
                      sendMessage({sender : data.sender  ,text : 'Sorry, No result found'});
                  }
                });
              });
        };

        /**
         * used to process the postback like when clieck on get started or on left menu - means any button
         * @param event
         */

        function processPostback(event) {
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
                    sendMessage({sender : senderId ,text: 'To know coin prices in any fiat curreny just write "coin:symbol" (eg: btc:usd) ,' +
                    'to know latest news of a coin type "coin-news" (eg: btc-news) and to know about a coin type "coin-about" (eg: btc-about)' });
                });
            }
            else if (payload === 'help') {
                sendMessage({sender : senderId ,text: 'To know coin prices in any fiat curreny just write "coin:symbol" (eg: btc:usd) ,' +
                'to know latest news of a coin type "coin-news" (eg: btc-news) and to know about a coin type "coin-about" (eg: btc-about)' });
            }
            else if (payload === 'dapps') {
                sendMessage({sender : senderId ,text:  'To get list of dApps related to a category type "dapp=category" (eg: dapp=insurance)'});
            }
            else if (payload.indexOf("view more payload") >= 0) {
                senderAction ({sender : senderId ,action : 'typing_on'});
                getXml({key :'cryptocurrency' ,sender :senderId ,page : parseInt(payload.match(/\d+/g)[0])});
            }
        };

        /**
         * To send messages to user
         * @param data - accepts sender id and type of data
         */

        function sendMessage(data) {

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

            request({
                url: 'https://graph.facebook.com/v2.6/me/messages',
                qs: {access_token: 'EAABzjRLllHgBABHjf4jadxDvpKoGUp7Q5P4VfP9vYrqYkKZASpnH0Yvx5aZAbLD9NwRTF8zndZC7F2ldLe3pFZBwmo0hee6nC2FsSYlLJaouHJWLwRzMAIEIwp8pCchFkZCo5BxhP1JgZCU9dBbmepzfhStOXjZBjZCBuNdpwrrYvIvqwAXqJeXl'},
                method: 'POST',
                json: json
            }, function (error, response,body) {

                if (!error && response.statusCode == 200) {
                    const recipientId = body.recipient_id;
                    const messageId = body.message_id;

                    console.log("Successfully sent generic message with id %s to recipient %s", messageId, recipientId);
                    senderAction ({sender : data.sender ,action : 'typing_off'});

                    if (!!data.again && !!data.again.send)   {s
                        sendMessage({ sender : data.sender ,text :  data.again.text });
                    }

                }
                else {
                    console.error("Unable to send message.");
                    console.error(response);
                    console.error(error);
                }

            });
        };
	},
    // to enable show greeting(get started button) message , for this we have to handle postback callback and subscribe
    // messaging_postbacks
    xmltoJson : function xmltoJson(req,res) {

        let lastIndex = 0;
        let limit = req.query.limit || 4;
        lastIndex = !!req.query && req.query.n ? (parseInt(req.query.n) - 1)*limit : 0;

        const options = { 
          method: 'GET',
          url: `https://news.google.com/news/rss/search/section/q/dgb coinTelegraph/dgb coinTelegraph`,
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
        };
   
        request(options, function (error, response, body) {

            if (error)  {
                return console.log(error);
            }
          
            let parseString = require('xml2js').parseString;
            parseString(body, function (err, result) {



                // let reducedArray = ((result.rss.channel)[0]).item.slice(lastIndex,lastIndex+4).reduce(function(arr,curr,i) {
                //
                //
                //     arr.push ({
                //       "title": curr.title.join(''),
                //       "subtitle":   curr.title.join('').slice(0,15),
                //       //"image_url": "https://peterssendreceiveapp.ngrok.io/img/collection.png",
                //       "buttons": [
                //         {
                //           "title": "View",
                //           "type": "web_url",
                //           "url": curr.link.join(''),
                //           "messenger_extensions": true,
                //           "webview_height_ratio": "tall",
                //           "fallback_url": "https://blockchainevangelist.in/"
                //         }
                //       ]
                //     });
                //
                //
                //   return arr;
                // },[]);
                //
                // messages.attachment.payload.elements = reducedArray

                res.send(result);
            }); 
        });
    },
    sendMessage : function (req,res) {

        // const json = {
        //     recipient : { id : '1701904353175444'},
        //     sender_action : 'typing_on'
        // };
        //
        // const options1 = {
        //     method : 'POST',
        //     url : 'https://graph.facebook.com/v2.6/me/messages',
        //     qs: {access_token: 'EAABzjRLllHgBABHjf4jadxDvpKoGUp7Q5P4VfP9vYrqYkKZASpnH0Yvx5aZAbLD9NwRTF8zndZC7F2ldLe3pFZBwmo0hee6nC2FsSYlLJaouHJWLwRzMAIEIwp8pCchFkZCo5BxhP1JgZCU9dBbmepzfhStOXjZBjZCBuNdpwrrYvIvqwAXqJeXl'},
        //     json: json
        // }
        //
        // request(options1, function (error, response) {
        //     if (error) {
        //         console.log('Error sending message: ', error);
        //     } else if (response.body.error) {
        //         console.log('Error: ', response.body.error);
        //     }
        //     //console.log(response);
        // });

        const options = { 
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
    welcomeScreen :  function payloadHandler(req,res) {

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
    },
    appMenu : function(req,res) {
        const options = {
            method: 'POST',
            url: 'https://graph.facebook.com/v2.6/me/thread_settings',
            qs: { access_token: 'EAABzjRLllHgBABHjf4jadxDvpKoGUp7Q5P4VfP9vYrqYkKZASpnH0Yvx5aZAbLD9NwRTF8zndZC7F2ldLe3pFZBwmo0hee6nC2FsSYlLJaouHJWLwRzMAIEIwp8pCchFkZCo5BxhP1JgZCU9dBbmepzfhStOXjZBjZCBuNdpwrrYvIvqwAXqJeXl' },
            headers: { 'content-type': 'application/json' },
            body: 
            { 
                "setting_type" : "call_to_actions",
                "thread_state" : "existing_thread",
                "call_to_actions":[
                    {
                      "type":"postback",
                      "title":"Help",
                      "payload":"help"
                    },
                    {
                          "type":"postback",
                          "title":"Dapps",
                          "payload":"dapps"
                    },
                    {
                      "type":"web_url",
                      "title":"View Website",
                      "url":"https://blockchainevangelist.in/"
                    }
                ]

            },
            json: true 
        };

        request(options, function (error, response, body) {
          if (error) throw new Error(error);

          res.send(body);
        });
    },
    getData : function getData(req,res) {
	    //console.log(mapping.btc);

        var data  = {
            key : 'btc:lllll'
        }

        let requestOptions ='',url = '';
                url = `https://api.coinmarketcap.com/v1/ticker/${mapping[data.key.split(":")[0]]}/?convert=${data.key.split(":")[1]}`;
            
        requestOptions = {
            method: 'GET',
            url :  url,
            headers:
            { 'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36"
            }
        };

        console.log('coming');
        console.log(url);

        request(requestOptions, function requestOptions(error, response, body) {
            if (error) {
              console.log(error);
            }

            //console.log(response);

            const price_data = JSON.parse(body);

            console.log(price_data);

            let pushString = `current ${data.key.split(":")[0].toUpperCase()} price is ${Math.round((price_data[0])['price_'+data.key.split(":")[1]]) || Math.round((price_data[0])['price_usd'])} ${ (price_data[0])['price_'+data.key.split(":")[1]] ? data.key.split(":")[1].toUpperCase() : 'USD'  }`;

            console.log(pushString);
            res.send(pushString);
        });
    },
    genericTemplate : function genericTemplate(req,res) {
        const messageData = {
            recipient: {
                id: '1701904353175444'
            },
            message: {
                attachment: {
                    type: "template",
                    payload: {
                        template_type: "generic",
                        elements: [{
                            title: "rift",
                            subtitle: "Next-generation virtual reality",
                            item_url: "https://www.oculus.com/en-us/rift/",
                            image_url: "http://messengerdemo.parseapp.com/img/rift.png",
                            buttons: [{
                                type: "web_url",
                                url: "https://www.oculus.com/en-us/rift/",
                                title: "Open Web URL"
                            }, {
                                type: "postback",
                                title: "Call Postback",
                                payload: "Payload for first bubble",
                            }],
                        }, {
                            title: "touch",
                            subtitle: "Your Hands, Now in VR",
                            item_url: "https://www.oculus.com/en-us/touch/",
                            image_url: "http://messengerdemo.parseapp.com/img/touch.png",
                            buttons: [{
                                type: "web_url",
                                url: "https://www.oculus.com/en-us/touch/",
                                title: "Open Web URL"
                            }, {
                                type: "postback",
                                title: "Call Postback",
                                payload: "Payload for second bubble",
                            }]
                        }]
                    }
                }
            }
        };


        console.log('coming');


        const options = {
            url: 'https://graph.facebook.com/v2.6/me/messages',
            qs: {access_token: 'EAABzjRLllHgBABHjf4jadxDvpKoGUp7Q5P4VfP9vYrqYkKZASpnH0Yvx5aZAbLD9NwRTF8zndZC7F2ldLe3pFZBwmo0hee6nC2FsSYlLJaouHJWLwRzMAIEIwp8pCchFkZCo5BxhP1JgZCU9dBbmepzfhStOXjZBjZCBuNdpwrrYvIvqwAXqJeXl'},
            method: 'POST',
            json: messageData
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
    getDapps : function getDapps(req,res) {

        const options = {
            method: 'GET',
            url: 'https://api.stateofthedapps.com/v1/dapps',
            qs:
                { category: 'recently added',
                    refine: 'nothing',
                    'tags[]': 'insurance',
                    text: ''
                },
            headers:
                {
                    'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36",
                    'cache-control': 'no-cache'
                }
        };

        request(options, function (error, response, body) {
            if (error) throw new Error(error);

            res.send(JSON.parse(body));
        });

    }
};

module.exports = webhooks;