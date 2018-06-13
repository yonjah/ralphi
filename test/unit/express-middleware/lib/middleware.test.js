/**
 * @file
 * @description Ralphi express middleware test
 */
'use strict';
const utils   = require('./utils');
const express = require('express');
const request = require('supertest');
const {should, sinon, requireSrc} = utils;
const Middleware = requireSrc('middleware');
const bucket = 'test';

describe('express-middleware', () => {

	describe('constructor', () => {
		const arity2 = (x, y) => y;

		it('should be a function arity of 1', () => {
			Middleware.should.be.Function();
			Middleware.should.have.length(1);
		});

		it('should validate options', () => {
			const arity2 = (x, y) => y;

			should(() => Middleware())
				.throw('options "value" is required');
			should(() => Middleware({}))
				.throw(/\[1\] "client" is required/);
			should(() => Middleware({client: {reset: arity2, give: arity2}}))
				.throw(/\[1\] "take" is required/);
			should(() => Middleware({client: {reset: arity2, give: arity2, take () {}}}))
				.throw(/\[1\] "take" must have an arity of 2/);
			should(() => Middleware({client: {take: arity2, give: arity2}}))
				.throw(/\[1\] "reset" is required/);
			should(() => Middleware({client: {take: arity2, give: arity2, reset () {}}}))
				.throw(/\[1\] "reset" must have an arity of 2/);
			should(() => Middleware({client: {take: arity2, reset: arity2}}))
				.throw(/\[1\] "give" is required/);
			should(() => Middleware({client: {take: arity2, reset: arity2, give () {}}}))
				.throw(/\[1\] "give" must have an arity of 2/);
			should(() => Middleware({client: {take: arity2, give: arity2, reset: arity2}}))
				.throw(/\[1\] "bucket" is required/);
			should(() => Middleware({client: {take: arity2, give: arity2, reset: arity2}, bucket: {bad: true}}))
				.throw(/\[1\] "bucket" must be a string/);
			should(() => Middleware({client: {take: arity2, give: arity2, reset: arity2}, bucket: {bad: true}}))
				.throw(/\[1\] "bucket" must be a string/);
			should(() => Middleware({client: {take: arity2, give: arity2, reset: arity2}, bucket: 'assj$'}))
				.throw(/\[1\] "bucket" must only contain alpha-numeric characters/);
			should(() => Middleware({client: {take: arity2, give: arity2, reset: arity2}, bucket, addHeaders: 1}))
				.throw(/\[1\] "addHeaders" must be a boolean/);
			should(() => Middleware({client: {take: arity2, give: arity2, reset: arity2}, bucket, message: 1}))
				.throw(/\[1\] "message" must be a string/);
			should(() => Middleware({client: {take: arity2, give: arity2, reset: arity2}, bucket, onError: 1}))
				.throw(/\[1\] "onError" must be a Function/);
			should(() => Middleware({client: {take: arity2, give: arity2, reset: arity2}, bucket, onError () {}}))
				.throw(/\[1\] "onError" must have an arity of 4/);
			should(() => Middleware({client: {take: arity2, give: arity2, reset: arity2}, bucket, getKey: 1}))
				.throw(/\[1\] "getKey" must be a Function/);
			should(() => Middleware({client: {take: arity2, give: arity2, reset: arity2}, bucket, getKey () {}}))
				.throw(/\[1\] "getKey" must have an arity of 1/);
			should(() => Middleware({client: {take: arity2, give: arity2, reset: arity2}, bucket, errorSize: 'bad'}))
				.throw(/\[1\] "errorSize" must be a number/);
			should(() => Middleware({client: {take: arity2, give: arity2, reset: arity2}, bucket, errorSize: -1}))
				.throw(/\[1\] "errorSize" must be larger than or equal to 0/);
			should(() => Middleware({client: {take: arity2, give: arity2, reset: arity2}, bucket, errorDelay: 'bad'}))
				.throw(/\[1\] "errorDelay" must be a number/);
			should(() => Middleware({client: {take: arity2, give: arity2, reset: arity2}, bucket, errorDelay: 0}))
				.throw(/\[1\] "errorDelay" must be larger than or equal to 1/);
		});


		it('should return a middleware function with airity of 3', () => {
			const middleware = Middleware({client: {take: arity2, give: arity2, reset: arity2}, bucket});
			should(middleware).be.a.Function();
			middleware.should.have.length(3);
		});
	});

	describe('middleware', () => {
		const otherBucket = 'otherBucket';
		const take        = sinon.stub();
		const give       = sinon.stub();
		const reset       = sinon.stub();
		const getKey      = sinon.stub();
		const errorLog    = sinon.stub();
		const handler     = sinon.stub();
		const onError     = sinon.stub();
		const message     = 'custom message';
		const client      = {give: (x, y) => give(x, y), take: (x, y) => take(x, y), reset: (x, y) => reset(x, y)};

		let ip,
			app,
			server;

		function handlerWrap (req, res, next) {
			ip = req.ip;
			handler(req, res, next);
		}

		function onErrorWrap (e, req, res, next) {
			onError(e, req, res, next);
		}

		before(done => {
			const middleware = Middleware({bucket, client, errorLog: e => errorLog(e), getKey: req => getKey(req)});
			app = express();

			app.use('/limit', middleware);
			app.get('/limit', handlerWrap);

			app.use('/defaultKey', Middleware({bucket, client, errorLog: e => errorLog(e)}));
			app.get('/defaultKey', handlerWrap);

			app.use('/error', middleware);
			app.get('/error', (req, res, next) => {
				res.sendStatus(400);
				handler(req, res, next);
			});

			app.use('/otherLimit', middleware.bucket(otherBucket));
			app.get('/otherLimit', handlerWrap);

			app.use('/noHeaders', middleware.addHeaders(false));
			app.get('/noHeaders', handlerWrap);

			app.use('/message', middleware.message(message));
			app.get('/message', handlerWrap);

			app.use('/onError', middleware.onError(onErrorWrap));
			app.get('/onError', handlerWrap);

			app.use('/limitFailedReq', middleware.countSuccess(false));
			app.get('/limitFailedReq', handlerWrap);

			app.use('/limitFailedNoHeaders', middleware.countSuccess(false).addHeaders(false));
			app.get('/limitFailedNoHeaders', handlerWrap);

			server = app.listen(0, done);
		});

		after(done => {
			server.close(done);
		});

		beforeEach(() => {
			give.reset();
			take.reset();
			reset.reset();
			getKey.reset();
			errorLog.reset();
			handler.reset();
			handler.callsFake((req, res) => res.end());
		});

		it('should call take on limited route with correct bucket and key returned from getKey', () => {
			const fakeKey = `KK-${Math.random()}`;
			getKey.callsFake(req => {
				return req.get('X-Fake-Key');
			});
			take.resolves({conformant: true});
			return request(app)
				.get('/limit')
				.set('X-Fake-Key', fakeKey)
				.then(() => {
					take.should.be.calledOnce();
					take.should.be.calledWith(bucket, fakeKey);
					getKey.should.be.calledOnce();
					handler.should.be.calledOnce();
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
			return request(app)
				.get('/limit')
				.expect('x-ratelimit-limit', `${limit.size}`)
				.expect('x-ratelimit-remaining', `${limit.remaining}`)
				.expect('x-ratelimit-reset', `${limit.ttl}`);
		});


		it('should call take on limited route with correct bucket and key default ip as key', () => {
			take.resolves({conformant: true});
			return request(app)
				.get('/defaultKey')
				.then(() => {
					take.should.be.calledOnce();
					take.should.be.calledWith(bucket, ip);
					handler.should.be.calledOnce();
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
			return request(app)
				.get('/error')
				.expect('x-ratelimit-limit', `${limit.size}`)
				.expect('x-ratelimit-remaining', `${limit.remaining}`)
				.expect('x-ratelimit-reset', `${limit.ttl}`);
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
			return request(app)
				.get('/limit')
				.expect('x-ratelimit-limit', `${limit.size}`)
				.expect('x-ratelimit-remaining', `${limit.remaining}`)
				.expect('x-ratelimit-reset', `${limit.ttl}`)
				.expect(429)
				.then(() => {
					handler.should.not.be.called();
				});
		});

		it('should not call handler and return too many requests error if client take fails', () => {
			const fakeKey = {fake: 'key'};
			const error = new Error('Failed!');
			getKey.returns(fakeKey);
			take.rejects(error);
			return request(app)
				.get('/limit')
				.expect('x-ratelimit-limit', '1')
				.expect('x-ratelimit-remaining', '0')
				.expect('x-ratelimit-reset', `${Math.ceil(Date.now() / 1000) + 60}`)
				.expect(429)
				.then(() => {
					handler.should.not.be.called();
				});
		});

		it('should call errorLog function with error when client take fails', () => {
			const fakeKey = {fake: 'key'};
			const error = new Error('Failed!');
			getKey.returns(fakeKey);
			take.rejects(error);
			return request(app)
				.get('/limit')
				.expect('x-ratelimit-limit', '1')
				.expect('x-ratelimit-remaining', '0')
				.expect('x-ratelimit-reset', `${Math.ceil(Date.now() / 1000) + 60}`)
				.expect(429)
				.then(() => {
					errorLog.should.be.calledOnce();
					errorLog.should.be.calledWith(error);
				});
		});

		it('should call take on limited route with correct bucket and key returned from route getKey', () => {
			const fakeKey = `KK-${Math.random()}`;
			getKey.callsFake(req => {
				return req.get('X-Fake-Key');
			});
			take.resolves({conformant: true});
			return request(app)
				.get('/otherLimit')
				.set('X-Fake-Key', fakeKey)
				.then(() => {
					getKey.should.be.calledOnce();
					take.should.be.calledOnce();
					take.should.be.calledWith(otherBucket, fakeKey);
					handler.should.be.calledOnce();
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
			getKey.returns(fakeKey);
			take.resolves(limit);
			return request(app)
				.get('/noHeaders')
				.then(response => {
					should(response.headers).not.have.property('x-ratelimit-limit');
					should(response.headers).not.have.property('x-ratelimit-remaining');
					should(response.headers).not.have.property('x-ratelimit-reset');
				});
		});

		it('should respect route addHeaders when client rejects', () => {
			const fakeKey = {fake: 'key'};
			getKey.returns(fakeKey);
			const error = new Error('Failed!');
			getKey.returns(fakeKey);
			take.rejects(error);
			return request(app)
				.get('/noHeaders')
				.then(response => {
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
			getKey.returns(fakeKey);
			take.resolves(limit);
			return request(app)
				.get('/noHeaders')
				.then(response => {
					should(response.headers).not.have.property('x-ratelimit-limit');
					should(response.headers).not.have.property('x-ratelimit-remaining');
					should(response.headers).not.have.property('x-ratelimit-reset');
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
			return request(app)
				.get('/message')
				.expect(429)
				.expect(message);
		});

		it('should call onError if client fails', () => {
			const fakeKey = {fake: 'key'};
			const error = new Error('Failed!');
			getKey.returns(fakeKey);
			take.rejects(error);
			onError.callsFake((err, req, res, next) => { // eslint-disable-line
				res.sendStatus(500);
			});
			return request(app)
				.get('/onError')
				.expect(500)
				.then(() => {
					handler.should.not.be.called();
					onError.should.be.calledOnce();
					onError.should.be.calledWith(
						error,
						sinon.match({
							constructor: {name: 'IncomingMessage'}
						}),
						sinon.match({
							constructor: {name: 'ServerResponse'}
						}),
						sinon.match.func);

					onError.args[0][1].should.have.property('res');
					onError.args[0][1].res.should.be.equal(onError.args[0][2]);
				});
		});

		it('should allow onError to progress the request', () => {
			const fakeKey = {fake: 'key'};
			const error = new Error('Failed!');
			getKey.returns(fakeKey);
			take.rejects(error);
			onError.callsFake((err, req, res, next) => { // eslint-disable-line
				next();
			});
			return request(app)
				.get('/onError')
				.expect(200);
		});

		it('should call take and give when countSuccess is false and request succeeds', () => {
			const fakeKey = {fake: 'key'};
			getKey.returns(fakeKey);
			const limit = {
				conformant: true,
				size: 10,
				remaining: 9,
				ttl: Math.ceil(Date.now() / 1000) + 100
			};
			take.resolves(limit);
			give.resolves({conformant: true});
			return request(app)
				.get('/limitFailedReq')
				.expect('x-ratelimit-limit', `${limit.size}`)
				.expect('x-ratelimit-remaining', `${limit.remaining + 1}`)
				.expect('x-ratelimit-reset', `${limit.ttl}`)
				.expect(200)
				.then(() => {
					take.should.be.calledOnce();
					take.should.be.calledWith('test', fakeKey);
					handler.should.be.calledOnce();
					give.should.be.calledOnce();
					give.should.be.calledWith('test', fakeKey);
				});
		});

		it('should not call handler or give if not conformant', () => {
			const fakeKey = {fake: 'key'};
			getKey.returns(fakeKey);
			const limit = {
				conformant: false,
				size: 10,
				remaining: 0,
				ttl: Math.ceil(Date.now() / 1000) + 100
			};
			take.resolves(limit);
			return request(app)
				.get('/limitFailedReq')
				.expect('x-ratelimit-limit', `${limit.size}`)
				.expect('x-ratelimit-remaining', `${limit.remaining}`)
				.expect('x-ratelimit-reset', `${limit.ttl}`)
				.expect(429)
				.then(() => {
					take.should.be.calledOnce();
					take.should.be.calledWith('test', fakeKey);
					handler.should.not.be.called();
					give.should.not.be.called();
				});
		});

		it('should only call take when countSuccess is false and request fails', () => {
			const fakeKey = {fake: 'key'};
			handler.callsFake((req, res) => res.sendStatus(400));
			getKey.returns(fakeKey);
			const limit = {conformant: true, remaining: 7, size: 10, ttl: Math.ceil(Date.now() / 1000) + 100};
			take.resolves(limit);
			return request(app)
				.get('/limitFailedReq')
				.expect('x-ratelimit-limit', `${limit.size}`)
				.expect('x-ratelimit-remaining', `${limit.remaining}`)
				.expect('x-ratelimit-reset', `${limit.ttl}`)
				.then(() => {
					take.should.be.calledOnce();
					take.should.be.calledWith('test', fakeKey);
					handler.should.be.calledOnce();
					give.should.not.be.called();

				});
		});

		it('should log error when countSuccess is false and rate limit server returns an error', () => {
			const fakeKey = {fake: 'key'};
			const rlError = new Error('Ha!Ha!');
			const limit = {conformant: true, remaining: 7, size: 10, ttl: Math.ceil(Date.now() / 1000) + 100};
			getKey.returns(fakeKey);
			take.resolves(limit);
			give.rejects(rlError);
			return request(app)
				.get('/limitFailedReq')
				.expect('x-ratelimit-limit', `${limit.size}`)
				.expect('x-ratelimit-remaining', `${limit.remaining + 1}`)
				.expect('x-ratelimit-reset', `${limit.ttl}`)
				.then(() => {
					take.should.be.calledOnce();
					take.should.be.calledWith('test', fakeKey);
					handler.should.be.calledOnce();
					give.should.be.calledOnce();
					give.should.be.calledWith('test', fakeKey);
					errorLog.should.be.calledOnce();
					errorLog.should.be.calledWith(rlError);
				});
		});

		it('should respect route addHeaders settings when countSuccess', () => {
			const fakeKey = {fake: 'key'};
			const limit = {
				conformant: true,
				size: 0,
				remaining: 9,
				ttl: Math.ceil(Date.now() / 1000) + 100
			};
			getKey.returns(fakeKey);
			take.resolves(limit);
			give.resolves(limit);
			return request(app)
				.get('/limitFailedNoHeaders')
				.then(response => {
					take.should.be.calledOnce();
					take.should.be.calledWith('test', fakeKey);
					handler.should.be.calledOnce();
					give.should.be.calledOnce();
					give.should.be.calledWith('test', fakeKey);
					should(response.headers).not.have.property('x-ratelimit-limit');
					should(response.headers).not.have.property('x-ratelimit-remaining');
					should(response.headers).not.have.property('x-ratelimit-reset');
				});
		});

		it('should respect route addHeaders settings when countSuccess and request fails', () => {
			const fakeKey = {fake: 'key'};
			const limit = {
				conformant: true,
				size: 0,
				remaining: 9,
				ttl: Math.ceil(Date.now() / 1000) + 100
			};
			handler.callsFake((req, res) => res.sendStatus(400));
			getKey.returns(fakeKey);
			take.resolves(limit);
			return request(app)
				.get('/limitFailedNoHeaders')
				.then(response => {
					take.should.be.calledOnce();
					take.should.be.calledWith('test', fakeKey);
					handler.should.be.calledOnce();
					give.should.not.be.called();
					should(response.headers).not.have.property('x-ratelimit-limit');
					should(response.headers).not.have.property('x-ratelimit-remaining');
					should(response.headers).not.have.property('x-ratelimit-reset');
				});
		});

	});
});
