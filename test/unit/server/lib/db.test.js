/**
 * @file
 * @description Ralphi database test
 */
'use strict';
const utils = require('./utils');
const {should, lolex, uid, requireSrc} = utils;
const db = requireSrc('db');

describe('db', () => {
	const logger = {debug (){}, info (){}};
	const buckets = {
			fast1: {ttl:1, size: 1},
			fast10: {ttl:1, size: 10},
			medium: {ttl: 10, size: 5},
			slow: {ttl: 100, size: 5}
		};
	it('should validate config', () => {
		should(db).throw(/"buckets" is required/);
		should(db.bind(null, {})).throw(/"buckets" is required/);
		should(db.bind(null, {buckets: {}})).throw(/must have at least 1 children/);
		should(db.bind(null, {buckets: {bad: {}}})).throw(/"ttl" is required/);
		should(db.bind(null, {buckets: {bad: {ttl: 1}}})).throw(/"size" is required/);
		should(db.bind(null, {buckets: {bad: {ttl: -1, size: 1}}})).throw(/"ttl" must be larger than or equal to 1/);
		should(db.bind(null, {buckets: {bad: {ttl: 1, size: 0}}})).throw(/"size" must be larger than or equal to 1/);
		should(db.bind(null, {buckets})).throw(/"logger" is required/);
		should(db.bind(null, {buckets, logger: {}})).throw(/"debug" is required/);
		should(db.bind(null, {buckets, logger: {debug: {}}})).throw(/"debug" must be a Function/);
		should(db.bind(null, {buckets, logger: {debug (){}}})).throw(/"info" is required/);
		should(db.bind(null, {buckets, logger: {debug (){}, info: {}}})).throw(/"info" must be a Function/);
	});

	it('should init a new db', () => {
		const dbi = db({
			buckets,
			logger
		});
		dbi.should.have.property('take');
		dbi.take.should.be.Function();
		dbi.should.have.property('reset');
		dbi.reset.should.be.Function();
		dbi.should.have.property('clean');
		dbi.reset.should.be.Function();
	});

	describe('take', () => {
		const dbi = db({
			logger,
			buckets
		});

		const count = 1;


		let now, clock;

		beforeEach(() => {
			now = Date.now();
			clock = lolex.install({now, toFake:['Date']});
		});

		afterEach(() => {
			clock.uninstall();
		});


		it('should take token count and return correct rate limiting info', () => {
			const name   = 'fast10';
			const bucket = buckets[name];
			const key    = uid();

			let i;

			for (i = bucket.size; i > 0; i -= 1) {
				dbi.take(name, key, count).should.be.eql({
					conformant: true,
					remaining: i - count,
					size: bucket.size,
					ttl: now + bucket.ttl
				});
			}

			dbi.take(name, key, count).should.be.eql({
				conformant: false,
				size: bucket.size,
				remaining: 0,
				ttl: now + bucket.ttl
			});

			dbi.take(name, key, -count).should.be.eql({
				conformant: false,
				size: bucket.size,
				remaining: 0,
				ttl: now + bucket.ttl
			});


			for (i = 0; i < bucket.size; i += 1) {
				dbi.take(name, key, -count).should.be.eql({
					conformant: true,
					remaining: i + count,
					size: bucket.size,
					ttl: now + bucket.ttl
				});
			}
		});

		it('should keep internal state of overdrawn tokens', () => {
			const name   = 'fast1';
			const bucket = buckets[name];
			const key    = uid();

			const runs  = 10 + Math.ceil(Math.random() * 40);

			let i;

			for (i = bucket.size; i > 0; i -= 1) {
				dbi.take(name, key, count).should.be.eql({
					conformant: true,
					remaining: i - count,
					size: bucket.size,
					ttl: now + bucket.ttl
				});
			}

			for (i = runs; i > 0; i -= 1) {
				dbi.take(name, key, count).should.be.eql({
					conformant: false,
					remaining: 0,
					size: bucket.size,
					ttl: now + bucket.ttl
				});
			}

			for (i = runs; i > 0; i -= 1) {
				dbi.take(name, key, -count).should.be.eql({
					conformant: false,
					remaining: 0,
					size: bucket.size,
					ttl: now + bucket.ttl
				});
			}

			dbi.take(name, key, -count).should.be.eql({
				conformant: true,
				remaining: 1,
				size: bucket.size,
				ttl: now + bucket.ttl
			});
		});

		it('should not add tokens past bucket size', () => {
			const name   = 'fast10';
			const bucket = buckets[name];
			const key    = uid();

			dbi.take(name, key, -count).should.be.eql({
				conformant: true,
				remaining: bucket.size,
				size: bucket.size,
				ttl: now + bucket.ttl
			});

			dbi.take(name, key, -count).should.be.eql({
				conformant: true,
				remaining: bucket.size,
				size: bucket.size,
				ttl: now + bucket.ttl
			});

			dbi.take(name, key, count).should.be.eql({
				conformant: true,
				remaining: bucket.size - count,
				size: bucket.size,
				ttl: now + bucket.ttl
			});

			dbi.take(name, key, -count).should.be.eql({
				conformant: true,
				remaining: bucket.size,
				size: bucket.size,
				ttl: now + bucket.ttl
			});

			dbi.take(name, key, -count).should.be.eql({
				conformant: true,
				remaining: bucket.size,
				size: bucket.size,
				ttl: now + bucket.ttl
			});

			dbi.take(name, key, (count * 2)).should.be.eql({
				conformant: true,
				remaining: bucket.size - (count * 2),
				size: bucket.size,
				ttl: now + bucket.ttl
			});

			dbi.take(name, key, -(count * 5)).should.be.eql({
				conformant: true,
				remaining: bucket.size,
				size: bucket.size,
				ttl: now + bucket.ttl
			});
		});

		it('should add new tokens once ttl expires', () => {
			const name = 'fast1';
			const bucket = buckets[name];
			const key = uid();
			for (let i = bucket.size; i > 0; i -= 1) {
				dbi.take(name, key, count).should.be.eql({
					conformant: true,
					remaining: i - 1,
					size: bucket.size,
					ttl: now + bucket.ttl
				});
			}
			dbi.take(name, key, count).should.be.eql({
				conformant: false,
				size: bucket.size,
				remaining: 0,
				ttl: now + bucket.ttl
			});
			clock.tick(bucket.ttl + 1);
			now += bucket.ttl + 1;
			dbi.take(name, key, count).should.be.eql({
				conformant: true,
				remaining: bucket.size - 1,
				size: bucket.size,
				ttl: now + bucket.ttl
			});

		});

		it('should return new record without removing any tokens when count is 0', () => {
			const name   = 'fast10';
			const bucket = buckets[name];
			const key    = uid();
			const takeResult = {
				conformant: true,
				remaining: bucket.size,
				size: bucket.size,
				ttl: now + bucket.ttl
			};
			dbi.take(name, key, 0).should.be.eql(takeResult);
			dbi.take(name, key, 0).should.be.eql(takeResult);
		});

		it('should return existing record without removing any tokens when count is 0', () => {
			const name = 'fast10';
			const bucket = buckets[name];
			const key = uid();
			let takeResult = dbi.take(name, key),
				remaining = bucket.size - 1;
			takeResult.should.have.property('remaining', remaining);
			dbi.take(name, key, 0).should.be.eql(takeResult);
			dbi.take(name, key, 0).should.be.eql(takeResult);
			for (let i = bucket.size; i > 0; i -= 1) {
				takeResult =  dbi.take(name, key);
				remaining -= 1;
				takeResult.should.have.property('remaining', remaining);
				if (takeResult.remaining === 0) {
					dbi.take(name, key, 0).should.be.eql(Object.assign({}, takeResult, {conformant: false}));
					takeResult = dbi.take(name, key);
					break;
				}
			}
			dbi.take(name, key, 0).should.be.eql(takeResult);
		});

		it('should return correct conformant state when count is 0', () => {
			const name = 'fast10';
			const key = uid();
			let takeResult = dbi.take(name, key);
			while (takeResult.conformant) {
				takeResult = dbi.take(name, key);
			}
			dbi.take(name, key, 0).should.be.eql(takeResult);
		});

		it('should return correct conformant state when count is -1', () => {
			const name = 'fast10';
			const key = uid();
			let takeResult = dbi.take(name, key);
			while (takeResult.conformant) {
				takeResult = dbi.take(name, key);
			}
			takeResult = dbi.take(name, key, -1);
			takeResult.should.have.property('remaining', 0);
			takeResult.should.have.property('conformant', false);
			takeResult = dbi.take(name, key, -1);
			takeResult.should.have.property('remaining', 1);
			takeResult.should.have.property('conformant', true);
		});


		it('should not return negative remaining state when count is 0', () => {
			const name = 'fast1';
			const key = uid();
			let takeResult = dbi.take(name, key);
			while (takeResult.conformant) {
				takeResult = dbi.take(name, key);
			}
			takeResult = dbi.take(name, key);
			dbi.take(name, key, 0).should.be.eql(takeResult);
		});


		it('should fail if bucket does not exist', () => {
			const name = 'nonExist';
			const key = uid();
			should(dbi.take.bind(dbi, name, key, count)).throw(`Could not find bucket ${name}`);
		});
	});


	describe('reset', () => {
		const dbi = db({
			logger,
			buckets
		});
		const count = 1;

		let now, clock;

		beforeEach(() => {
			now = Date.now();
			clock = lolex.install({now, toFake:['Date']});
		});

		afterEach(() => {
			clock.uninstall();
		});

		it('should delete limit if exists', () => {
			const name = 'fast1';
			const bucket = buckets[name];
			const key = uid();
			dbi.take(name, key, count).should.be.eql({
				conformant: true,
				remaining: bucket.size - 1,
				size: bucket.size,
				ttl: now + bucket.ttl
			});
			dbi.take(name, key, count).should.be.eql({
				conformant: false,
				size: bucket.size,
				remaining: 0,
				ttl: now + bucket.ttl
			});
			dbi.reset(name, key).should.be.equal(true);
			dbi.take(name, key, count).should.be.eql({
				conformant: true,
				remaining: bucket.size - 1,
				size: bucket.size,
				ttl: now + bucket.ttl
			});
		});

		it('should return false if limit does not exist', () => {
			const name = 'fast1';
			const key = uid();
			dbi.reset(name, key).should.be.equal(false);
		});

		it('should fail if bucket does not exist', () => {
			const name = 'nonExist';
			const key = uid();
			should(dbi.reset.bind(dbi, name, key)).throw(`Could not find bucket ${name}`);
		});

	});

	describe('clean', () => {
		const dbi = db({
			logger,
			buckets
		});

		const count = 1;

		let now, clock;

		beforeEach(() => {
			now = Date.now() - 1000;
			clock = lolex.install({now, toFake:['Date']});
		});

		afterEach(() => {
			clock.uninstall();
		});

		it('should remove all expired timers', () => {
			const name = 'medium';
			const bucket = buckets[name];
			const keys = [uid(),uid(),uid(),uid()];
			keys.forEach(key => {
				dbi.take(name, key, count);
			});
			clock.tick(bucket.ttl + 1);
			dbi.take(name, keys[0], count);
			dbi.reset(name, keys[2]);
			dbi.take(name, keys[2], count);
			let newUid = uid();
			dbi.take(name, newUid, count);
			keys.push(newUid);
			clock.tick(2);

			return dbi.clean()
				.then(() => {
					dbi.reset(name, keys[0]).should.be.eql(true);
					dbi.reset(name, keys[1]).should.be.eql(false);
					dbi.reset(name, keys[2]).should.be.eql(true);
					dbi.reset(name, keys[3]).should.be.eql(false);
					dbi.reset(name, keys[4]).should.be.eql(true);
				});
		});

		it('should fail if bucket does not exist', () => {
			const name = 'nonExist';
			should(dbi.clean.bind(dbi, [name])).throw(`Could not find bucket ${name}`);
		});
	});

	describe('cleanSync', () => {
		const dbi = db({
			logger,
			buckets
		});

		const count = 1;

		let now, clock;

		beforeEach(() => {
			now = Date.now() - 1000;
			clock = lolex.install({now, toFake:['Date']});
		});

		afterEach(() => {
			clock.uninstall();
		});

		it('should remove all expired timers', () => {
			const name = 'medium';
			const bucket = buckets[name];
			const keys = [uid(),uid(),uid(),uid()];
			keys.forEach(key => {
				dbi.take(name, key, count);
			});
			clock.tick(bucket.ttl + 1);
			dbi.take(name, keys[0], count);
			dbi.reset(name, keys[2]);
			dbi.take(name, keys[2], count);
			let newUid = uid();
			dbi.take(name, newUid, count);
			keys.push(newUid);
			clock.tick(2);

			dbi.cleanSync();
			dbi.reset(name, keys[0]).should.be.eql(true);
			dbi.reset(name, keys[1]).should.be.eql(false);
			dbi.reset(name, keys[2]).should.be.eql(true);
			dbi.reset(name, keys[3]).should.be.eql(false);
			dbi.reset(name, keys[4]).should.be.eql(true);
		});

		it('should fail if bucket does not exist', () => {
			const name = 'nonExist';
			should(dbi.cleanSync.bind(dbi, [name])).throw(`Could not find bucket ${name}`);
		});
	});
});