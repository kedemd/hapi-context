var Boom = require('boom');
var Hoek = require('hoek');

var internals = {};

internals._strategies = {};

internals.strategy = function(name, options){
  Hoek.assert(name, 'Context strategy must have a name');
  Hoek.assert(!internals._strategies[name], 'Authentication strategy name already exists');
  Hoek.assert(typeof options.getContext === 'function', 'getContext method must be a function:', options.getContext);

  internals._strategies[name] = options;
};

internals.getContext = function(request, strategy, callback){
  Hoek.assert(request, 'request is required', request);
  Hoek.assert(typeof strategy === 'string', 'strategy must be a string', strategy);
  Hoek.assert(typeof callback === 'function', 'callback must be a function', callback);

  var state = request.plugins['context'] = request.plugins['context'] || {};

  if (state[strategy]) {
    return callback(state[strategy].error, state[strategy].context);
  }

  // Get the strategy
  var implenmentation = internals._strategies[strategy];
  if (!implenmentation) return callback(Boom.badImplementation("Context strategy not found " + strategy));

  implenmentation.getContext(request, function(err, context){
    state[strategy] = {
      error: err,
      context: context
    };

    return callback(err, context);
  });
};

exports.register = function(server, options, next){
  server.plugins['context'] = {};
  server.plugins['context'].strategy = internals.strategy;
  server.plugins['context'].getContext = internals.getContext;

  server.ext("onRequest", function(request, reply){
    var routeConfig = request.route.settings.plugins['context'];
    if (!routeConfig) {
        return reply.continue();
    }

    var strategyName = undefined;
    var assign = 'context';

    if (typeof routeConfig === 'string'){
        strategyName = routeConfig;
        assign = 'context';
    } else {
        strategyName = routeConfig.strategy;
        assign = routeConfig.assign || assign;
    }

    Hoek.assert(strategyName, "Context plugin must have strategy name.");

    internals.getContext(request, strategyName, function(err, context){
      if (err) {
        return reply(Boom.wrap(err, 500, 'Failed to create context'));
      }

      if (assign){
         request[assign] = context;
      }

      return callback(err, context);
    });
  });

  next();
};

exports.register.attributes = {
  pkg: require('../package.json')
};