'use strict';
exports.hostname = process.env.hostname || 'localhost';
exports.port = process.env.PORT || 3003;
exports.datetimestamp = Date.now();
exports.mongodb = {
  uri: process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://127.0.0.1:27017/priceTicker'
};
