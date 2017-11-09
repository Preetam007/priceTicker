'use strict';
const Twitter = require('twitter');
exports.hostname = process.env.hostname || 'localhost';
exports.port = process.env.PORT || 3003;
exports.WIT_TOKEN = process.env.WIT_TOKEN || 'test';
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
           // we are using this in meetups and blockchain learn,resources
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
    // websites from where we have to fetch news
    contentWebsites : ['cointelegraph','coindesk'],
    // dont add slash after .com
    whitelistedDomains : ['https://www.coinmarketcap.com','https://www.stateofthedapps.com','https://www.blockchainevangelist.in','https://www.cointelegraph.com','https://www.coindesk.com','https://www.theguardian.com'],
    access_token : process.env.FB_PAGE_TOKEN || 'EAABzjRLllHgBABHjf4jadxDvpKoGUp7Q5P4VfP9vYrqYkKZASpnH0Yvx5aZAbLD9NwRTF8zndZC7F2ldLe3pFZBwmo0hee6nC2FsSYlLJaouHJWLwRzMAIEIwp8pCchFkZCo5BxhP1JgZCU9dBbmepzfhStOXjZBjZCBuNdpwrrYvIvqwAXqJeXl',
    verification_token : process.env.FB_VERIFY_TOKEN || 'this_is_my_token'
};
exports.tweetTokens = {
    consumer_key: '0mlSNqaUJ22rTGqz29JN28RK4',
    consumer_secret: 'IQI3meJyxzkTLrEBbNAHQlYt9fgWObckldoLeNp5tg0lPeU5Yq',
    access_token_key: '2433885552-ESYq0r6VZrHRYgoiU0xyY5TXlIRgxYeMg2aVa14',
    access_token_secret: '71n2ZJBC6BVYWuPMFrkKqTzOzHwoxxiRfppOozO4DKCka'
};
exports.meetupKey = '2351624b85b603e647464553e35774b';
exports.T = new Twitter(this.tweetTokens);
exports.datetimestamp = Date.now();
exports.mongodb = {
  uri: process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://127.0.0.1:27017/priceTicker'
};
