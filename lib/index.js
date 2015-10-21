var Boom = require('boom');
var Hoek = require('hoek');

var internals = {};

internals._strategies = {};
internals._schemes = {};

internals.strategy = function(name, scheme, options){
  Hoek.assert(name, 'Context strategy must have a name');
  Hoek.assert(!internals._strategies[name], 'Authentication strategy name already exists');
  Hoek.assert(scheme, 'Context strategy', name, 'missing scheme');
  Hoek.assert(internals._schemes[scheme], 'Context strategy', name, 'uses unknown scheme:', scheme);

  options.scheme = scheme;
  internals._strategies[name] = options;
};

internals.scheme = function(name, scheme){
  // Validate the scheme
  Hoek.assert(name, 'Context strategy must have a name');
  Hoek.assert(!internals._schemes[name], 'Context scheme name already exists:', name);
  Hoek.assert(typeof scheme === 'function', 'scheme must be a function:', name);

  internals._schemes[name] = scheme;
};

exports.register = function(server, options, next){
  server.plugins['context'] = {};
  server.plugins['context'].strategy = internals.strategy;
  server.plugins['context'].scheme = internals.scheme;

  server.ext("onPreAuth", function(request, reply){
    var routeConfig = request.route.settings.plugins['context'];
    if (!routeConfig) {
        return reply.continue();
    }

    var strategyName = undefined;
    var assign = 'context';

    if (typeof routeConfig === 'string'){
        strategyName = routeConfig;
        assign = false;
    } else {
        strategyName = routeConfig.strategy;
        assign = routeConfig.assign || assign;
    }

    Hoek.assert(strategyName, "Context plugin must have strategy name.");

    // Check to see if there is a strategy associated with the request
    var strategy = internals._strategies[strategyName];
    if (!strategy) return reply(Boom.badImplementation("Context strategy not found " + strategyName));

    var schemeName = strategy['scheme'];
    var scheme = internals._schemes[schemeName];

    scheme(request, strategy, function(err, context){
      if (err) return reply(Boom.badImplementation("Failed to load context", err));

      // Set the request context to the created context
      request.plugins['context'] = context;
      if (assign){
          request[assign] = context;
      }

      return reply.continue();
    });
  });

  next();
};

exports.register.attributes = {
  pkg: require('../package.json')
};