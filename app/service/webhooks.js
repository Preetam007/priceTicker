'use strict';
const request = require('request');
const cities = require('cities');

// const mapping= require('./mapping.json');
const about = require('./about.json');
const reply_data = require('./blockchain_crypto.json');
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
                    console.log(JSON.stringify(event,null,6));

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
         * nlp logic and entities
         */

        function getEntity(nlp, name) {
            return nlp && nlp.entities && nlp.entities && nlp.entities[name] && nlp.entities[name][0];
        }

        /**
         * To process message sent by user except postback
         * @param event
         */

        function procressMessage(event) {
            let sender ,text ;
                sender = event.sender.id;

            if (!!event && !!event.message) {

                if (!!event.message.text) {

                    // for handling click on quick reply messages
                    if (!!event.message.quick_reply && !!event.message.quick_reply.payload) {

                        console.log('quick reply payload');

                        // set postback manually
                        event.postback = event.message.quick_reply;
                        processPostback(event);
                    }
                    else {
                        text = event.message.text;
                        const formattedMsg = text.toLowerCase().trim();

                        /*
                           intergate NLP(wit.ai) logics
                         */

                        const nlp = getEntity(event.message.nlp, 'action');
                        if (nlp && nlp.confidence > 0.8) {
                            //sendResponse('Hi there!');
                            console.log('detected');
                        } else {
                            // default logic
                        }

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
                        else if (formattedMsg === 'home' || formattedMsg === 'start') {
                            event.postback = { payload : "Greeting" ,home : true };
                            processPostback(event);
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
                }
                else if (event.message.attachments) {

                    console.log(JSON.stringify(event,null,6));

                    event.message.attachments.forEach((entry) => {
                        // entry.time => time of update in milliseconds
                        if (entry.type == 'location' && entry.payload && entry.payload.coordinates) {
                           const {lat,long} =  entry.payload.coordinates;
                           const limit = 10,page =1;
                           getMeetUps({sender,lat,long,limit,page});
                        }
                        else {
                            text = "Sorry, I don't understand your request.";
                            sendMessage({
                                sender : sender ,
                                text : text,
                                again : {
                                    send : true ,
                                    text: 'what next..',
                                    quick_replies:[
                                        {
                                            "content_type":"text",
                                            "title":"🏠",
                                            "payload":"home"
                                        },
                                        {
                                            "content_type": "text",
                                            "title" : "🔙",
                                            //#TODO - decide payload
                                            "payload" : "blockchain_quick_back"
                                        }
                                    ]
                                }
                            });
                        }

                    });

                    // like button sticker ids - 369239263222822 for the small one, 369239383222810 for
                    // the big one and 369239343222814 for the medium one

                }
            }
        };

        /**
         * TO get mmetups using meetups api - long and lat
         * @param data
         */

        // #TODO - use switch statement
        function getMeetUps(data) {

            const limit = data.limit || 10;
            const lastIndex = !!data.page ? (parseInt(data.page || 1) - 1)*limit : 0;

            const options = {
                method: 'GET',
                url: 'https://api.meetup.com/2/open_events.json',
                qs:
                    { text: 'blockchain',
                        time: ',1m',
                        'lat': data.lat,
                        lon: data.long,
                        key : '2351624b85b603e647464553e35774b'
                    },
                headers:
                    {
                        'content-type': 'application/json',
                        'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36",
                        'cache-control': 'no-cache'
                    }
            };

            const messages = {
                "attachment": {
                    "type": "template",
                    "payload": {
                        "template_type": "generic",
                        "sharable" : true,
                        "elements": null
                    }
                }
            };


            req.app.client.get(`${data.lat.toFixed(3)}meetups${data.long.toFixed(3)}`,function(err,reply) {

                if (err) {
                    console.log(err);
                    throw new Error(err);
                }

                if (!!reply) {
                    console.log('found');
                    return sendMessage({sender: data.sender, attachment: JSON.parse(reply)});
                }

                request(options, function (error, response, body) {
                    if (error) {
                        sendMessage({sender : data.sender ,text : 'No Meetups found for now in next 1 weeek'});
                    }
                    else {
                        const pglen = (JSON.parse(body)).results.length;
                        let reducedArray = (JSON.parse(body)).results.slice(lastIndex,lastIndex+limit).reduce(function(arr,curr,i) {

                                //TODO - one item is missing check slice and if conditions

                                if (pglen > limit && i == limit-1) {

                                    console.log(`blockchain_quick_meetups_more${data.page}_${data.lat}_${data.long}_${limit}`);

                                    arr.push ({
                                        title: 'more options',
                                        buttons: [{
                                            "title": "More Meetups",
                                            "type": "postback",
                                            "payload": `blockchain_quick_meetups_more${data.page}_${data.lat}_${data.long}_${limit}`
                                            },
                                            {
                                                "type":"postback",
                                                "title":"🏠",
                                                "payload":"home"
                                            },
                                            {
                                                "title": "Back",
                                                "type": "postback",
                                                "payload": "blockchain_quick_back"
                                            }
                                        ]
                                    });
                                }
                                else if (i < limit) {
                                    arr.push ({
                                        title: `${curr.status} ${curr.name} meetup`,
                                        subtitle: `${curr.name}`,
                                        item_url: `${curr.event_url}?utm_source=blockchainevangelist&utm_medium=messenger&utm_campaign=messenger_blockchainevangelist`,
                                        image_url: "https://144b1e2a.ngrok.io/images/meetup.png",
                                        buttons: [{
                                            type: "web_url",
                                            url: `${curr.event_url}?utm_source=blockchainevangelist&utm_medium=messenger&utm_campaign=messenger_blockchainevangelist`,
                                            title: "View Meetup"
                                            },
                                            {
                                                "title": "Back",
                                                "type": "postback",
                                                "payload": "blockchain_quick_back"
                                            },
                                            {
                                                "type": "element_share",
                                                "share_contents": {
                                                    "attachment": {
                                                        "type": "template",
                                                        "payload": {
                                                            "template_type": "generic",
                                                            "elements": [
                                                                {
                                                                    title: `${curr.status} ${curr.name} meetup`,
                                                                    subtitle: `${curr.name}`,
                                                                    item_url: `${curr.event_url}?utm_source=blockchainevangelist&utm_medium=messenger&utm_campaign=messenger_blockchainevangelist`,
                                                                    image_url: "http://144b1e2a.ngrok.io/images/meetup.png",
                                                                    "buttons": [
                                                                        {
                                                                            type: "web_url",
                                                                            url: `${curr.event_url}?utm_source=blockchainevangelist&utm_medium=messenger&utm_campaign=messenger_blockchainevangelist`,
                                                                            title: "Open Web URL"
                                                                        }
                                                                    ]
                                                                }
                                                            ]
                                                        }
                                                    }
                                                }
                                            }]
                                    });
                                }

                            return arr;
                        },[]);

                        if (reducedArray.length > 0 ) {
                            //console.log(reducedArray.length);

                            if (reducedArray.length < limit) {
                                reducedArray.push ({
                                    title: 'no more meetups in your area',
                                    buttons: [
                                        {
                                            "type":"postback",
                                            "title":"🏠",
                                            "payload":"home"
                                        },
                                        {
                                            "title": "Back",
                                            "type": "postback",
                                            "payload": "blockchain_quick_back"
                                        }
                                    ]
                                });
                            }
                        }
                        else {
                            if (reducedArray.length < limit) {
                                reducedArray.push ({
                                    title: 'no  meetups found in your area',
                                    buttons: [
                                        {
                                            "type":"postback",
                                            "title":"🏠",
                                            "payload":"home"
                                        },
                                        {
                                            "type": "postback",
                                            "title" : "🔙",
                                            //#TODO - decide payload
                                            "payload" : "blockchain_quick_back"
                                        }
                                    ]
                                });
                            }
                            //sendMessage({ sender : data.sender , text : 'Sorry, No more data found'});
                        }

                        messages.attachment.payload.elements = reducedArray;

                        req.app.client.set(`${data.lat.toFixed(3)}meetups${data.long.toFixed(3)}`,JSON.stringify(messages.attachment),function(err,reply) {
                            //console.log(err);
                            if(err) {
                                console.log(err);
                                console.log('error');
                                sendMessage({
                                    sender : data.sender ,
                                    text : 'Sorry, No more data found',
                                    again : {
                                        send : true ,
                                        text: 'what next..',
                                        quick_replies:[
                                            {
                                                "content_type":"text",
                                                "title":"🏠",
                                                "payload":"home"
                                            },
                                            {
                                                "content_type": "text",
                                                "title" : "🔙",
                                                //#TODO - decide payload
                                                "payload" : "blockchain_quick_back"
                                            }
                                        ]
                                    }
                                });
                            }
                            else {
                                console.log('set done');
                                req.app.client.expire(`${data.lat.toFixed(3)}meetups${data.long.toFixed(3)}`, 3600);
                                //console.log(JSON.stringify(messages.attachment,null,6))
                                sendMessage({sender : data.sender  ,  attachment : messages.attachment });
                            }
                        });
                    }

                });

            });

        }

        /**
         * To get data from coin handler
         * @param data
         */

        function getTweets(data) {

            console.log('check data');
            console.log(data);

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

                    //console.log(body);

                    let reducedArray = body.statuses.reduce(function(arr,curr,i) {

                        arr.push ({
                            "title": curr.text,
                            "subtitle":   curr.text.slice(0,15),
                            //"image_url": "https://peterssendreceiveapp.ngrok.io/img/collection.png",
                            "buttons": [
                                {
                                    "title": "View",
                                    "type": "web_url",
                                    "url": curr.entities.urls.length  > 0 ? (curr.entities.urls)[0].url : (!!curr.retweeted_status && !!curr.retweeted_status.id_str  ? (`https://twitter.com/${data.key}/status/${curr.retweeted_status.id_str}`) : `https://twitter.com/${data.key}/status/${curr.id_str}` ),
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


                        sendMessage({
                            sender : data.sender  ,
                            attachment : messages.attachment ,
                            again : {
                                send : true ,
                                text: 'what next',
                                quick_replies:[
                                    {
                                        "content_type":"text",
                                        "title":"🏠",
                                        "payload":"home"
                                    },
                                    {
                                        "content_type": "text",
                                        "title" : "🔙",
                                        //#TODO - decide payload
                                        "payload" : "blockchain_quick_back"
                                    }
                                ]
                            }
                        });

                        // });


                    }
                    else {
                        sendMessage({
                            sender : data.sender ,
                            text: 'Sorry, No more data found',
                            quick_replies:[
                                {
                                    "content_type":"text",
                                    "title":"🏠",
                                    "payload":"home"
                                },
                                {
                                    "content_type": "text",
                                    "title" : "🔙",
                                    //#TODO - decide payload
                                    "payload" : "blockchain_quick_back"
                                }
                            ]
                        });
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
                              "url": `https://www.stateofthedapps.com/dapps/${curr.slug}?utm_source=blockchainevangelist&utm_medium=messenger&utm_campaign=messenger_blockchainevangelist`,
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

            if (!!about[data.key.split(":")[0]] && !!about[data.key.split(":")[0]].symbolToName) {
                let requestOptions ='',url = '';
                url = `https://api.coinmarketcap.com/v1/ticker/${about[data.key.split(":")[0]].symbolToName}/?convert=${data.key.split(":")[1]}`;

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
                    let sendObj = {
                        sender : data.sender,
                        text : pushString,
                            quick_replies : [
                            {
                            "content_type":"text",
                            "title":"🏠",
                            "payload":"home"
                            },
                            {
                                "content_type":"text",
                                "title":"🔙",
                                "payload":"cryptocurriencies_quick_currentprices_back"
                        }]
                    };

                    sendMessage(sendObj);
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
            console.log('coming');
            const limit = data.limit || 4;
            const lastIndex = !!data.page ? (parseInt(data.page || 1) - 1)*limit : 0;

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
                        "payload": `view more payload ${data.key} ${parseInt(data.page || 1)+1}`
                    }
                ]
            }


            req.app.client.get(`${data.key}-${data.page}`,function(err,reply) {

                if (err) {
                    throw new Error(err);
                }


                if (!!reply) {
                    console.log('found');
                    //return sendMessage({sender : data.sender  ,  attachment : JSON.parse(reply) });

                    return sendMessage({

                        sender : data.sender  ,
                        attachment : JSON.parse(reply) ,
                        again : {
                            send : true ,
                            text: 'what next..',
                            quick_replies:[
                                {
                                    "content_type":"text",
                                    "title":"🏠",
                                    "payload":"home"
                                },
                                {
                                    "content_type": "text",
                                    "title" : "🔙",
                                    //#TODO - decide payload
                                    "payload" : "blockchain_quick_back"
                                }
                            ]
                        }
                    });
                }



                // get max articles form  publications
                let callAsync = req.app.config.messengerBot.contentWebsites.reduce(function(arrs,curr,i){
                    let asyncFun = (function(i,curr) {
                        return function(callback){
                            request({
                                method: 'GET',
                                url: `https://news.google.com/news/rss/search/section/q/${data.key} ${curr}/${data.key} ${curr}`,
                                qs: { hl: 'en-IN', ned: 'in' },
                                headers:
                                    {
                                        'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36",
                                        'cache-control': 'no-cache'
                                    }
                            }, function (error, response, body) {
                                if (error) {
                                    return callback(error);
                                }

                                let parseString = require('xml2js').parseString;
                                parseString(body, function (err, result) {

                                    if (((result.rss.channel)[0]) && ((result.rss.channel)[0].item) && !err) {
                                        callback(null,((result.rss.channel)[0].item));
                                    }
                                    else {
                                        callback(null,i);
                                    }
                                });

                            });
                        };
                    })(i,curr);

                    arrs.push(asyncFun);

                    return arrs;
                },[]);

                require('async').parallel(callAsync,
                    function(err, results) {
                        if (err) {
                            console.log(err);
                            return sendMessage({
                                sender : data.sender ,
                                text : 'Sorry, No more data found',
                                again : {
                                    send : true ,
                                    text: 'what next..',
                                    quick_replies:[
                                        {
                                            "content_type":"text",
                                            "title":"🏠",
                                            "payload":"home"
                                        },
                                        {
                                            "content_type": "text",
                                            "title" : "🔙",
                                            //#TODO - decide payload
                                            "payload" : "blockchain_quick_back"
                                        }
                                    ]
                                }

                            });

                        }

                        if (Array.isArray(results[0]) && Array.isArray(results[1])) {
                            // spread operator
                            let finalArr = [...results[0],...results[1]];
                            // use filter function for whitelisting

                            let reducedArray = finalArr.slice(lastIndex,lastIndex+limit).reduce(function(arr,curr,i) {

                                const domain = url.parse(curr.link.join(''));
                                const host= domain.host.indexOf('www')>=0 ? domain.host : "www."+domain.host;
                                console.log(`${domain.protocol}//${host}`);
                                if (req.app.config.messengerBot.whitelistedDomains.indexOf(`${domain.protocol}//${host}`) >=0) {
                                    arr.push ({
                                        "title": curr.title.join(''),
                                        "subtitle": `${curr.title.join('').slice(0,25)} ...`,
                                        //"image_url": "https://peterssendreceiveapp.ngrok.io/img/collection.png",
                                        "buttons": [
                                            {
                                                "title": "View",
                                                "type": "web_url",
                                                "url": `${curr.link.join('')}?utm_source=blockchainevangelist&utm_medium=messenger&utm_campaign=messenger_blockchainevangelist`,
                                                "messenger_extensions": true,
                                                "webview_height_ratio": "tall",
                                                // @TODO - why fallback url coming in web view , in messenger it is working fine
                                                "fallback_url": "https://blockchainevangelist.in/"
                                            }
                                        ],
                                        "default_action": {
                                            "type": "web_url",
                                            "url": `${curr.link.join("")}?utm_source=blockchainevangelist&utm_medium=messenger&utm_campaign=messenger_blockchainevangelist`,
                                            "messenger_extensions": true,
                                            "webview_height_ratio": "compact"
                                        }
                                    });
                                }

                                return arr;
                            },[]);

                            // if no articles found by whitelisted domain then send text
                            if (reducedArray.length > 0 ) {
                                //console.log(reducedArray.length);
                                messages.attachment.payload.elements = reducedArray;

                                req.app.client.set(`${data.key}-${data.page}`,JSON.stringify(messages.attachment),function(err,reply) {
                                    //console.log(err);
                                    if(err) {
                                        console.log(err);
                                        console.log('error');
                                        sendMessage({
                                            sender : data.sender ,
                                            text : 'Sorry, No more data found',
                                            again : {
                                                send : true ,
                                                text: 'what next..',
                                                quick_replies:[
                                                    {
                                                        "content_type":"text",
                                                        "title":"🏠",
                                                        "payload":"home"
                                                    },
                                                    {
                                                        "content_type": "text",
                                                        "title" : "🔙",
                                                        //#TODO - decide payload
                                                        "payload" : "blockchain_quick_back"
                                                    }
                                                ]
                                            }
                                        });
                                    }
                                    else {
                                        console.log('set done');
                                        req.app.client.expire(`${data.key}-${data.page}`, 1000);

                                        sendMessage({
                                            sender : data.sender  ,
                                            attachment : messages.attachment ,
                                            again : {
                                                send : true ,
                                                text: 'what next',
                                                quick_replies:[
                                                    {
                                                        "content_type":"text",
                                                        "title":"🏠",
                                                        "payload":"home"
                                                    },
                                                    {
                                                        "content_type": "text",
                                                        "title" : "🔙",
                                                        //#TODO - decide payload
                                                        "payload" : "blockchain_quick_back"
                                                    }
                                                ]
                                            }
                                        });
                                    }
                                });
                            }
                            else {
                                sendMessage({
                                    sender : data.sender ,
                                    text : 'Sorry, No more data found',
                                    again : {
                                        send : true ,
                                        text: 'what next..',
                                        quick_replies:[
                                            {
                                                "content_type":"text",
                                                "title":"🏠",
                                                "payload":"home"
                                            },
                                            {
                                                "content_type": "text",
                                                "title" : "🔙",
                                                //#TODO - decide payload
                                                "payload" : "blockchain_quick_meetups_back"
                                            }
                                        ]
                                    }
                                });
                            }
                        }
                        else {
                            // default news - elastic search apis
                            //console.log(results);
                            sendMessage({
                                sender : data.sender ,
                                text : 'Sorry, No more data found',
                                again : {
                                    send : true ,
                                    text: 'what next..',
                                    quick_replies:[
                                        {
                                            "content_type":"text",
                                            "title":"🏠",
                                            "payload":"home"
                                        },
                                        {
                                            "content_type": "text",
                                            "title" : "🔙",
                                            //#TODO - decide payload
                                            "payload" : "blockchain_quick_meetups_back"
                                        }
                                    ]
                                }
                            });
                        }
                    });

            });


        };


        /**
         * geenric templates common handler function
         * @param data
         */
        function handleGenericTemplate(data) {

            console.log(data);

            const limit = data.limit || 10;
            const lastIndex = !!data.page ? (parseInt(data.page || 1) - 1)*limit : 0;

            const messages = {
                "attachment": {
                    "type": "template",
                    "payload": {
                        "template_type": "generic",
                        "sharable" : true,
                        "elements": null
                    }
                }
            };

            const pglen = data.template.length;
            let reducedArray = data.template.slice(lastIndex,lastIndex+limit).reduce(function(arr,curr,i) {

                //TODO - one item is missing check slice and if conditions

                if (pglen >= limit && i == limit-1) {

                    arr.push ({
                        title: 'more options',
                        buttons: [{
                            "title": "More Resource",
                            "type": "postback",
                            "payload": `${data.type}_quick_${data.quick}_more${data.page}-${limit}`
                        },
                            {
                                "type":"postback",
                                "title":"🏠",
                                "payload":"home"
                            },
                            {
                                "title": "Back",
                                "type": "postback",
                                // "payload": `${data.type}_quick_${data.quick}_back`
                                "payload": `${data.type}_quick_back`
                            }
                        ]
                    });
                }
                else if (i < limit-1) {
                    arr.push ({
                        title: `${curr.title}`,
                        item_url: `${curr.link}?utm_source=blockchainevangelist&utm_medium=messenger&utm_campaign=messenger_blockchainevangelist`,
                        image_url: "https://144b1e2a.ngrok.io/images/meetup.png",
                        buttons: [{
                            type: "web_url",
                            url: `${curr.link}?utm_source=blockchainevangelist&utm_medium=messenger&utm_campaign=messenger_blockchainevangelist`,
                            title: "open link"
                            },
                            {
                                "title": "Back",
                                "type": "postback",
                                // "payload": `${data.type}_quick_${data.quick}_back`
                                "payload": `${data.type}_quick_back`
                            },
                            {
                                "type": "element_share",
                                "share_contents": {
                                    "attachment": {
                                        "type": "template",
                                        "payload": {
                                            "template_type": "generic",
                                            "elements": [
                                                {
                                                    title: `${curr.title}`,
                                                    item_url: `${curr.link}?utm_source=blockchainevangelist&utm_medium=messenger&utm_campaign=messenger_blockchainevangelist`,
                                                    image_url: "http://144b1e2a.ngrok.io/images/meetup.png",
                                                    "buttons": [
                                                        {
                                                            type: "web_url",
                                                            url: `${curr.link}?utm_source=blockchainevangelist&utm_medium=messenger&utm_campaign=messenger_blockchainevangelist`,
                                                            title: "Open Web URL"
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    }
                                }
                            }]
                    });
                }

                return arr;
            },[]);

            if (reducedArray.length > 0 ) {
                //console.log(reducedArray.length);

                if (reducedArray.length < limit) {
                    reducedArray.push ({
                        title: 'no more resource .. we will add more soon..',
                        buttons: [
                            {
                                "type":"postback",
                                "title":"🏠",
                                "payload":"home"
                            },
                            {
                                "title": "Back",
                                "type": "postback",
                                "payload": `${data.type}_quick_back`
                            }
                        ]
                    });
                }
            }
            else {
                if (reducedArray.length < limit) {
                    reducedArray.push ({
                        title: 'no more resource .. we will add more soon..',
                        buttons: [
                            {
                                "type":"postback",
                                "title":"🏠",
                                "payload":"home"
                            },
                            {
                                "type": "postback",
                                "title" : "🔙",
                                //#TODO - decide payload
                                "payload" : `${data.type}_quick_back`
                            }
                        ]
                    });
                }
            }

            messages.attachment.payload.elements = reducedArray;
            sendMessage({sender : data.sender  ,  attachment : messages.attachment });
        }

        /**
         * used to process the postback like when click on get started or on left menu - means any button
         * @param event
         */

        function processPostback(event) {
            const senderId = event.sender.id;
            const payload = event.postback.payload;
             console.log('coming');
            // #TODO - use switch statement
            if (payload.indexOf("_back") >=0) {
                senderAction ({sender : senderId ,action : 'typing_on'});
                const process = {
                    sender : { id : senderId },
                    postback : { payload : payload.split('_back')[0] }
                };
                processPostback(process);
            }
            else if (payload === "Greeting") {
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
                    let greeting = "",name =null;
                    if (error) {
                        console.log("Error getting user's name: " +  error);
                    } else {
                        const bodyObj = JSON.parse(body);
                        name = bodyObj.first_name;
                        greeting = `${name}`;
                    }
                    //#TODO - msg text
                    let message = `Hi ${ greeting || smiley },  My name is BlockChain Evangelist Bot. I can tell you various details(news,price,events,startups,ico's etc) regarding blockchain,cryptocurriencies. What topic would you like to know about?`;
                    //#TODO - msg text
                    // sendMessage({sender : senderId ,text : message , again : {send : true ,text: 'To know coin prices in any fiat curreny just write "coin:symbol" (eg: btc:usd) ,' +
                    // 'to know latest news of a coin type "coin-news" (eg: btc-news) and to know about a coin type "coin-about" (eg: btc-about)' }});


                    const quick_replies_data = {
                        sender : senderId,
                        "text": !!event.postback.home ? "hey ! let's start again" : message ,
                        "quick_replies":[
                            {
                                "content_type":"text",
                                "title":"Blockchain",
                                "payload":"blockchain_quick"
                            },
                            {
                                "content_type":"text",
                                "title":"Cryptocurriencies",
                                "payload":"cryptocurriencies_quick"
                            }
                        ]
                    };

                    sendMessage(quick_replies_data);

                });
            }
            else if (payload === 'help') {
                const quick_replies_data = {
                    sender : senderId,
                    "text": 'To know coin prices in any fiat curreny just write "coin:symbol" (eg: btc:usd) ,' +
                            'to know latest news of a coin type "coin-news" (eg: btc-news) and to know about a coin, type "coin-about" (eg: btc-about) \t\t\t\t\t OR \t\t\t\n choose any category',
                    "quick_replies":[
                        {
                            "content_type":"text",
                            "title":"Blockchain",
                            "payload":"blockchain_quick"
                        },
                        {
                            "content_type":"text",
                            "title":"Cryptocurriencies",
                            "payload":"cryptocurriencies_quick"
                        }
                    ]
                };
                sendMessage(quick_replies_data);
            }
            else if (payload === 'contactus') {
                sendMessage({
                    sender : senderId ,
                    text : 'raopreetam007@gmail.com',
                    quick_replies:[
                        {
                            "content_type":"text",
                            "title":"🏠",
                            "payload":"home"
                        }
                    ]
                });
                //sendMessage({sender : senderId ,text:  'To get list of dApps related to a category type "dapps=category" (eg: dapps=insurance)'});
            }
            else if (payload === 'subscription') {

                const quick_replies_data = {
                    sender : senderId,
                    "text": "update your preference!",
                    "quick_replies":[
                        {
                            "content_type":"text",
                            "title":"🏠",
                            "payload":"home"
                        },
                        {
                            "content_type":"text",
                            //#TODO - decide title
                            "title":"start alerts",
                            "payload":"alerts_start"
                        },
                        {
                            "content_type":"text",
                            //#TODO - decide text
                            "title":"off alerts",
                            "payload":"alerts_off"
                        },
                        {
                            "content_type" : "text",
                            "title" : "🔙",
                            //#TODO - decide payload
                            "payload" : "home"
                        }
                    ]
                };

                sendMessage(quick_replies_data);

            }
            else if (payload === 'home') {
                const quick_replies_data = {
                    sender : senderId,
                    "text": "hey ! let's start again",
                    "quick_replies":[
                        {
                            "content_type":"text",
                            "title":"Blockchain",
                            "payload":"blockchain_quick"
                        },
                        {
                            "content_type":"text",
                            "title":"Cryptocurriencies",
                            "payload":"cryptocurriencies_quick"
                        }
                    ]
                };

                sendMessage(quick_replies_data);
            }
            else if (payload.indexOf("blockchain_") >= 0  ) {
                let quick_replies_data ='';
                if (payload === 'blockchain_quick') {

                     quick_replies_data = {
                        sender : senderId,
                        "text": "let's narrow it down .. you are interested in ?",
                        "quick_replies":[
                            {
                                "content_type":"text",
                                "title":"🏠",
                                "payload":"home"
                            },
                            {
                                "content_type":"text",
                                "title":"News",
                                "payload":"blockchain_quick_news"
                            },
                            {
                                "content_type":"text",
                                "title":"Learn Basics",
                                "payload":"blockchain_quick_learn"
                            },
                            {
                                "content_type" : "text",
                                "title" : "Developers Resources",
                                "payload" : "blockchain_quick_developers"
                            },
                            {
                                "content_type":"text",
                                "title":"Meetups",
                                "payload":"blockchain_quick_meetups"
                            },
                            {
                                "content_type":"text",
                                "title":"Youtube",
                                "payload":"blockchain_quick_youtube"
                            },
                            {
                                "content_type":"text",
                                "title":"Jobs",
                                "payload":"blockchain_quick_jobs"
                            },
                            {
                                "content_type":"text",
                                "title":"Podcasts",
                                "payload":"blockchain_quick_podcasts"
                            },
                            {
                                "content_type" : "text",
                                "title" : "🔙",
                                "payload" : "blockchain_quick_back"
                            }
                        ]
                     };
                     sendMessage(quick_replies_data);

                }
                else if (payload.indexOf("blockchain_quick_news") >= 0  ) {

                    if (payload === 'blockchain_quick_news') {
                        senderAction ({sender : senderId ,action : 'typing_on'});
                        getXml({key :'blockchain' ,sender :senderId ,page :1});
                    }
                }
                else if (payload.indexOf("blockchain_quick_learn") >= 0 ) {

                    if (payload === 'blockchain_quick_learn') {
                        senderAction ({sender : senderId ,action : 'typing_on'});
                        // quick is used for payload matching and template is used for json matching
                        handleGenericTemplate({sender : senderId ,type : (payload.split('_'))[0],quick : ((payload.split('_')).slice(-1))[0], template : reply_data.blockchain[((payload.split('_')).slice(-1))[0]],page : 1,limit : 10 });
                    }
                    else if (payload.indexOf("blockchain_quick_learn_more") >= 0) {
                        senderAction ({sender : senderId ,action : 'typing_on'});
                        handleGenericTemplate({sender :senderId ,type : (payload.split('_'))[0],quick : 'learn',template : reply_data.blockchain[((payload.split('_')).slice(-2))[0]],limit : parseInt((payload.match(/\d+/g))[1].trim()),page : parseInt(((payload.match(/\d+/g))[0]))+1 });

                    }

                }
                else if (payload.indexOf("blockchain_quick_developers") >= 0) {

                    if (payload === 'blockchain_quick_developers') {
                        quick_replies_data = {
                            sender : senderId,
                            "text": " yea :)  Most interesting part ,let's narrow it down .. you are interested in ?",
                            "quick_replies":[
                                {
                                    "content_type":"text",
                                    "title":"🏠",
                                    "payload":"home"
                                },
                                {
                                    "content_type":"text",
                                    "title":"Dapps",
                                    "payload":"blockchain_quick_developers_dapps"
                                },
                                {
                                    "content_type":"text",
                                    "title":"Blockchain Resources",
                                    "payload":"blockchain_quick_developers_dresources"
                                },
                                {
                                    "content_type":"text",
                                    "title":"🔙",
                                    "payload":"blockchain_quick_back"
                                }
                            ]
                        };
                        sendMessage(quick_replies_data);
                    }
                    else if (payload.indexOf("blockchain_quick_developers_dapps") >= 0) {

                        if (payload == "blockchain_quick_developers_dapps") {
                            senderAction ({sender : senderId ,action : 'typing_on'});
                            handleGenericTemplate({sender : senderId ,type : (payload.split('_'))[0],quick : 'developers_dapps', template : reply_data.blockchain[((payload.split('_')).slice(-1))[0]],page : 1,limit : 10 });

                        }
                        else if (payload.indexOf("blockchain_quick_developers_dapps_more") >= 0) {
                            senderAction ({sender : senderId ,action : 'typing_on'});
                            handleGenericTemplate({sender :senderId ,type : (payload.split('_'))[0],quick : 'developers_dapps',template : reply_data.blockchain[((payload.split('_')).slice(-2))[0]],limit : parseInt((payload.match(/\d+/g))[1].trim()),page : parseInt(((payload.match(/\d+/g))[0]))+1 });
                        }

                    }
                    else if (payload.indexOf("blockchain_quick_developers_dresources") >= 0) {
                        if (payload == "blockchain_quick_developers_dresources") {
                            senderAction ({sender : senderId ,action : 'typing_on'});
                            handleGenericTemplate({sender : senderId ,type : (payload.split('_'))[0],quick : 'developers_dresources', template : reply_data.blockchain[((payload.split('_')).slice(-1))[0]],page : 1,limit : 10 });

                        }
                        else if (payload.indexOf("blockchain_quick_developers_dresources_more") >= 0) {
                            senderAction ({sender : senderId ,action : 'typing_on'});
                            handleGenericTemplate({sender :senderId ,type : (payload.split('_'))[0],quick : 'developers_dresources',template : reply_data.blockchain[((payload.split('_')).slice(-2))[0]],limit : parseInt((payload.match(/\d+/g))[1].trim()),page : parseInt(((payload.match(/\d+/g))[0]))+1 });
                        }
                    }

                }
                else if (payload.indexOf("blockchain_quick_meetups") >= 0) {

                    if (payload === 'blockchain_quick_meetups') {
                        const quick_replies_data = {
                            sender : senderId,
                            "text": "hey ! Share your location",
                            "quick_replies":[
                                {
                                    "content_type":"text",
                                    "title":"🏠",
                                    "payload":"home"
                                },
                                {
                                    "content_type": "location"
                                    // use session for payload name
                                },
                                {
                                    "content_type":"text",
                                    "title":"🔙",
                                    "payload":"blockchain_quick_back"
                                }
                            ]
                        };
                        sendMessage(quick_replies_data);
                    }
                    else if (payload.indexOf("blockchain_quick_meetups_more") >= 0) {
                        senderAction ({sender : senderId ,action : 'typing_on'});
                        getMeetUps({sender :senderId ,lat : parseFloat((payload.match(/([0-9]*[.])?[0-9]+/g))[1].trim()),long : parseFloat((payload.match(/([0-9]*[.])?[0-9]+/g))[2].trim()),limit : parseInt((payload.match(/([0-9]*[.])?[0-9]+/g))[3].trim()),page : parseInt(((payload.match(/([0-9]*[.])?[0-9]+/g))[0]))+1 });

                       // getXml({key :(payload.match(/\D+/g))[0].trim() ,sender :senderId ,page : parseInt(payload.match(/\d+/g)[0])});
                    }

                }
                else if (payload.indexOf("blockchain_quick_youtube") >= 0) {
                    if (payload === 'blockchain_quick_youtube') {
                        senderAction ({sender : senderId ,action : 'typing_on'});
                        // quick is used for payload matching and template is used for json matching
                        handleGenericTemplate({sender : senderId ,type : (payload.split('_'))[0],quick : ((payload.split('_')).slice(-1))[0], template : reply_data.blockchain[((payload.split('_')).slice(-1))[0]],page : 1,limit : 10 });
                    }
                    else if (payload.indexOf("blockchain_quick_youtube") >= 0) {
                        senderAction ({sender : senderId ,action : 'typing_on'});
                        handleGenericTemplate({sender :senderId ,type : (payload.split('_'))[0],quick : 'youtube',template : reply_data.blockchain[((payload.split('_')).slice(-2))[0]],limit : parseInt((payload.match(/\d+/g))[1].trim()),page : parseInt(((payload.match(/\d+/g))[0]))+1 });

                    }
                }
                else if (payload.indexOf("blockchain_quick_jobs") >= 0) {
                    if (payload === 'blockchain_quick_jobs') {
                        senderAction ({sender : senderId ,action : 'typing_on'});
                        // quick is used for payload matching and template is used for json matching
                        handleGenericTemplate({sender : senderId ,type : (payload.split('_'))[0],quick : ((payload.split('_')).slice(-1))[0], template : reply_data.blockchain[((payload.split('_')).slice(-1))[0]],page : 1,limit : 10 });
                    }
                    else if (payload.indexOf("blockchain_quick_youtube") >= 0) {
                        senderAction ({sender : senderId ,action : 'typing_on'});
                        handleGenericTemplate({sender :senderId ,type : (payload.split('_'))[0],quick : 'jobs',template : reply_data.blockchain[((payload.split('_')).slice(-2))[0]],limit : parseInt((payload.match(/\d+/g))[1].trim()),page : parseInt(((payload.match(/\d+/g))[0]))+1 });

                    }
                }
                else if (payload.indexOf("blockchain_quick_podcasts") >= 0) {
                    if (payload === 'blockchain_quick_podcasts') {
                        senderAction ({sender : senderId ,action : 'typing_on'});
                        // quick is used for payload matching and template is used for json matching
                        handleGenericTemplate({sender : senderId ,type : (payload.split('_'))[0],quick : ((payload.split('_')).slice(-1))[0], template : reply_data.blockchain[((payload.split('_')).slice(-1))[0]],page : 1,limit : 10 });
                    }
                    else if (payload.indexOf("blockchain_quick_podcasts") >= 0) {
                        senderAction ({sender : senderId ,action : 'typing_on'});
                        handleGenericTemplate({sender :senderId ,type : (payload.split('_'))[0],quick : 'podcasts',template : reply_data.blockchain[((payload.split('_')).slice(-2))[0]],limit : parseInt((payload.match(/\d+/g))[1].trim()),page : parseInt(((payload.match(/\d+/g))[0]))+1 });

                    }
                }

            }
            else if (payload.indexOf("cryptocurriencies_") >= 0  ) {
                let quick_replies_data ='';
                if (payload === 'cryptocurriencies_quick') {
                    quick_replies_data = {
                        sender : senderId,
                        "text": "let's narrow it down .. you are interested in ?",
                        "quick_replies":[
                            {
                                "content_type":"text",
                                "title":"🏠",
                                "payload":"home"
                            },
                            {
                                "content_type":"text",
                                "title":"News",
                                "payload":"cryptocurriencies_quick_news"
                            },
                            {
                                "content_type":"text",
                                "title":"Current Prices",
                                "payload":"cryptocurriencies_quick_currentprices"
                            },
                            {
                                "content_type":"text",
                                "title":"Learn",
                                "payload":"cryptocurriencies_quick_learn"
                            },
                            {
                                "content_type":"text",
                                "title":"Buy/Sell",
                                "payload":"cryptocurriencies_quick_buy/sell"
                            },
                            {
                                "content_type":"text",
                                "title":"Tweets",
                                "payload":"cryptocurriencies_quick_tweets"
                            },
                            {
                                "content_type":"text",
                                "title":"Alerts",
                                "payload":"cryptocurriencies_quick_alerts"
                            },
                            {
                                "content_type":"text",
                                "title":"Meetups",
                                "payload":"cryptocurriencies_quick_meetups"
                            },
                            {
                                "content_type":"text",
                                "title":"Youtube",
                                "payload":"cryptocurriencies_quick_youtube"
                            },
                            {
                                "content_type":"text",
                                "title":"Podcasts",
                                "payload":"blockchain_quick_podcasts"
                            },
                            {
                                "content_type" : "text",
                                "title" : "🔙",
                                "payload" : "home"
                            }
                        ]
                    };
                    sendMessage(quick_replies_data);
                }
                else if (payload === 'cryptocurriencies_quick_news') {
                    senderAction ({sender : senderId ,action : 'typing_on'});
                    getXml({key :'cryptocurrency' ,sender :senderId ,page :1});
                }
                else if (payload === 'cryptocurriencies_quick_meetups') {
                    const quick_replies_data = {
                        sender : senderId,
                        "text": "hey ! Share your location",
                        "quick_replies":[
                            {
                                "content_type":"text",
                                "title":"🏠",
                                "payload":"home"
                            },
                            {
                                "content_type": "location"
                            },
                            {
                                "content_type":"text",
                                "title":"🔙",
                                "payload":"cryptocurriencies_quick_back"
                            }
                        ]
                    };

                    sendMessage(quick_replies_data);

                }
                else if (payload.indexOf("cryptocurriencies_quick_alerts") >= 0) {

                    if (payload === 'cryptocurriencies_quick_alerts') {
                        const quick_replies_data = {
                            sender : senderId,
                            "text": "hey ! let's narrow it again",
                            "quick_replies":[
                                {
                                    "content_type":"text",
                                    "title":"🏠",
                                    "payload":"home"
                                },
                                {
                                    "content_type":"text",
                                    "title":"Creditble ICO alerts ",
                                    "payload":"cryptocurriencies_quick_alerts_icowatchlist"
                                },
                                {
                                    "content_type":"text",
                                    "title":"Coin roadmap/agenda alerts",
                                    "payload":"cryptocurriencies_quick_alerts_releasesroadmap"
                                },
                                {
                                    "content_type":"text",
                                    "title":"Singals",
                                    "payload":"cryptocurriencies_quick_alerts_signals"
                                },
                                {
                                    "content_type":"text",
                                    "title":"🔙",
                                    "payload":"cryptocurriencies_quick_back"
                                }
                            ]
                        };
                        sendMessage(quick_replies_data);
                    }
                    else if (payload.indexOf("cryptocurriencies_quick_alerts_") >= 0) {

                        if (/(_start|_off)$/.test(payload)) {
                            //#TODO - msg text
                            const type = payload.split('_').slice(-2,-1)[0];
                            sendMessage({
                                sender : senderId,
                                "text" :  `${(payload.split('_').slice(-1))[0] === 'off' ? `ok :( Now you will not receive more ${type === 'icowatchlist' ? 'Creditble ICO alerts' : (type === 'releasesroadmap' ? 'Coin roadmap/agenda alerts' : 'Singals' )} alerts`: `cool :) Now you will start receiving ${type === 'icowatchlist' ? 'Creditble ICO alerts' : (type === 'releasesroadmap' ? 'Coin roadmap/agenda alerts' : 'Singals' )} alerts` }`,
                                "quick_replies":[
                                    {
                                        "content_type":"text",
                                        "title":"🏠",
                                        "payload":"home"
                                    },
                                    {
                                        "content_type" : "text",
                                        "title" : "🔙",
                                        //#TODO - decide payload
                                        // "payload" : `cryptocurriencies_quick_alerts_${type}_back`
                                        "payload" : `cryptocurriencies_quick_alerts_back`
                                    }
                                ]
                            });
                            req.app.utility.agenda.now('save user for alerts', { msg: senderId ,type : type, action : ((payload.split('_').slice(-1))[0] === 'off' ? false : true ) });

                        }
                        else {
                            const type = (payload.split('_').slice(-1))[0];
                            console.log(type);
                            const quick_replies_data = {
                                sender : senderId,
                                "text": `update your ${type === 'icowatchlist' ? 'Creditble ICO alerts' : (type === 'releasesroadmap' ? 'Coin roadmap/agenda alerts' : 'Singals' )} alerts preference!`,
                                "quick_replies":[
                                    {
                                        "content_type":"text",
                                        "title":"🏠",
                                        "payload":"home"
                                    },
                                    {
                                        "content_type":"text",
                                        //#TODO - decide title
                                        "title":"start alerts",
                                        "payload":`cryptocurriencies_quick_alerts_${payload.split('_').slice(-1)}_start`
                                    },
                                    {
                                        "content_type":"text",
                                        //#TODO - decide text
                                        "title":"off alerts",
                                        "payload":`cryptocurriencies_quick_alerts_${payload.split('_').slice(-1)}_off`
                                    },
                                    {
                                        "content_type" : "text",
                                        "title" : "🔙",
                                        //#TODO - decide payload
                                        //"payload" : `cryptocurriencies_quick_alerts_${payload.split('_').slice(-1)}_back`
                                        "payload" : `cryptocurriencies_quick_alerts_back`
                                    }
                                ]
                            };

                            sendMessage(quick_replies_data);
                        }

                    }
                }
                else if (payload.indexOf("cryptocurriencies_quick_currentprices") >= 0) {
                    let quick_replies_data =null;
                    if (payload === 'cryptocurriencies_quick_currentprices' ) {
                        quick_replies_data = {
                            sender : senderId,
                            "text": "hey ! let's narrow it again or To know coin prices in any fiat curreny just write \"coin:symbol\" (eg: btc:usd or btc:inr) ",
                            "quick_replies":[
                                {
                                    "content_type":"text",
                                    "title":"🏠",
                                    "payload":"home"
                                },
                                {
                                    "content_type":"text",
                                    "title":"BTC",
                                    "payload":"cryptocurriencies_quick_currentprices_btc"
                                },
                                {
                                    "content_type":"text",
                                    "title":"Ethereum",
                                    "payload":"cryptocurriencies_quick_currentprices_eth"
                                },
                                {
                                    "content_type":"text",
                                    "title":"Litecoin",
                                    "payload":"cryptocurriencies_quick_currentprices_ltc"
                                },
                                {
                                    "content_type":"text",
                                    "title":"Ripple",
                                    "payload":"cryptocurriencies_quick_currentprices_xrp"
                                },
                                {
                                    "content_type":"text",
                                    "title":"Monero",
                                    "payload":"cryptocurriencies_quick_currentprices_xmr"
                                },
                                {
                                    "content_type":"text",
                                    "title":"Dash",
                                    "payload":"cryptocurriencies_quick_currentprices_dash"
                                },
                                {
                                    "content_type":"text",
                                    "title":"Neo",
                                    "payload":"cryptocurriencies_quick_currentprices_neo"
                                },
                                {
                                    "content_type":"text",
                                    "title":"Qtum",
                                    "payload":"cryptocurriencies_quick_currentprices_qtum"
                                },
                                {
                                    "content_type":"text",
                                    "title":"🔙",
                                    "payload":"cryptocurriencies_quick_back"
                                }
                            ]
                        };

                        sendMessage(quick_replies_data);

                    }
                    else {
                        getdata({key :`${payload.split('_').slice(-1)[0]}:usd` ,sender :senderId ,quick : true });
                    }



                }
                else if (payload.indexOf("cryptocurriencies_quick_tweets") >= 0) {
                    let quick_replies_data =null;
                    if (payload === 'cryptocurriencies_quick_tweets' ) {
                        quick_replies_data = {
                            sender : senderId,
                            "text": "hey ! let's narrow it again or To get tweets by coins  ",
                            "quick_replies":[
                                {
                                    "content_type":"text",
                                    "title":"🏠",
                                    "payload":"home"
                                },
                                {
                                    "content_type":"text",
                                    "title":"BTC",
                                    "payload":"cryptocurriencies_quick_tweets_btc"
                                },
                                {
                                    "content_type":"text",
                                    "title":"Ethereum",
                                    "payload":"cryptocurriencies_quick_tweets_eth"
                                },
                                {
                                    "content_type":"text",
                                    "title":"Litecoin",
                                    "payload":"cryptocurriencies_quick_tweets_ltc"
                                },
                                {
                                    "content_type":"text",
                                    "title":"Ripple",
                                    "payload":"cryptocurriencies_quick_tweets_xrp"
                                },
                                {
                                    "content_type":"text",
                                    "title":"Monero",
                                    "payload":"cryptocurriencies_quick_tweets_xmr"
                                },
                                {
                                    "content_type":"text",
                                    "title":"Dash",
                                    "payload":"cryptocurriencies_quick_tweets_dash"
                                },
                                {
                                    "content_type":"text",
                                    "title":"Neo",
                                    "payload":"cryptocurriencies_quick_tweets_neo"
                                },
                                {
                                    "content_type":"text",
                                    "title":"Qtum",
                                    "payload":"cryptocurriencies_quick_tweets_qtum"
                                },
                                {
                                    "content_type":"text",
                                    "title":"🔙",
                                    "payload":"cryptocurriencies_quick_back"
                                }
                            ]
                        };

                        sendMessage(quick_replies_data);

                    }
                    else {
                        console.log('second');
                        getTweets({key : about[(payload.split('_').slice(-1))[0]].tweetId ,sender :senderId});
                    }

                }
                else if (payload.indexOf("cryptocurriencies_quick_learn") >= 0 ) {

                    if (payload === 'cryptocurriencies_quick_learn') {
                        senderAction ({sender : senderId ,action : 'typing_on'});
                        // quick is used for payload matching and template is used for json matching
                        handleGenericTemplate({sender : senderId ,type : (payload.split('_'))[0],quick : ((payload.split('_')).slice(-1))[0], template : reply_data.cryptocurriencies[((payload.split('_')).slice(-1))[0]],page : 1,limit : 10 });
                    }
                    else if (payload.indexOf("cryptocurriencies_quick_learn_more") >= 0) {
                        senderAction ({sender : senderId ,action : 'typing_on'});
                        handleGenericTemplate({sender :senderId ,type : (payload.split('_'))[0] ,quick : 'learn',template : reply_data.cryptocurriencies[((payload.split('_')).slice(-2))[0]],limit : parseInt((payload.match(/\d+/g))[1].trim()),page : parseInt(((payload.match(/\d+/g))[0]))+1 });

                    }

                }
                else if (payload.indexOf("cryptocurriencies_quick_youtube") >= 0 ) {

                    if (payload === 'cryptocurriencies_quick_youtube') {
                        senderAction ({sender : senderId ,action : 'typing_on'});
                        // quick is used for payload matching and template is used for json matching
                        handleGenericTemplate({sender : senderId ,type : (payload.split('_'))[0],quick : ((payload.split('_')).slice(-1))[0], template : reply_data.cryptocurriencies[((payload.split('_')).slice(-1))[0]],page : 1,limit : 10 });
                    }
                    else if (payload.indexOf("cryptocurriencies_quick_youtube_more") >= 0) {
                        senderAction ({sender : senderId ,action : 'typing_on'});
                        handleGenericTemplate({sender :senderId ,type : (payload.split('_'))[0] ,quick : 'youtube',template : reply_data.cryptocurriencies[((payload.split('_')).slice(-2))[0]],limit : parseInt((payload.match(/\d+/g))[1].trim()),page : parseInt(((payload.match(/\d+/g))[0]))+1 });

                    }

                }
                else if (payload.indexOf("cryptocurriencies_quick_podcasts") >= 0 ) {

                    if (payload === 'cryptocurriencies_quick_podcasts') {
                        senderAction ({sender : senderId ,action : 'typing_on'});
                        // quick is used for payload matching and template is used for json matching
                        handleGenericTemplate({sender : senderId ,type : (payload.split('_'))[0],quick : ((payload.split('_')).slice(-1))[0], template : reply_data.cryptocurriencies[((payload.split('_')).slice(-1))[0]],page : 1,limit : 10 });
                    }
                    else if (payload.indexOf("cryptocurriencies_quick_podcasts_more") >= 0) {
                        senderAction ({sender : senderId ,action : 'typing_on'});
                        handleGenericTemplate({sender :senderId ,type : (payload.split('_'))[0] ,quick : 'podcasts',template : reply_data.cryptocurriencies[((payload.split('_')).slice(-2))[0]],limit : parseInt((payload.match(/\d+/g))[1].trim()),page : parseInt(((payload.match(/\d+/g))[0]))+1 });

                    }

                }
                else if (payload.indexOf("cryptocurriencies_quick_buy/sell") >= 0 ) {
                    senderAction ({sender : senderId ,action : 'typing_on'});

                    let quick_replies_data = {
                        sender : senderId,
                        "text": "buy ethereum for long term",
                        "quick_replies":[
                            {
                                "content_type":"text",
                                "title":"🏠",
                                "payload":"home"
                            },
                            {
                                "content_type" : "text",
                                "title" : "🔙",
                                "payload" : "cryptocurriencies_quick_back"
                            }
                        ]
                    };
                    sendMessage(quick_replies_data);


                }
            }
            else if (payload.indexOf("view more payload") >= 0) {
                senderAction ({sender : senderId ,action : 'typing_on'});
                getXml({key :(payload.split("view more payload")[1]).match(/\D+/g)[0].trim() ,sender :senderId ,page : parseInt(payload.match(/\d+/g)[0])});

            }
            else if (/(alerts_)+(start|off)?$/.test(payload)) {
                //#TODO - msg text
                sendMessage({sender : senderId,"text" :  `${payload.split('_')[1] === 'off' ? ' ok :( Now you will not receive more any alerts': 'cool :) Now you will start receiving creditble ICO ,coin agenda/roadmap and signals alerts' }`});
                req.app.utility.agenda.now('save user for alerts', { msg: senderId , action : (payload.split('_')[1] === 'off' ? false : true ) });

            }
            else {
                sendMessage({sender : senderId,"text" : "no postback handle defined" });
            }

        };

        /**
         * To send messages to user
         * @param data - accepts sender id and type of data
         */

        function sendMessage(data) {

            var retry = false;

            if(!!data.retry) retry = data.retry;

            console.log('msg sent coming');
            console.log(JSON.stringify(data,null,6));

            const json = {
                recipient : { id : data.sender },
                message : {}
            };

            if (!!data.text) {
                if (!!data.quick_replies) {
                    json.message.quick_replies = data.quick_replies;
                }
                json.message.text =  data.text ;
            }
            else if (!!data.attachment) {
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
                        if (!!data.again.quick_replies) {
                            //console.log(data.again.quick_replies);
                            sendMessage({ sender : data.sender ,text :  data.again.text ,quick_replies : data.again.quick_replies });
                        }
                        else {
                            sendMessage({ sender : data.sender ,text :  data.again.text});
                        }

                    }
                }
                else {
                    //#TODO Caught exception: TypeError: Cannot read property 'statusCode' of undefined
                    // we are geeting this error when internt connection updated from on wifi to another
                    //console.log(response.statusCode);
                    console.error("Unable to send message.");
                    //console.error(response);
                    console.error(error);
                    if(!retry) {
                        console.log('check');
                        sendMessage({
                            sender : data.sender ,
                            text: 'Something went wrong ..',
                            quick_replies:[
                                {
                                    "content_type":"text",
                                    "title":"🏠",
                                    "payload":"home"
                                }
                            ],
                            retry : true
                        });
                    }



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
          url: `https://news.google.com/news/rss/search/section/q/blockchain coindesk/blockchain coindesk`,
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

        let callAsync = req.app.config.messengerBot.contentWebsites.reduce(function(arrs,curr,i){
            let asyncFun = (function(i,curr) {
                return function(callback){
                    request({
                        method: 'GET',
                        url: `https://news.google.com/news/rss/search/section/q/blockchain ${curr}/blockchain ${curr}`,
                        qs: { hl: 'en-IN', ned: 'in' },
                        headers:
                            {
                                'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36",
                                'cache-control': 'no-cache'
                            }
                    }, function (error, response, body) {
                        if (error) {
                            return callback(error);
                        }

                        console.log(body);

                        let parseString = require('xml2js').parseString;
                        parseString(body, function (err, result) {

                            //con

                            if (((result.rss.channel)[0]) && ((result.rss.channel)[0].item) && !err) {
                               callback(null,((result.rss.channel)[0].item));
                            }
                            else {
                                callback(null,i);
                            }

                            //
                        });

                    });
                };
            })(i,curr);

            arrs.push(asyncFun);

            return arrs;
        },[]);


        require('async').parallel(callAsync,
            function(err, results){
                if (err) {
                    console.log(err);
                }


                if (Array.isArray(results[0]) && Array.isArray(results[1])) {
                    // spread operator
                    let finalArr = [...results[0],...results[1]];
                    res.send(finalArr);
                }
                else {
                    res.send(results);
                }
        });


        // req.app.client.get("crypto-2",function(err,reply) {
        //     console.log(err);
        //
        //     if(reply) {
        //         console.log('found');
        //         console.log(JSON.parse(reply));
        //         return res.send(JSON.parse(reply));
        //     }
        //     else {
        //         console.log('not');
        //     }
        //
        //     console.log('not coming');
        //
        //     request(options, function (error, response, body) {
        //
        //         if (error)  {
        //             return console.log(error);
        //         }
        //
        //         let parseString = require('xml2js').parseString;
        //         parseString(body, function (err, result) {
        //
        //
        //
        //             let reducedArray = ((result.rss.channel)[0]).item.slice(lastIndex,lastIndex+4).reduce(function(arr,curr,i) {
        //
        //
        //                 //console.log(req.app.config);
        //
        //
        //                 const domain = url.parse(curr.link.join(''));
        //
        //                 console.log(`${domain.protocol}//${domain.host}`);
        //                 console.log(req.app.config.messengerBot.whitelistedDomains.indexOf(`${domain.protocol}//${domain.host}`));
        //
        //                 if (req.app.config.messengerBot.whitelistedDomains.indexOf(`${domain.protocol}//${domain.host}`) >=0) {
        //                     arr.push ({
        //                         "title": curr.title.join(''),
        //                         "subtitle":   curr.title.join('').slice(0,15),
        //                         //"image_url": "https://peterssendreceiveapp.ngrok.io/img/collection.png",
        //                         "buttons": [
        //                             {
        //                                 "title": "View",
        //                                 "type": "web_url",
        //                                 "url": curr.link.join(''),
        //                                 "messenger_extensions": true,
        //                                 "webview_height_ratio": "tall",
        //                                 "fallback_url": "https://blockchainevangelist.in/"
        //                             }
        //                         ]
        //                     });
        //                 }
        //                 else {
        //                     console.log('not');
        //                     console.log(curr.link.join(''));
        //                 }
        //
        //
        //
        //
        //                 return arr;
        //             },[]);
        //
        //             messages.attachment.payload.elements = reducedArray;
        //
        //             /*
        //                 there is one drawback of this JSON.stringify--> You can not retrieve parts of the object You can not specify the selection of certain keys.
        //                 You necessarily need to retrieve everything, which is likely to become a performance issue on really large objects
        //             */
        //
        //             req.app.client.set(`crypto-2`,JSON.stringify(messages),function(err,reply) {
        //                 console.log(err);
        //                 console.log(reply);
        //                 res.send(messages);
        //             });
        //
        //         });
        //     });
        // });


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
              [ 'https://t.co','https://twitter.com','https://coinmarketcap.com','https://www.stateofthedapps.com','https://blockchainevangelist.in','https://www.cointelegraph.com','https://cointelegraph.com','https://www.coindesk.com','https://coindesk.com'] },
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
                        "title":"Manage Subscription",
                        "payload":"subscription"
                    },
                    {
                          "type":"postback",
                          "title":"Contact Us",
                          "payload":"contactus"
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

        //console.log('coming');
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
                            item_url: "https://www.meetup.com/Ethereum-blockchain-Training/events/244573117/",
                            image_url: "http://144b1e2a.ngrok.io/images/meetup.png",
                            buttons: [{
                                type: "web_url",
                                url: "https://www.oculus.com/en-us/rift/",
                                title: "Open Web URL"
                            }],
                        }, {
                            title: "touch",
                            subtitle: "Your Hands, Now in VR",
                            item_url: "https://www.meetup.com/Ethereum-blockchain-Training/events/244102982/",
                            image_url: "http://144b1e2a.ngrok.io/images/meetup.png",
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
                "text": "next",
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

    },
    getMeetUps : function(req,res) {
        const options = {
            method: 'GET',
            url: 'https://api.meetup.com/2/open_events.json',
            qs:
                { text: 'cryptocurrency',
                    time: ',1m',
                    'lat': '17.3850',
                    lon: '78.4867',
                    key : '2351624b85b603e647464553e35774b'
                },
            headers:
                {
                    'content-type': 'application/json',
                    'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36",
                    'cache-control': 'no-cache'
                }
        };

        request(options, function (error, response, body) {
            if (error) throw new Error(error);
            console.log(body);
            res.send(JSON.parse(body));
            //sendMessage({sender : data.sender ,text : 'okk'});

        });
    }
};

module.exports = webhooks;