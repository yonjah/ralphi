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
		query: sinon.stub(),
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

	before(async () => {
		instance = await server.create({logger, buckets, port, host, db});
	});

	beforeEach(() => {
		_.map(db, method => method.reset());
		_.map(logger, method => method.reset());
	});

	after(() => instance.stop());

	it('should pass get request to db.query', () => {
		const bucket = 'test';
		const key = uid().toString();
		const query = {query: 'fake'};

		db.query.returns(query);

		return instance.inject({
				method: 'GET',
				url: `/${bucket}/${key}`
			}).then(res => {
				db.query.should.be.calledOnce();
				db.query.should.be.calledWith(bucket, key);
				res.result.should.be.eql(query);
			});
	});

	it('should log request to db.query', () => {
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
		const take = {take: 'fake'};

		db.take.returns(take);

		return instance.inject({
				method: 'POST',
				url: `/${bucket}/${key}`
			}).then(res => {
				db.take.should.be.calledOnce();
				db.take.should.be.calledWith(bucket, key);
				res.result.should.be.eql(take);
			});
	});

	it('should log request to db.take', () => {
		const bucket = 'test';
		const key = uid().toString();
		return instance.inject({
				method: 'POST',
				url: `/${bucket}/${key}`
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
		const reset = {reset: 'fake'};

		db.reset.returns(reset);

		return instance.inject({
				method: 'DELETE',
				url: `/${bucket}/${key}`
			}).then(res => {
				db.reset.should.be.calledOnce();
				db.reset.should.be.calledWith(bucket, key);
				res.result.should.be.eql(reset);
			});
	});

	it('should log request to db.reset', () => {
		const bucket = 'test';
		const key = uid().toString();
		const reset = {reset: 'fake'};

		db.reset.returns(reset);

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
		const clean = {clean: 'fake'};

		db.clean.resolves(clean);

		return instance.inject({
				method: 'DELETE',
				url: '/clean'
			}).then(res => {
				db.clean.should.be.calledOnce();
				res.result.should.be.eql(true);
			});
	});

	it('should log request to db.clean', () => {
		const clean = {clean: 'fake'};

		db.clean.resolves(clean);

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


