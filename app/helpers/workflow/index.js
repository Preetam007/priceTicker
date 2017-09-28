'use strict';
exports = module.exports = function(req, res) {
  let workflow = new (require('events').EventEmitter)();

  // varEventEmitter=require('events').EventEmitter;var emitter =newEventEmitter()

  workflow.outcome = {
    success: false,
    errors: [],
    errfor: {}
  };

  workflow.hasErrors = function() {
    return Object.keys(workflow.outcome.errfor).length !== 0 || workflow.outcome.errors.length !== 0;
  };

  workflow.on('exception', function(err) {
    // Syntax error, command unrecognized and the requested action did not take place. This may include errors such as command line too long.
    if (req.app.get('env') === 'development') {
      workflow.outcome.errors.push('Exception: '+ err);
    } 
    else {
      workflow.outcome.errors.push('Something went wrong');
    }
    return workflow.emit('response');
  });

  workflow.on('response', function() {
    workflow.outcome.success = !workflow.hasErrors();
    res.send(workflow.outcome);
  });
 
  return workflow;
};
