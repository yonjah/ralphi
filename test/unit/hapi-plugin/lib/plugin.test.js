/**
 * @file
 * @description Ralphi hapi plugin test
 */
'use strict';
const utils = require('./utils');
const boom  = require('boom');
const {should, sinon, createServer, requireSrc} = utils;
const plugin = requireSrc('plugin');

describe('hapi-plugin', () => {

	describe('register', () => {

		it('should be a function arity of 3', () => {
			plugin.should.have.property('register');
			plugin.register.should.be.Function();
			plugin.register.should.have.length(3);
		});

		it('should have attributes property', () => {
			plugin.register.should.have.property('attributes');
			plugin.register.attributes.should.have.property('pkg');
			plugin.register.attributes.pkg.should.have.property('name');
			plugin.register.attributes.pkg.should.have.property('version');
		});

		it('should validate options', () => {
			const arity2 = (x, y) => y;

			should(() => plugin.register({fake: 'server'}))
				.throw('options "value" is required');
			should(() => plugin.register({fake: 'server'}, {}))
				.throw(/\[1\] "client" is required/);
			should(() => plugin.register({fake: 'server'}, {client: {reset: arity2}}))
				.throw(/\[1\] "take" is required/);
			should(() => plugin.register({fake: 'server'}, {client: {reset: arity2, take () {}}}))
				.throw(/\[1\] "take" must have an arity of 2/);
			should(() => plugin.register({fake: 'server'}, {client: {take: arity2}}))
				.throw(/\[1\] "reset" is required/);
			should(() => plugin.register({fake: 'server'}, {client: {take: arity2, reset () {}}}))
				.throw(/\[1\] "reset" must have an arity of 2/);
			should(() => plugin.register({fake: 'server'}, {client: {take: arity2, reset: arity2}, ext: {bad: true}}))
				.throw(/\[1\] "ext" must be a string/);
			should(() => plugin.register({fake: 'server'}, {client: {take: arity2, reset: arity2}, ext: 'bad Hook'}))
				.throw(/\[1\] "ext" must be one of \[onPreAuth, onPostAuth, onPreHandler\]/);
			should(() => plugin.register({fake: 'server'}, {client: {take: arity2, reset: arity2}, allRoutes: 1}))
				.throw(/\[1\] "allRoutes" must be a boolean/);
			should(() => plugin.register({fake: 'server'}, {client: {take: arity2, reset: arity2}, bucket: 1}))
				.throw(/\[1\] "bucket" must be a string/);
			should(() => plugin.register({fake: 'server'}, {client: {take: arity2, reset: arity2}, bucket: 'assj$'}))
				.throw(/\[1\] "bucket" must only contain alpha-numeric characters/);
			should(() => plugin.register({fake: 'server'}, {client: {take: arity2, reset: arity2}, addHeaders: 1}))
				.throw(/\[1\] "addHeaders" must be a boolean/);
			should(() => plugin.register({fake: 'server'}, {client: {take: arity2, reset: arity2}, message: 1}))
				.throw(/\[1\] "message" must be a string/);
			should(() => plugin.register({fake: 'server'}, {client: {take: arity2, reset: arity2}, onError: 1}))
				.throw(/\[1\] "onError" must be a Function/);
			should(() => plugin.register({fake: 'server'}, {client: {take: arity2, reset: arity2}, onError () {}}))
				.throw(/\[1\] "onError" must have an arity of 3/);
			should(() => plugin.register({fake: 'server'}, {client: {take: arity2, reset: arity2}, getKey: 1}))
				.throw(/\[1\] "getKey" must be a Function/);
			should(() => plugin.register({fake: 'server'}, {client: {take: arity2, reset: arity2}, getKey () {}}))
				.throw(/\[1\] "getKey" must have an arity of 1/);
			should(() => plugin.register({fake: 'server'}, {client: {take: arity2, reset: arity2}, errorSize: 'bad'}))
				.throw(/\[1\] "errorSize" must be a number/);
			should(() => plugin.register({fake: 'server'}, {client: {take: arity2, reset: arity2}, errorSize: -1}))
				.throw(/\[1\] "errorSize" must be larger than or equal to 0/);
			should(() => plugin.register({fake: 'server'}, {client: {take: arity2, reset: arity2}, errorDelay: 'bad'}))
				.throw(/\[1\] "errorDelay" must be a number/);
			should(() => plugin.register({fake: 'server'}, {client: {take: arity2, reset: arity2}, errorDelay: 0}))
				.throw(/\[1\] "errorDelay" must be larger than or equal to 1/);
		});

		it('should register to the correct request lifecycle on server and call the reply callback on hapi v16', () => {
			const server = {ext: sinon.spy(), version: '16.0.0'};
			const cb = sinon.spy();
			const client = {take: (x, y) => y, reset: (x, y) => y};

			plugin.register(server, {client}, cb);
			server.ext.should.be.calledTwice();
			server.ext.should.be.calledWith('onPreHandler');
			server.ext.should.be.calledWith('onPreResponse');

			server.ext.reset();
			plugin.register(server, {client, ext: 'onPostAuth'}, cb);
			server.ext.should.be.calledTwice();
			server.ext.should.be.calledWith('onPostAuth');
			server.ext.should.be.calledWith('onPreResponse');

			cb.should.be.calledTwice();
		});

		it('should register to the correct request lifecycle on server and call the reply callback on hapi v17', () => {
			const server = {ext: sinon.spy(), version: '17.0.0'};
			const cb = sinon.spy();
			const client = {take: (x, y) => y, reset: (x, y) => y};

			plugin.register(server, {client});
			server.ext.should.be.calledTwice();
			server.ext.should.be.calledWith('onPreHandler');
			server.ext.should.be.calledWith('onPreResponse');

			server.ext.reset();
			plugin.register(server, {client, ext: 'onPostAuth'}, cb);
			server.ext.should.be.calledTwice();
			server.ext.should.be.calledWith('onPostAuth');
			server.ext.should.be.calledWith('onPreResponse');

			cb.should.not.be.called();
		});
	});

	describe('request', () => {
		const take = sinon.stub();
		const reset = sinon.stub();
		const getKey = sinon.stub();
		const bucket = 'test';
		const client = {take: (x, y) => take(x, y), reset: (x, y) => reset(x, y)};

		let limitCount = 0,
			server;

		function promInject (data) {
			return new Promise(resolve => {
				server.inject(data, res => {
					resolve(res);
				});
			});

		}

		before(done => {
			server = createServer({client, getKey: request => getKey(request)}, [
				{
					method: 'GET',
					path: '/limit',
					config: {
						plugins: {
							ralphi: {bucket}
						}
					},
					handler (req, reply) {
						limitCount += 1;
						reply(null, true);
					}
				}, {
					method: 'GET',
					path: '/no-limit',
					handler (req, reply) {
						reply(null, true);
					}
				},  {
					method: 'GET',
					path: '/error',
					config: {
						plugins: {
							ralphi: {bucket}
						}
					},
					handler (req, reply) {
						reply(boom.badRequest());
					}
				}
			]);

			server.start(done);
		});

		after(done => {
			server.stop(done);
		});

		beforeEach(() => {
			take.reset();
			reset.reset();
			getKey.reset();
			limitCount = 0;
		});

		it('should call take on limited route with correct bucket and key returned from getKey', () => {
			const fakeKey = {fake: 'key'};
			getKey.returns(fakeKey);
			take.resolves({conformant: true});
			return promInject({
					url: '/limit'
				}).then(response => {
					getKey.should.be.calledOnce();
					getKey.should.be.calledWith(response.request);
					take.should.be.calledOnce();
					take.should.be.calledWith(bucket, fakeKey);
					limitCount.should.be.eql(1);
				});
		});

		it('should return correct headers on route', () => {
			const fakeKey = {fake: 'key'};
			const limit = {
				conformant: true,
				size: 10,
				remaining: 9,
				ttl: Math.ceil(Date.now() / 1000) + 100
			};
			getKey.returns(fakeKey);
			take.resolves(limit);
			return promInject({
					url: '/limit'
				}).then(response => {
					should(response.headers).have.property('x-ratelimit-limit', limit.size);
					should(response.headers).have.property('x-ratelimit-remaining', limit.remaining);
					should(response.headers).have.property('x-ratelimit-reset', limit.ttl);
				});
		});

		it('should return correct headers on route on error', () => {
			const fakeKey = {fake: 'key'};
			const limit = {
				conformant: true,
				size: 10,
				remaining: 9,
				ttl: Math.ceil(Date.now() / 1000) + 100
			};
			getKey.returns(fakeKey);
			take.resolves(limit);
			return promInject({
					url: '/error'
				}).then(response => {
					should(response.headers).have.property('x-ratelimit-limit', limit.size);
					should(response.headers).have.property('x-ratelimit-remaining', limit.remaining);
					should(response.headers).have.property('x-ratelimit-reset', limit.ttl);
				});
		});

		it('should not call handler and return too many requests error if not conformant', () => {
			const fakeKey = {fake: 'key'};
			const limit = {
				conformant: false,
				size: 10,
				remaining: 0,
				ttl: Math.ceil(Date.now() / 1000) + 100
			};
			getKey.returns(fakeKey);
			take.resolves(limit);
			return promInject({
					url: '/limit'
				}).then(response => {
					limitCount.should.be.eql(0);
					response.statusCode.should.be.eql(429);
					should(response.headers).have.property('x-ratelimit-limit', limit.size);
					should(response.headers).have.property('x-ratelimit-remaining', limit.remaining);
					should(response.headers).have.property('x-ratelimit-reset', limit.ttl);
				});
		});

		it('should not call handler and return too many requests error if client take fails', () => {
			const fakeKey = {fake: 'key'};
			const error = new Error('Failed!');
			getKey.returns(fakeKey);
			take.rejects(error);
			return promInject({
					url: '/limit'
				}).then(response => {
					limitCount.should.be.eql(0);
					response.statusCode.should.be.eql(429);
					should(response.headers).have.property('x-ratelimit-limit', 1);
					should(response.headers).have.property('x-ratelimit-remaining', 0);
					should(response.headers).have.property('x-ratelimit-reset', Math.ceil(Date.now() / 1000) + 60);
					response.request.response._error.should.be.eql(error);
					response.result.message.should.not.match(new RegExp(error.message));
				});
		});

		it('should not call take or getKey on unlimited route', () => {
			const fakeKey = {fake: 'key'};
			getKey.returns(fakeKey);
			take.resolves({conformant: true});
			return promInject({
					url: '/no-limit'
				}).then(response => {
					getKey.should.not.be.called();
					take.should.not.be.called();
					response.result.should.be.eql(true);
				});
		});

		it('should not return headers on unlimited route', () => {
			const fakeKey = {fake: 'key'};
			const limit = {conformant: true};
			getKey.returns(fakeKey);
			take.resolves(limit);
			return promInject({
					url: '/no-limit'
				}).then(response => {
					should(response.headers).not.have.property('x-ratelimit-limit');
					should(response.headers).not.have.property('x-ratelimit-remaining');
					should(response.headers).not.have.property('x-ratelimit-reset');
				});
		});

	});

	describe('config overrides', () => {
		const take = sinon.stub();
		const reset = sinon.stub();
		const getKey = sinon.stub();
		const bucket = 'test';
		const message = 'No more calls';
		const onError = sinon.stub();
		const client = {take: (x, y) => take(x, y), reset: (x, y) => reset(x, y)};
		const otherBucket = 'otherBucket';
		const otherGetKey = sinon.stub();

		let server;

		function promInject (data) {
			return new Promise(resolve => {
				server.inject(data, res => {
					resolve(res);
				});
			});

		}

		before(done => {
			server = createServer({
					client,
					allRoutes: true,
					message,
					onError: (req, reply, e) => {
						onError(req, reply, e);
						if (typeof reply.continue !== 'function') {
							return reply.continue;
						}
						reply.continue();
					},
					bucket
				}, [
					{
						method: 'GET',
						path: '/limit',
						handler (req, reply) {
							reply(null, true);
						}
					}, {
						method: 'GET',
						path: '/otherLimit',
						config: {
							plugins: {
								ralphi: {
									onError: undefined,
									bucket: otherBucket,
									getKey: request => otherGetKey(request),
									addHeaders: false
								}
							}
						},
						handler (req, reply) {
							reply(null, true);
						}
					}, {
						method: 'GET',
						path: '/no-limit',
						config: {
							plugins: {
								ralphi: false
							}
						},
						handler (req, reply) {
							reply(null, true);
						}
					}
			]);

			server.start(done);
		});

		after(done => {
			server.stop(done);
		});

		beforeEach(() => {
			take.reset();
			reset.reset();
			getKey.reset();
			onError.reset();
			otherGetKey.reset();
		});

		it('should call take on limited route with correct bucket and key returned from route getKey', () => {
			const fakeKey = {fake: 'key'};
			otherGetKey.returns(fakeKey);
			take.resolves({conformant: true});
			return promInject({
					url: '/otherLimit'
				}).then(response => {
					getKey.should.not.be.called();
					otherGetKey.should.be.calledOnce();
					otherGetKey.should.be.calledWith(response.request);
					take.should.be.calledOnce();
					take.should.be.calledWith(otherBucket, fakeKey);
				});
		});

		it('should respect route addHeaders settings', () => {
			const fakeKey = {fake: 'key'};
			const limit = {
				conformant: true,
				size: 10,
				remaining: 9,
				ttl: Math.ceil(Date.now() / 1000) + 100
			};
			otherGetKey.returns(fakeKey);
			take.resolves(limit);
			return promInject({
					url: '/otherLimit'
				}).then(response => {
					should(response.headers).not.have.property('x-ratelimit-limit');
					should(response.headers).not.have.property('x-ratelimit-remaining');
					should(response.headers).not.have.property('x-ratelimit-reset');
				});
		});

		it('should respect route addHeaders when client rejects', () => {
			const fakeKey = {fake: 'key'};
			otherGetKey.returns(fakeKey);
			const error = new Error('Failed!');
			getKey.returns(fakeKey);
			take.rejects(error);
			return promInject({
					url: '/otherLimit'
				}).then(response => {
					should(response.headers).not.have.property('x-ratelimit-limit');
					should(response.headers).not.have.property('x-ratelimit-remaining');
					should(response.headers).not.have.property('x-ratelimit-reset');
				});
		});

		it('should respect route addHeaders settings when limited', () => {
			const fakeKey = {fake: 'key'};
			const limit = {
				conformant: false,
				size: 10,
				remaining: 0,
				ttl: Math.ceil(Date.now() / 1000) + 100
			};
			otherGetKey.returns(fakeKey);
			take.resolves(limit);
			return promInject({
					url: '/otherLimit'
				}).then(response => {
					should(response.headers).not.have.property('x-ratelimit-limit');
					should(response.headers).not.have.property('x-ratelimit-remaining');
					should(response.headers).not.have.property('x-ratelimit-reset');
				});
		});

		it('should use remoteAddress as default key', () => {
			const fakeKey = {fake: 'key'};
			const limit = {
				conformant: true
			};
			getKey.returns(fakeKey);
			take.resolves(limit);
			return promInject({
					url: '/limit'
				}).then(response => {
					take.should.be.calledOnce();
					take.should.be.calledWith(bucket, response.request.info.remoteAddress);
				});
		});

		it('should return custom message if not conformant', () => {
			const fakeKey = {fake: 'key'};
			const limit = {
				conformant: false,
				size: 10,
				remaining: 0,
				ttl: Math.ceil(Date.now() / 1000) + 100
			};
			getKey.returns(fakeKey);
			take.resolves(limit);
			return promInject({
					url: '/limit'
				}).then(response => {
					response.statusCode.should.be.eql(429);
					response.result.message.should.be.eql(message);
				});
		});

		it('should call onError if client fails', () => {
			const fakeKey = {fake: 'key'};
			const error = new Error('Failed!');
			getKey.returns(fakeKey);
			take.rejects(error);
			return promInject({
					url: '/limit'
				}).then(response => {
					onError.should.be.calledOnce();
					onError.should.be.calledWith(response.request, sinon.match.any, error);
				});
		});

	});
});
