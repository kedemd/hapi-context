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
            return reply(request.plugins.context.name);
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
            return reply(request.plugins.context);
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
            return reply(request.plugins.context);
        }
    }
});

describe('HapiContext', function () {

    it('registers', function (done) {

        server.register({ register: Context }, function (err) {

            expect(err).to.not.exist();

            expect(server.plugins.context).to.exist();
            expect(server.plugins.context.scheme).to.exist();
            expect(server.plugins.context.strategy).to.exist();

            done();
        });


    });
    it('allows valid scheme', function (done) {
        expect(function(){
            server.plugins.context.scheme('valid', function(request, strategy, callback){ strategy.getContext(request, callback); });
        }).to.not.throw();

        expect(function(){
            server.plugins.context.scheme('other', function(request, strategy, callback){ return callback(null, 'other'); });
        }).to.not.throw();

        expect(function(){
            server.plugins.context.scheme('error', function(request, strategy, callback){ return callback('error'); });
        }).to.not.throw();

        done();
    });

    it('rejects invalid scheme', function (done) {
        expect(function(){
            server.plugins.context.scheme('invalid', {});
        }).to.throw(Error);

        expect(function(){
            server.plugins.context.scheme('', server.plugins['hapi-context'].scheme('valid', function(request, strategy, callback){ strategy.getContext(request, callback); }));
        }).to.throw(Error);

        expect(function() {
            server.plugins.context.scheme('valid', function (request, strategy, callback) {
                strategy.getContext(request, callback);
            });
        }).to.throw(Error);

        done();
    });

    it('allows valid strategy', function (done) {
        expect(function(){
            server.plugins.context.strategy('valid','valid', {
                getContext: function(request, callback){
                    return callback(null, { "name": "valid" });
                }
            })
        }).to.not.throw();

        expect(function(){
            server.plugins.context.strategy('other','other', {
            })
        }).to.not.throw();

        expect(function(){
            server.plugins.context.strategy('error','error', {
            })
        }).to.not.throw();

        done();
    });

    it('rejects invalid strategy', function (done) {
        expect(function(){
            server.plugins.context.strategy('','valid', {
                getContext: function(request, callback){
                    return callback(null, { "name": "no name" });
                }
            })
        }).to.throw();

        expect(function(){
            // No scheme
            server.plugins.context.strategy('noScheme','', {
                getContext: function(request, callback){
                    return callback(null, { "name": "no name" });
                }
            })
        }).to.throw();

        expect(function(){
            // No scheme
            server.plugins.context.strategy('noScheme','test', {
                getContext: function(request, callback){
                    return callback(null, { "name": "no name" });
                }
            })
        }).to.throw();

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

    it('Creates context', function (done) {
        server.inject('/other', function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.exist();
            expect(res.result).to.equal('other');

            done();
        });
    });

    it('Does not create context', function (done) {
        server.inject('/none', function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.not.exist();

            done();
        });
    });

    it('Does not create context missing strategy', function (done) {
        server.inject('/missing', function (res) {

            expect(res.statusCode).to.equal(500);

            done();
        });
    });

    it('Error', function (done) {
        server.inject('/error', function (res) {

            expect(res.statusCode).to.equal(500);

            done();
        });
    });
});
