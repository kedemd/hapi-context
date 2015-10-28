// Load modules

var Code = require('code');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var Hoek = require('hoek');

var Hapi = require('hapi');
var Context = require('../lib/index');

// Declare internals

var internals = {};

// Lab shortcuts

var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;

var server = new Hapi.Server();
server.connection();

server.route({
    method: 'GET',
    path: '/',
    config: {
        plugins: {
            'context' : 'valid'
        },
        handler: function (request, reply) {
            return reply(request.plugins.context['valid'].context.name);
        }
    }
});
server.route({
    method: 'GET',
    path: '/other',
    config: {
        plugins: {
            'context' : 'other'
        },
        handler: function (request, reply) {
            return reply(request.plugins.context['other'].context);
        }
    }
});
server.route({
    method: 'GET',
    path: '/none',
    config: {
        handler: function (request, reply) {
            return reply(request.plugins.context);
        }
    }
});
server.route({
    method: 'GET',
    path: '/configObject/none',
    config: {
        plugins: {
            context: {}
        },
        handler: function (request, reply) {
            return reply(request.plugins.context);
        }
    }
});

server.route({
    method: 'GET',
    path: '/configObject',
    config: {
        plugins: {
            'context' : {
                strategy: 'valid'
            }
        },
        handler: function (request, reply) {
            return reply(request.plugins.context['valid'].context.name);
        }
    }
});
server.route({
    method: 'GET',
    path: '/configObject/empty',
    config: {
        plugins: {
            'context' : {
            }
        },
        handler: function (request, reply) {
            return reply(request.plugins.context.name);
        }
    }
});
server.route({
    method: 'GET',
    path: '/configObject/assign',
    config: {
        plugins: {
            'context' : {
                assign: 'test',
                strategy: 'valid'
            }
        },
        handler: function (request, reply) {
            return reply(request.test.name);
        }
    }
});

server.route({
    method: 'GET',
    path: '/invalid',
    config: {
        plugins: {
            'context' : 'invalid'
        },
        handler: function (request, reply) {
            return reply(request.plugins.context);
        }
    }
});

server.route({
    method: 'GET',
    path: '/missing',
    config: {
        plugins: {
            'context' : 'missing'
        },
        handler: function (request, reply) {
            return reply(request.plugins.context);
        }
    }
});

server.route({
    method: 'GET',
    path: '/error',
    config: {
        plugins: {
            'context' : 'error'
        },
        handler: function (request, reply) {
            return reply(request.context);
        }
    }
});

server.route({
    method: 'GET',
    path: '/bad',
    config: {
        plugins: {
            'context' : 'bad'
        },
        handler: function (request, reply) {
            return reply(request.context);
        }
    }
});

server.route({
    method: 'GET',
    path: '/no_assign',
    config: {
        plugins: {
            'context' : {
                strategy: 'valid',
                assign : false
            }
        },
        handler: function (request, reply) {

            server.plugins.context.getContext(request, 'valid', function (err, context) {
                return reply({context: context, assigned: request.context});
            });
        }
    }
});

describe('HapiContext', function () {

    it('registers', function (done) {

        server.register({ register: Context }, function (err) {

            expect(err).to.not.exist();

            expect(server.plugins.context).to.exist();
            expect(server.plugins.context.strategy).to.exist();

            done();
        });


    });

    it('allows valid strategy', function (done) {
        expect(function(){
            server.plugins.context.strategy('valid', {
                getContext: function(request, callback){
                    return callback(null, { "name": "valid" });
                }
            })
        }).to.not.throw();

        expect(function(){
            server.plugins.context.strategy('error', {
                getContext: function(request, callback){
                    throw new Error('example error on context creation');
                }
            })
        }).to.not.throw();

        expect(function(){
            server.plugins.context.strategy('bad', {
                getContext: function(request, callback){
                    return callback('Failed to create context');
                }
            })
        }).to.not.throw();

        done();
    });

    it('rejects invalid strategy', function (done) {

        expect(function(){
            // Already exist
            server.plugins.context.strategy('valid','valid', {
                getContext: function(request, callback){
                    return callback(null, { "name": "already Exist" });
                }
            })
        }).to.throw();

        done();
    });

    it('Creates context', function (done) {
        server.inject('/', function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.exist();
            expect(res.result).to.equal('valid');

            done();
        });
    });

    it('Creates context but dont assign', function (done) {
        server.inject('/no_assign', function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.exist();
            expect(res.result.context).to.exist();
            expect(res.result.assigned).to.not.exist();

            done();
        });
    });

    it('Creates same context instance', function (done) {

        var fakeRequest = { id: 123, plugins: { context : { } } };
            server.plugins.context.getContext(fakeRequest, 'valid', function(err,context){
            expect(context).to.exist();

            context.test = true;

            server.plugins.context.getContext(fakeRequest, 'valid', function(err,newContext){
                expect(context).to.exist();
                expect(context).to.equal(newContext);
                expect(newContext.test).to.equal(true);

                done();
            });
        });
    });

    it('Does not create context', function (done) {
        server.inject('/none', function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.not.exist();

            done();
        });
    });

    it('Does not create context', function (done) {
        server.inject('/configObject/none', function (res) {

            expect(res.statusCode).to.equal(500);

            done();
        });
    });

    it('Throw if empty config', function (done) {
        server.inject('/missing', function (res) {

            expect(res.statusCode).to.equal(500);

            done();
        });
    });

    it('Creates context by object config', function (done) {
        server.inject('/configObject', function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal('valid');

            done();
        });
    });

    it('Creates context by object config', function (done) {
        server.inject('/configObject/empty', function (res) {
            expect(res.statusCode).to.equal(500);

            done();
        });
    });

    it('Creates context by object config', function (done) {
        server.inject('/configObject/assign', function (res) {
            expect(res.result).to.equal('valid');
            expect(res.statusCode).to.equal(200);

            done();
        });
    });

    it('Error', function (done) {
        server.inject('/error', function (res) {

            expect(res.statusCode).to.equal(500);

            done();
        });
    });

    it('handles failed context', function (done) {
        server.inject('/bad', function (res) {

            expect(res.statusCode).to.equal(500);

            done();
        });
    });
});
