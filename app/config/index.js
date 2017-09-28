'use strict';
exports.hostname = process.env.hostname || 'localhost';
exports.port = process.env.PORT || 3003;
exports.datetimestamp = Date.now();
exports.blockchain_feeds = 'https://news.google.com/news/rss/search/section/q/blockchain/blockchain?hl=en&ned=us';
exports.cryypto_feeds = 
exports.access_token = 'EAABzjRLllHgBABHjf4jadxDvpKoGUp7Q5P4VfP9vYrqYkKZASpnH0Yvx5aZAbLD9NwRTF8zndZC7F2ldLe3pFZBwmo0hee6nC2FsSYlLJaouHJWLwRzMAIEIwp8pCchFkZCo5BxhP1JgZCU9dBbmepzfhStOXjZBjZCBuNdpwrrYvIvqwAXqJeXl';
exports.verification_token = 'this_is_my_token';
exports.mongodb = {
  uri: process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://127.0.0.1:27017/priceTicker'
};
