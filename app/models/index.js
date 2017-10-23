exports = module.exports = function(app, mongoose) {
    'use strict';
    //embeddable docs first
    require('../schema/User')(app, mongoose);
};
