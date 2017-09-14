/**
 * @file
 * @description Ralphi pino clean runner test
 */
'use strict';
const utils = require('./utils');
const {should, sinon, lolex, uid, requireSrc} = utils;
const cleanRunner = requireSrc('clean-runner');

describe('serializers', () => {
	const db = {
		clean: sinon.stub()
	};
	const logger = {
		warn: sinon.spy()
	};

	let now, clock;

	beforeEach(() => {
		now = Date.now();
		clock = lolex.install({now, toFake:['setInterval']});
		db.clean.reset();
		logger.warn.reset();
	});

	afterEach(() => {
		clock.uninstall();
	});

	it('should export a function', () => {
		cleanRunner.should.be.a.Function();
		cleanRunner.should.have.length(3);
	});

	it('should call clean db on each interval', () => {
		const interval = 600;
		db.clean.resolves(true);
		cleanRunner(db, logger, interval);
		clock.tick(interval);
		db.clean.should.be.calledOnce();
		return Promise.resolve()
			.then(() => {
				clock.tick(interval);
				db.clean.should.be.calledTwice();
			}).then(() => {
				clock.tick(Math.ceil(interval / 2));
				db.clean.should.be.calledTwice();
				clock.tick(Math.ceil(interval / 2));
				db.clean.should.be.calledThrice();
			});
	});

	it('should warn and delay clean if previous run did not complete ', () => {
		const interval = 60;
		const delay = 10;
		db.clean.callsFake(() => {
			return new Promise(resolves => {
				clock.setTimeout(resolves, interval + delay);
			});
		});
		cleanRunner(db, logger, interval);
		clock.tick(interval);
		db.clean.should.be.calledOnce();
		return Promise.resolve()
			.then(() => {
				clock.tick(interval);
				db.clean.should.be.calledOnce();
				logger.warn.should.be.calledOnce();
				clock.tick(delay);
			}).then(() => {
				clock.tick(interval);
				db.clean.should.be.calledTwice();
				logger.warn.should.be.calledOnce();
				logger.warn.should.be.calledWith('Cleaning failed to run due to previous incomplete process, you should consider increasing clean-interval setting');
			});
	});


	it('should throw an error if clean fails ', () => {
		const interval = 60;
		const err = new Error('Bad Clean!');
		const unhandledRejection = sinon.spy();

		process.once('unhandledRejection', unhandledRejection);

		db.clean.rejects(err);
		cleanRunner(db, logger, interval);
		clock.tick(interval);
		return Promise.resolve()
			.then(() => {
				return new Promise(resolve => {
					setTimeout(resolve, 10);
				});
			}).then(() => {
				process.removeListener('unhandledRejection', unhandledRejection);
				unhandledRejection.should.be.calledOnce();
				unhandledRejection.should.be.calledWith(err);
			});
	});
});