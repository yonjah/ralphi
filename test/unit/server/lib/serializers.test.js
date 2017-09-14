/**
 * @file
 * @description Ralphi pino serializers test
 */
'use strict';
const utils = require('./utils');
const {path, sinon, base, uid, requireSrc} = utils;
const serializers = requireSrc('serializers');

describe('serializers', () => {
	it('should have a req serializer', () => {
		serializers.should.have.property('req');
		serializers.req.should.be.a.Function();
		serializers.req.should.have.length(1);
	});

	describe('req', () => {
		const pino  = require(path.join(base, 'server', 'node_modules', 'pino'));

		beforeEach(() => {
			sinon.spy(pino.stdSerializers, 'req');
		});

		afterEach(() => {
			pino.stdSerializers.req.restore();
		});

		it('should pass raw request to pino req serializer', () => {
			const rawReq = {fake: ' raw request'};
			serializers.req({fake: 'request', raw: {req: rawReq}});
			pino.stdSerializers.req.should.be.calledOnce();
			pino.stdSerializers.req.should.be.calledWith(rawReq);
		});

		it('should add request id to returned object', () => {
			const req = {fake: 'request', id: uid(), raw: {req: {}}};
			serializers.req(req).should.have.property('id', req.id);
		});
	});
});