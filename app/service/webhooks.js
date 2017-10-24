'use strict';
const request = require('request');

// const mapping= require('./mapping.json');
const about = require('./about.json');

const smiley = ':)';
const url = require('url');

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
                // entry.time => time of update in milliseconds
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

                console.log(JSON.stringify(event.messages,null,6));

                if (event.message.text) {

                    // for handling click on quick reply messages
                    if (!!event.message.text.quick_reply && !!event.message.text.quick_reply.payload) {
                       console.log('quick_reply click detected');
                    }


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
                            getXml({key : about[formattedMsg.split("-")[0]].symbolToName || "bitcoin" ,sender :sender ,page :1});
                        }
                        else if (formattedMsg.split("-")[1] === "about") {
                            //senderAction ({sender : sender ,action : 'typing_on'});
                            getAbout({key : formattedMsg , sender :  sender});
                            //senderAction ({sender : sender ,action : 'typing_off'});
                        }
                        else if (/(tweet)+(s|er)?$/.test(formattedMsg.split("-")[1])) {
                            getTweets({ key : about[formattedMsg.split("-")[0]].tweetId , sender : sender });
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

                }
                else if (event.message.attachments) {
                    console.log(event.message.attachments);
                    console.log(JSON.stringify(event.message.attachments,null,6));
                    // like button sticker ids - 369239263222822 for the small one, 369239383222810 for
                    // the big one and 369239343222814 for the medium one
                  text = "Sorry, I don't understand your request.";
                  sendMessage({sender : sender ,text : text});
                }
            }
        };


        /**
         * To get data from coin handler
         * @param data
         */

        function getTweets(data) {

            const params = {
                from : `@${data.key}`,
                count: 4,
                result_type: 'recent',
                lang: 'en'
            };


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

            req.app.config.T.get('search/tweets', params, function(err, body, response) {
                if (!err) {
                    // Loop through the returned tweets

                    let reducedArray = body.statuses.reduce(function(arr,curr,i) {

                        arr.push ({
                            "title": curr.text,
                            "subtitle":   curr.text.slice(0,15),
                            //"image_url": "https://peterssendreceiveapp.ngrok.io/img/collection.png",
                            "buttons": [
                                {
                                    "title": "View",
                                    "type": "web_url",
                                    "url": curr.entities.urls.length  > 0 ? (curr.entities.urls)[0].url : (!!curr.retweeted_status && !!curr.retweeted_status.id_str  ? (`https://twitter.com/AugurProject/status/${curr.retweeted_status.id_str}`) : `https://twitter.com/${data.key}/status/${curr.id_str}` ),
                                    "messenger_extensions": true,
                                    "webview_height_ratio": "tall",
                                    "fallback_url": "https://blockchainevangelist.in/"
                                }
                            ]
                        });

                        return arr;
                    },[]);


                    if (reducedArray.length > 0 ) {
                        messages.attachment.payload.elements = reducedArray;

                        //client.set('some key', 'some value');

                        // req.app.client.set(`${data.key}-${data.page}`,JSON.stringify(messages.attachment),function(err,reply) {
                        //     console.log(err);
                        //     console.log('set done');
                        //     req.app.client.expire(`${data.key}-${data.page}`, 1800);
                            sendMessage({sender : data.sender  ,  attachment : messages.attachment });
                        // });


                    }
                    else {
                        sendMessage({ sender : data.sender , text : 'Sorry, No more data found'});
                    }

                }
                else {
                    throw new Error(err);
                }
            });
        }

        /**
         *
         * @param data
         */
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

            });

        }

        /**
         * To get about coin - coin info from about.json
         * @param data
         */

        function getAbout(data) {
            if (!!about[data.key.split("-")[0]].about) {
                sendMessage({sender : data.sender  ,text :about[data.key.split("-")[0]].about });
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
                // typing_on || typing_off || mark_seen
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
                url = `https://api.coinmarketcap.com/v1/ticker/${about[data.key.split(":")[0]].symbolToName}/?convert=${data.key.split(":")[1]}`;

            if (!!about[data.key.split(":")[0]].symbolToName) {
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



            // redis
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


            req.app.client.get(`${data.key}-${data.page}`,function(err,reply) {

                if (err) {
                    throw new Error(err);
                }


                if (!!reply) {
                    console.log('found');
                    //console.log(JSON.parse(reply));
                    //return res.send(JSON.parse(reply));
                    return sendMessage({sender : data.sender  ,  attachment : JSON.parse(reply) });
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

                                const domain = url.parse(curr.link.join(''));

                                if (req.app.config.messengerBot.whitelistedDomains.indexOf(`${domain.protocol}//${domain.host}`) >=0) {
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
                                }

                                return arr;
                            },[]);

                            // if no articles found by whitelisted domain then send text
                            if (reducedArray.length > 0 ) {
                                messages.attachment.payload.elements = reducedArray;

                                //client.set('some key', 'some value');

                                req.app.client.set(`${data.key}-${data.page}`,JSON.stringify(messages.attachment),function(err,reply) {
                                    console.log(err);
                                    console.log('set done');
                                    req.app.client.expire(`${data.key}-${data.page}`, 1800);
                                    sendMessage({sender : data.sender  ,  attachment : messages.attachment });
                                });


                            }
                            else {
                                sendMessage({ sender : data.sender , text : 'Sorry, No more data found'});
                            }

                        } else {
                            senderAction ({sender : data.sender ,action : 'typing_off'});
                            sendMessage({sender : data.sender  ,text : 'Sorry, No result found'});
                        }
                    });
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
                        greeting = `Hi  ${name} ${smiley} .`;
                    }
                    let message = greeting + "My name is BlockChain Evangelist Bot. I can tell you various details regarding blockchain,cryptocurriencies. What topic would you like to know about?";

                    sendMessage({sender : senderId ,text : message , again : {send : true ,text: 'To know coin prices in any fiat curreny just write "coin:symbol" (eg: btc:usd) ,' +
                    'to know latest news of a coin type "coin-news" (eg: btc-news) and to know about a coin type "coin-about" (eg: btc-about)' }});
                });
            }
            else if (payload === 'help') {
                sendMessage({sender : senderId ,text: 'To know coin prices in any fiat curreny just write "coin:symbol" (eg: btc:usd) ,' +
                'to know latest news of a coin type "coin-news" (eg: btc-news) and to know about a coin type "coin-about" (eg: btc-about)' });
            }
            else if (payload === 'dapps') {
                sendMessage({sender : senderId ,text:  'To get list of dApps related to a category type "dapps=category" (eg: dapps=insurance)'});
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

                    if (!!data.again && !!data.again.send)   {
                        sendMessage({ sender : data.sender ,text :  data.again.text });
                    }
                    else {
                        /* ## TODO
                           - microservice or rabbitmq
                         */
                        req.app.db.models.User.findOneAndUpdate(
                            { 'uid' : data.sender },
                            { $setOnInsert: { lastLogin: new Date() } },
                            { new: true, upsert: true ,select: { uid: 1 } },
                            function findOne(err, user) {
                            if (!err) {
                                 return console.log('user saved');
                            }

                            console.log('user error');
                            console.log(err);
                        });
                    }

                }
                else {
                    console.error("Unable to send message.");
                    console.error(response.body.error);
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
        };


        req.app.client.get("blockchain-2",function(err,reply) {
            console.log(err);


            if(reply) {
                console.log('found');
                console.log(JSON.parse(reply));
                return res.send(JSON.parse(reply));
            }
            else {
                console.log('not');
            }

            console.log('not coming');

            request(options, function (error, response, body) {

                if (error)  {
                    return console.log(error);
                }

                let parseString = require('xml2js').parseString;
                parseString(body, function (err, result) {



                    let reducedArray = ((result.rss.channel)[0]).item.slice(lastIndex,lastIndex+4).reduce(function(arr,curr,i) {


                        //console.log(req.app.config);


                        const domain = url.parse(curr.link.join(''));

                        console.log(`${domain.protocol}//${domain.host}`);
                        console.log(req.app.config.messengerBot.whitelistedDomains.indexOf(`${domain.protocol}//${domain.host}`));

                        if (req.app.config.messengerBot.whitelistedDomains.indexOf(`${domain.protocol}//${domain.host}`) >=0) {
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
                            });
                        }
                        else {
                            console.log('not');
                            console.log(curr.link.join(''));
                        }




                        return arr;
                    },[]);

                    messages.attachment.payload.elements = reducedArray;

                    /*
                        there is one drawback of this JSON.stringify--> You can not retrieve parts of the object You can not specify the selection of certain keys.
                        You necessarily need to retrieve everything, which is likely to become a performance issue on really large objects
                    */

                    req.app.client.set(`blockchain-2`,JSON.stringify(messages),function(err,reply) {
                        console.log(err);
                        console.log(reply);
                        res.send(messages);
                    });

                });
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
            req.app.db.models.User.findOneAndUpdate(
                { 'uid' : '1701904353175444' },
                { $setOnInsert: { lastLogin: new Date() } },
                { new: true, upsert: true ,select: { uid: 1 } },
                function findOne(err, user) {
                    if (!err) {
                        console.log('user saved');
                    }

                    console.log('user error');
                    res.send(body);
                });

        });
    },
    alerts_BreakingNews : function (req,res) {

        req.app.utility.agenda.now('buy ,sell ,ico alerts and breaking news', { msg: req.body.msg });
        res.send('ok');
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
              [ 'https://t.co','https://twitter.com','https://coinmarketcap.com','https://www.stateofthedapps.com','https://blockchainevangelist.in','https://cointelegraph.com','https://www.coindesk.com'] },
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
            key : 'ok:inr'
        }

        let requestOptions ='',url = '';
                url = `https://api.coinmarketcap.com/v1/ticker/${about[data.key.split(":")[0]].symbolToName}/?convert=${data.key.split(":")[1]}`;
            
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
    buttonTemplate :  function buttonTemplate(req,res) {



        const messageData = {
            recipient: {
                id: '1701904353175444'
            },
            message: {
                "attachment":{
                    "type":"template",
                        "payload":{
                       "template_type":"button",
                            "text":"What do you want to do next?",
                            "buttons":[
                            {
                                "type":"web_url",
                                "url":"https://cointelegraph.com/news/american-billionaire-investor-mark-cuban-claims-cryptocurrencies-and-blockchain-are-future",
                                "title":"ICO"
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

    },
    openGraph : function (req,res) {
        const messageData = {
            recipient: {
                id: '1701904353175444'
            },
            message: {
                attachment: {
                    type: "template",
                    payload: {
                        template_type: "open_graph",
                        elements:[
                            {
                                "url":"https://player.fm/series/1443548/188819684",
                                "buttons":[
                                    {
                                        "type":"web_url",
                                        "url":"https://player.fm/series/b21-block-cryptocurrency-blockchain-school",
                                        "title":"View More"
                                    }
                                ]
                            }
                        ]
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
    receiptTemplate : function (req,res) {
        const messageData = {
            recipient: {
                id: '1701904353175444'
            },
            message: {
                attachment: {
                    type: "template",
                    "payload":{
                        "template_type":"receipt",
                        "recipient_name":"Stephane Crozatier",
                        "order_number":"12345678902",
                        "currency":"USD",
                        "payment_method":"Visa 2345",
                        "order_url":"http://petersapparel.parseapp.com/order?order_id=123456",
                        "timestamp":"1428444852",
                        "address":{
                            "street_1":"1 Hacker Way",
                            "street_2":"",
                            "city":"Menlo Park",
                            "postal_code":"94025",
                            "state":"CA",
                            "country":"US"
                        },
                        "summary":{
                            "subtotal":75.00,
                            "shipping_cost":4.95,
                            "total_tax":6.19,
                            "total_cost":56.14
                        },
                        "adjustments":[
                            {
                                "name":"New Customer Discount",
                                "amount":20
                            },
                            {
                                "name":"$10 Off Coupon",
                                "amount":10
                            }
                        ],
                        "elements":[
                            {
                                "title":"Classic White T-Shirt",
                                "subtitle":"100% Soft and Luxurious Cotton",
                                "quantity":2,
                                "price":50,
                                "currency":"USD",
                                "image_url":"http://petersapparel.parseapp.com/img/whiteshirt.png"
                            },
                            {
                                "title":"Classic Gray T-Shirt",
                                "subtitle":"100% Soft and Luxurious Cotton",
                                "quantity":1,
                                "price":25,
                                "currency":"USD",
                                "image_url":"http://petersapparel.parseapp.com/img/grayshirt.png"
                            }
                        ]
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
    quickReplies : function (req,res) {
        const messageData = {
            recipient: {
                id: '1701904353175444'
            },
            message:{
                "text": "Here's a quick reply!",
                "quick_replies":[
                    {
                        "content_type":"text",
                        "title":"Search",
                        "payload":"dapps"
                    },
                    {
                        "content_type":"location"
                    },
                    {
                        "content_type":"text",
                        "title":"Something Else",
                        "payload":"dapps"
                    }
                ]
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
    getTweets : function (req,res) {

	   // console.log(req.query.t);
	    console.log(/(tweet)+(s|er)?$/.test(req.query.t));
        const params = {
            from : '@AugurProject',
            count: 7,
            result_type: 'recent',
            lang: 'en'
        };

        req.app.config.T.get('search/tweets', params, function(err, data, response) {
            if (!err) {
                // Loop through the returned tweets

                //console.log(data.statuses);

                let reducedArray = data.statuses.reduce(function(arr,curr,i) {
                        console.log(i);
                        arr.push ({
                            "title": curr.text,
                            "subtitle":   curr.text.slice(0,15),
                            //"image_url": "https://peterssendreceiveapp.ngrok.io/img/collection.png",
                            "buttons": [
                                {
                                    "title": "View",
                                    "type": "web_url",
                                    "url": curr.entities.urls.length  > 0 ? (curr.entities.urls)[0].url : (!!curr.retweeted_status && !!curr.retweeted_status.id_str  ? (`https://twitter.com/AugurProject/status/${curr.retweeted_status.id_str}`) : `https://twitter.com/AugurProject/status/${curr.id_str}` ),
                                    "messenger_extensions": true,
                                    "webview_height_ratio": "tall",
                                    "fallback_url": "https://blockchainevangelist.in/"
                                }
                            ]
                        });

                    return arr;
                },[]);

                res.send(reducedArray);

            } else {
                console.log(err);
            }
        })

    }
};

module.exports = webhooks;