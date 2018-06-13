/**
 * @file
 * @description Ralphi server test
 */
'use strict';
const utils = require('./utils');
const {_, uid, requireSrc, sinon} = utils;
const server = requireSrc('server');

describe('server', () => {
	const take = sinon.stub().returns({take: 'fake'});
	const reset = sinon.stub().returns({reset: 'fake'});
	const clean = sinon.stub().returns({clean: 'fake'});
	const db = {
		take : (key, bucket, count) => take(key, bucket, count),
		reset : (key, bucket) => reset(key, bucket),
		clean : () => clean()
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

	before(async () => {
		instance = await server.create({logger, buckets, port, host, db});
	});

	beforeEach(() => {
		take.resetHistory();
		reset.resetHistory();
		clean.resetHistory();
		_.map(logger, method => method.resetHistory());
	});

	after(() => instance.stop());

	it('should pass GET request to db.take with 0 count', () => {
		const bucket = 'test';
		const key = uid().toString();
		const record = {record: 'super fake'};

		take.returns(record);

		return instance.inject({
				method: 'GET',
				url: `/${bucket}/${key}`
			}).then(res => {
				take.should.be.calledOnce();
				take.should.be.calledWith(bucket, key, 0);
				res.result.should.be.eql(record);
			});
	});

	it('should log GET request', () => {
		const bucket = 'test';
		const key = uid().toString();
		return instance.inject({
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

	it('should pass post request to db.take', () => {
		const bucket = 'test';
		const key = uid().toString();
		const takeRes = {take: 'fake'};

		take.returns(takeRes);

		return instance.inject({
				method: 'POST',
				url: `/${bucket}/${key}`,
				payload: {}
			}).then(res => {
				take.should.be.calledOnce();
				take.should.be.calledWith(bucket, key);
				res.result.should.be.eql(takeRes);
			});
	});

	it('should log request to db.take', () => {
		const bucket = 'test';
		const key = uid().toString();
		return instance.inject({
				method: 'POST',
				url: `/${bucket}/${key}`,
				payload: {}
			}).then(() => {
				logger.info.should.be.calledOnce();
				const log = logger.info.args[0][0];
				log.should.have.property('req');
				log.should.have.property('bucket', bucket);
				log.should.have.property('key', key);
			});
	});


	it('should pass reset request to db.reset', () => {
		const bucket = 'test';
		const key = uid().toString();
		const resetRes = {reset: 'fake'};

		reset.returns(resetRes);

		return instance.inject({
				method: 'DELETE',
				url: `/${bucket}/${key}`
			}).then(res => {
				reset.should.be.calledOnce();
				reset.should.be.calledWith(bucket, key);
				res.result.should.be.eql(resetRes);
			});
	});

	it('should log request to db.reset', () => {
		const bucket = 'test';
		const key = uid().toString();
		const resetRes = {reset: 'fake'};

		reset.returns(resetRes);

		return instance.inject({
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

	it('should pass clean request to db.clean', () => {
		const cleanRes = {clean: 'fake'};

		clean.resolves(cleanRes);

		return instance.inject({
				method: 'DELETE',
				url: '/clean'
			}).then(res => {
				clean.should.be.calledOnce();
				res.result.should.be.eql(true);
			});
	});

	it('should log request to db.clean', () => {
		const cleanRes = {clean: 'fake'};

		clean.resolves(cleanRes);

		return instance.inject({
				method: 'DELETE',
				url: '/clean'
			}).then(() => {
				logger.info.should.be.calledOnce();
				const log = logger.info.args[0][0];
				log.should.have.property('req');
			});
	});

});


