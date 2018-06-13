/**
 * @file
 * @description Ralphi Client test
 */
'use strict';
const utils = require('./utils');
const {should, nock, uid, requireSrc} = utils;
const Client = requireSrc('client');

describe('client', () => {
	describe('constructor', () => {
		it('should create new client using default settings', () => {
			new Client().should.have.property('settings', {host: 'localhost', port: 8910, timeout: 5000});
		});

		it('should merge settings with default settings', () => {
			new Client({host: 'test'}).should.have.property('settings', {host: 'test', port: 8910, timeout: 5000});
			new Client({port: 1234}).should.have.property('settings', {host: 'localhost', port: 1234, timeout: 5000});
			new Client({timeout: 2000}).should.have.property('settings', {host: 'localhost', port: 8910, timeout: 2000});
			new Client({port: 1234, timeout: 2000}).should.have.property('settings', {host: 'localhost', port: 1234, timeout: 2000});
		});

		it('should validate config host as a string', () => {
			should(() => new Client({host: true})).throw('Config host must be a string with value');
			should(() => new Client({host: 3})).throw('Config host must be a string with value');
			should(() => new Client({host: {}})).throw('Config host must be a string with value');
			should(() => new Client({host: ''})).throw('Config host must be a string with value');
		});

		it('should validate config port as a positive integer', () => {
			should(() => new Client({port: true})).throw('Config port must be positive numeric integer');
			should(() => new Client({port: {}})).throw('Config port must be positive numeric integer');
			should(() => new Client({port: '43'})).throw('Config port must be positive numeric integer');
			should(() => new Client({port: -3})).throw('Config port must be positive numeric integer');
			should(() => new Client({port: 0})).throw('Config port must be positive numeric integer');
			should(() => new Client({port: 10.44})).throw('Config port must be positive numeric integer');
		});

		it('should validate config timeout as a positive integer', () => {
			should(() => new Client({timeout: true})).throw('Config timeout must be positive numeric integer');
			should(() => new Client({timeout: {}})).throw('Config timeout must be positive numeric integer');
			should(() => new Client({timeout: '43'})).throw('Config timeout must be positive numeric integer');
			should(() => new Client({timeout: -3})).throw('Config timeout must be positive numeric integer');
			should(() => new Client({timeout: 0})).throw('Config timeout must be positive numeric integer');
			should(() => new Client({timeout: 10.44})).throw('Config timeout must be positive numeric integer');
		});
	});

	describe('query', () => {
		const host = 'localhost';
		const port = 8910;
		const timeout = 500;
		const url  = `http://${host}:${port}`;
		const instance = new Client({host, port, timeout});

		afterEach(() => nock.cleanAll);

		it('should send http request to server and return passed response', () => {
			const bucket = 'test';
			const key = uid().toString();
			const response = {fake: 'response', ttl: Date.now()};
			nock(url).get(`/${bucket}/${key}`).reply(200, response);
			return instance.query(bucket, key)
				.then(res => {
					response.ttl = Math.ceil(response.ttl / 1000);
					should(res).be.eql(response);
				});
		});

		it('should reject request if error is sent', () => {
			const bucket = 'test';
			const key = uid().toString();
			const error = 'Bad fake request';
			const statusCode = 400;
			nock(url).get(`/${bucket}/${key}`).reply(statusCode, error);
			return instance.query(bucket, key)
				.should.be.rejected()
				.then(res => {
					should(res).have.property('message', `${error}(stauts ${statusCode})`);
				});
		});

		it('should reject request if it fails', () => {
			const bucket = 'test';
			const key = uid().toString();
			const error = new Error('Could not send fake req');
			nock(url).get(`/${bucket}/${key}`).replyWithError(error);
			return instance.query(bucket, key)
				.should.be.rejected()
				.then(res => {
					should(res).be.eql(error);
				});
		});

		it('should reject request if it reaches timeout', () => {
			const bucket = 'test';
			const key = uid().toString();
			const response = {fake: 'response', ttl: Date.now()};

			nock(url).get(`/${bucket}/${key}`).socketDelay(timeout + 100).reply(200, response);
			return instance.query(bucket, key)
				.should.be.rejected()
				.then(res => {
					res.message.should.be.eql('socket hang up');
				});
		});

		it('should require string bucket', () => {
			should(instance.query.bind(instance, undefined, 'test')).throw('Bucket must exist and be a string');
			should(instance.query.bind(instance, 0, 'test')).throw('Bucket must exist and be a string');
			should(instance.query.bind(instance, {}, 'test')).throw('Bucket must exist and be a string');
			should(instance.query.bind(instance, 1234, 'test')).throw('Bucket must exist and be a string');
		});

		it('should require string key', () => {
			should(instance.query.bind(instance, 'test')).throw('Key must exist and be a string');
			should(instance.query.bind(instance, 'test', 0)).throw('Key must exist and be a string');
			should(instance.query.bind(instance, 'test', 123)).throw('Key must exist and be a string');
			should(instance.query.bind(instance, 'test', {})).throw('Key must exist and be a string');
		});
	});

	describe('take', () => {
		const host = 'localhost';
		const port = 8910;
		const timeout = 500;
		const url  = `http://${host}:${port}`;
		const instance = new Client({host, port, timeout});

		afterEach(() => nock.cleanAll);

		it('should send http request to server and return passed response', () => {
			const bucket = 'test';
			const key = uid().toString();
			const response = {fake: 'response', ttl: Date.now()};
			nock(url).post(`/${bucket}/${key}`).reply(200, response);
			return instance.take(bucket, key)
				.then(res => {
					response.ttl = Math.ceil(response.ttl / 1000);
					should(res).be.eql(response);
				});
		});

		it('should reject request if error is sent', () => {
			const bucket = 'test';
			const key = uid().toString();
			const error = 'Bad fake request';
			const statusCode = 400;
			nock(url).post(`/${bucket}/${key}`).reply(statusCode, error);
			return instance.take(bucket, key)
				.should.be.rejected()
				.then(res => {
					should(res).have.property('message', `${error}(stauts ${statusCode})`);
				});
		});

		it('should reject request if it fails', () => {
			const bucket = 'test';
			const key = uid().toString();
			const error = new Error('Could not send fake req');
			nock(url).post(`/${bucket}/${key}`).replyWithError(error);
			return instance.take(bucket, key)
				.should.be.rejected()
				.then(res => {
					should(res).be.eql(error);
				});
		});

		it('should reject request if it reaches timeout', () => {
			const bucket = 'test';
			const key = uid().toString();
			const response = {fake: 'response', ttl: Date.now()};

			nock(url).post(`/${bucket}/${key}`).socketDelay(timeout + 100).reply(200, response);
			return instance.take(bucket, key)
				.should.be.rejected()
				.then(res => {
					res.message.should.be.eql('socket hang up');
				});
		});

		it('should require string bucket', () => {
			should(instance.take.bind(instance, undefined, 'test')).throw('Bucket must exist and be a string');
			should(instance.take.bind(instance, 0, 'test')).throw('Bucket must exist and be a string');
			should(instance.take.bind(instance, {}, 'test')).throw('Bucket must exist and be a string');
			should(instance.take.bind(instance, 1234, 'test')).throw('Bucket must exist and be a string');
		});

		it('should require string key', () => {
			should(instance.take.bind(instance, 'test')).throw('Key must exist and be a string');
			should(instance.take.bind(instance, 'test', 0)).throw('Key must exist and be a string');
			should(instance.take.bind(instance, 'test', 123)).throw('Key must exist and be a string');
			should(instance.take.bind(instance, 'test', {})).throw('Key must exist and be a string');
		});
	});

	describe('give', () => {
		const host = 'localhost';
		const port = 8910;
		const timeout = 500;
		const url  = `http://${host}:${port}`;
		const instance = new Client({host, port, timeout});

		afterEach(() => nock.cleanAll);

		it('should send http request to server and return passed response', () => {
			const bucket = 'test';
			const key = uid().toString();
			const response = {fake: 'response', ttl: Date.now()};
			nock(url).post(`/${bucket}/${key}`, 'count=-1').reply(200, response);
			return instance.give(bucket, key)
				.then(res => {
					response.ttl = Math.ceil(response.ttl / 1000);
					should(res).be.eql(response);
				});
		});

		it('should reject request if error is sent', () => {
			const bucket = 'test';
			const key = uid().toString();
			const error = 'Bad fake request';
			const statusCode = 400;
			nock(url).post(`/${bucket}/${key}`, 'count=-1').reply(statusCode, error);
			return instance.give(bucket, key)
				.should.be.rejected()
				.then(res => {
					should(res).have.property('message', `${error}(stauts ${statusCode})`);
				});
		});

		it('should reject request if it fails', () => {
			const bucket = 'test';
			const key = uid().toString();
			const error = new Error('Could not send fake req');
			nock(url).post(`/${bucket}/${key}`, 'count=-1').replyWithError(error);
			return instance.give(bucket, key)
				.should.be.rejected()
				.then(res => {
					should(res).be.eql(error);
				});
		});

		it('should reject request if it reaches timeout', () => {
			const bucket = 'test';
			const key = uid().toString();
			const response = {fake: 'response', ttl: Date.now()};

			nock(url).post(`/${bucket}/${key}`, 'count=-1').socketDelay(timeout + 100).reply(200, response);
			return instance.give(bucket, key)
				.should.be.rejected()
				.then(res => {
					res.message.should.be.eql('socket hang up');
				});
		});

		it('should require string bucket', () => {
			should(instance.give.bind(instance, undefined, 'test')).throw('Bucket must exist and be a string');
			should(instance.give.bind(instance, 0, 'test')).throw('Bucket must exist and be a string');
			should(instance.give.bind(instance, {}, 'test')).throw('Bucket must exist and be a string');
			should(instance.give.bind(instance, 1234, 'test')).throw('Bucket must exist and be a string');
		});

		it('should require string key', () => {
			should(instance.give.bind(instance, 'test')).throw('Key must exist and be a string');
			should(instance.give.bind(instance, 'test', 0)).throw('Key must exist and be a string');
			should(instance.give.bind(instance, 'test', 123)).throw('Key must exist and be a string');
			should(instance.give.bind(instance, 'test', {})).throw('Key must exist and be a string');
		});
	});

	describe('reset', () => {
		const host = 'localhost';
		const port = 8910;
		const timeout = 500;
		const url  = `http://${host}:${port}`;
		const instance = new Client({host, port, timeout});

		afterEach(() => nock.cleanAll);

		it('should send http request to server and return passed response', () => {
			const bucket = 'test';
			const key = uid().toString();
			nock(url).delete(`/${bucket}/${key}`).reply(200, 'true');
			return instance.reset(bucket, key)
				.then(res => {
					should(res).be.eql(true);
					nock(url).delete(`/${bucket}/${key}`).reply(200, 'false');
					return instance.reset(bucket, key);
				}).then(res => {
					should(res).be.eql(false);
				});
		});

		it('should reject request if error is sent', () => {
			const bucket = 'test';
			const key = uid().toString();
			const error = 'Bad fake request';
			const statusCode = 400;
			nock(url).delete(`/${bucket}/${key}`).reply(statusCode, error);
			return instance.reset(bucket, key)
				.should.be.rejected()
				.then(res => {
					should(res).have.property('message', `${error}(stauts ${statusCode})`);
				});
		});

		it('should reject request if it fails', () => {
			const bucket = 'test';
			const key = uid().toString();
			const error = new Error('Could not send fake req');
			nock(url).delete(`/${bucket}/${key}`).replyWithError(error);
			return instance.reset(bucket, key)
				.should.be.rejected()
				.then(res => {
					should(res).be.eql(error);
				});
		});

		it('should reject request if it reaches timeout', () => {
			const bucket = 'test';
			const key = uid().toString();

			nock(url).delete(`/${bucket}/${key}`).socketDelay(timeout + 100).reply(200, 'true');
			return instance.reset(bucket, key)
				.should.be.rejected()
				.then(res => {
					res.message.should.be.eql('socket hang up');
				});
		});

		it('should require string bucket', () => {
			should(instance.reset.bind(instance, undefined, 'test')).throw('Bucket must exist and be a string');
			should(instance.reset.bind(instance, 0, 'test')).throw('Bucket must exist and be a string');
			should(instance.reset.bind(instance, {}, 'test')).throw('Bucket must exist and be a string');
			should(instance.reset.bind(instance, 1234, 'test')).throw('Bucket must exist and be a string');
		});

		it('should require string key', () => {
			should(instance.reset.bind(instance, 'test')).throw('Key must exist and be a string');
			should(instance.reset.bind(instance, 'test', 0)).throw('Key must exist and be a string');
			should(instance.reset.bind(instance, 'test', 123)).throw('Key must exist and be a string');
			should(instance.reset.bind(instance, 'test', {})).throw('Key must exist and be a string');
		});
	});

	describe('clean', () => {
		const host = 'localhost';
		const port = 8910;
		const timeout = 500;
		const url  = `http://${host}:${port}`;
		const instance = new Client({host, port, timeout});

		afterEach(() => nock.cleanAll);

		it('should send http request to server and return passed response', () => {
			nock(url).delete('/clean').reply(200, 'true');
			return instance.clean()
				.then(res => {
					should(res).be.eql(true);
					nock(url).delete('/clean').reply(200, 'false');
					return instance.clean();
				}).then(res => {
					should(res).be.eql(false);
				});
		});


		it('should reject request if error is sent', () => {
			const error = 'Bad fake request';
			const statusCode = 400;
			nock(url).delete('/clean').reply(statusCode, error);
			return instance.clean()
				.should.be.rejected()
				.then(res => {
					should(res).have.property('message', `${error}(stauts ${statusCode})`);
				});
		});

		it('should reject request if it fails', () => {
			const error = new Error('Could not send fake req');
			nock(url).delete('/clean').replyWithError(error);
			return instance.clean()
				.should.be.rejected()
				.then(res => {
					should(res).be.eql(error);
				});
		});

		it('should reject request if it reaches timeout', () => {
			nock(url).delete('/clean').socketDelay(timeout + 100).reply(200, 'true');
			return instance.clean()
				.should.be.rejected()
				.then(res => {
					res.message.should.be.eql('socket hang up');
				});
		});
	});
});
