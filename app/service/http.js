'use strict';
// public api
var http = {
  http500: function(err, req, res, next) {

/*    The error handler function should be the last function added with app.use.
    The error handler has a next callback - it can be used to chain multiple error handlers.
*/
    function IsJsonString(str) {
      try {
          JSON.parse(str);
      } catch (e) {
          return 'not a valid json or invalid request';
      }
      return true;
    }
     
    var json_status  =  IsJsonString(req.body);
    res.status(500);
    var data = { err: {} };
    if (req.app.get('env') === 'development') {
      data.err = err;
      data.json_status = json_status ;
      console.log(err.stack);
    }

    // dont leak err stack to user in production
    res.send({ success : false ,errors: 'Something went wrong.', details: data });
  }
};
module.exports = http;