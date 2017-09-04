/**
 * @file
 * @description Ralphi server test
 */
'use strict';
const utils = require('./utils');
const {_, uid, requireSrc, sinon} = utils;
const server = requireSrc('server');

describe('server', () => {
	const db = {
		take: sinon.stub(),
		reset: sinon.stub(),
		clean: sinon.stub()
	};
	const logger = {
		debug: sinon.spy(),
		info: sinon.spy(),
		error: sinon.spy()
	};
	const buckets = {
		test: {size: 1, ttl: 1}
	};
	const host = 'localhost';
	const port = 8910;

	let instance;

	function promInject (data) {
		return new Promise(resolve => {
			instance.inject(data, res => {
				resolve(res);
			});
		});

	}

	before(done => {
		server.create({logger, buckets, port, host, db}, server => {
			instance = server;
			done();
		});
	});

	beforeEach(() => {
		_.map(db, method => method.reset());
		_.map(logger, method => method.reset());
	});

	after(() => instance.stop());

	it('should pass get request to db.take', () => {
		const bucket = 'test';
		const key = uid().toString();
		const take = {take: 'fake'};

		db.take.returns(take);

		return promInject({
				method: 'GET',
				url: `/${bucket}/${key}`
			}).then(res => {
				db.take.should.be.calledOnce();
				db.take.should.be.calledWith(bucket, key);
				res.result.should.be.eql(take);
			});
	});

	it('should pass log request to db.take', () => {
		const bucket = 'test';
		const key = uid().toString();
		return promInject({
				method: 'GET',
				url: `/${bucket}/${key}`
			}).then(() => {
				logger.info.should.be.calledOnce();
				const log = logger.info.args[0][0];
				log.should.have.property('req');
				log.should.have.property('bucket', bucket);
				log.should.have.property('key', key);
			});
	});


	it('should pass get request to db.reset', () => {
		const bucket = 'test';
		const key = uid().toString();
		const reset = {reset: 'fake'};

		db.reset.returns(reset);

		return promInject({
				method: 'DELETE',
				url: `/${bucket}/${key}`
			}).then(res => {
				db.reset.should.be.calledOnce();
				db.reset.should.be.calledWith(bucket, key);
				res.result.should.be.eql(reset);
			});
	});

	it('should pass log request to db.reset', () => {
		const bucket = 'test';
		const key = uid().toString();
		const reset = {reset: 'fake'};

		db.reset.returns(reset);

		return promInject({
				method: 'DELETE',
				url: `/${bucket}/${key}`
			}).then(() => {
				logger.info.should.be.calledOnce();
				const log = logger.info.args[0][0];
				log.should.have.property('req');
				log.should.have.property('bucket', bucket);
				log.should.have.property('key', key);
			});
	});

});


