'use strict';
exports.hostname = process.env.hostname || 'localhost';
exports.port = process.env.PORT || 3003;
exports.redisPort = '6379';
exports.messengerBot = {
    titles_length : 80,
    subtitles_length : 320,
    description_length : 320,
    profile_picture_size : {
        page : '1024*1024',
        app : '1024*1024'
    },
    templates : {
        generic : {
           items :  10,
           button : 3
        },
        // check differ
        quick_messages : {
           buttons : 11,
           characters_must_maximium : 20
        }
    },
    blockchain_feeds : 'https://news.google.com/news/rss/search/section/q/blockchain/blockchain?hl=en&ned=us',
    cryypto_feeds : '',
    // dont add slash after .com
    whitelistedDomains : ['https://coinmarketcap.com','https://www.stateofthedapps.com','https://blockchainevangelist.in','https://cointelegraph.com','https://www.coindesk.com','https://www.theguardian.com'],
    access_token : 'EAABzjRLllHgBABHjf4jadxDvpKoGUp7Q5P4VfP9vYrqYkKZASpnH0Yvx5aZAbLD9NwRTF8zndZC7F2ldLe3pFZBwmo0hee6nC2FsSYlLJaouHJWLwRzMAIEIwp8pCchFkZCo5BxhP1JgZCU9dBbmepzfhStOXjZBjZCBuNdpwrrYvIvqwAXqJeXl',
    verification_token : 'this_is_my_token'
};
exports.datetimestamp = Date.now();
exports.mongodb = {
  uri: process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://127.0.0.1:27017/priceTicker'
};
