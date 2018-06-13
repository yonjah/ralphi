/**
 * @file
 * @description Ralphi database
 */
'use strict';
const _          = require('lodash');
const joi        = require('joi');
const validators = require('./validators');


function promiseIterator (iterator, func, resolve, reject) {
	const {done, value} = iterator.next();
	if (done) {
		return resolve();
	} else {
		func(value[1], value[0]);
		setImmediate(promiseIterator, iterator, func, resolve, reject);
	}
}

function raplhDB (conf = {}) {
	const buckets = new Map();
	const config = joi.attempt(conf, validators.dbConfig, 'config');
	const {logger} = config;
	_.forEach(config.buckets, (bucket, name) => {
		buckets.set(name, Object.assign({storage: new Map()}, bucket));
	});

	return {
		cleanSync (bucketNames)  {
			if (!bucketNames) {
				bucketNames = Array.from(buckets.keys());
			}

			const now = Date.now();
			return bucketNames.map(bucketName => {
					logger.debug({msg: 'cleaning bucket', bucket: bucketName});

					const bucket = buckets.get(bucketName);
					if (!bucket) {
						throw new Error(`Could not find bucket ${bucketName}`);
					}

					bucket.storage.forEach((item, key) => {
						if (now > item.ttl) {
							logger.debug({msg: 'cleaning key', bucket: bucketName, key});
							bucket.storage.delete(key);
						}
					});
					return bucket.storage.size;
				});
		},

		clean (bucketNames)  {
			if (!bucketNames) {
				bucketNames = Array.from(buckets.keys());
			}

			const now = Date.now();
			return Promise.all(bucketNames.map(bucketName => {
					logger.debug({msg: 'cleaning bucket', bucket: bucketName});

					const bucket = buckets.get(bucketName);
					if (!bucket) {
						throw new Error(`Could not find bucket ${bucketName}`);
					}
					const bucketIter = bucket.storage.entries();
					const func = (item, key) => {
						if (now > item.ttl) {
							logger.debug({msg: 'cleaning key', bucket: bucketName, key});
							bucket.storage.delete(key);
						}
					};

					return new Promise((resolve, reject) => {
						promiseIterator(bucketIter, func, resolve, reject);
					}).then(() => bucket.storage.size);
				}));
		},

		take (bucketName, key, count) {
			count = count === undefined ? 1 : count;
			logger.debug({msg: 'take', bucket: bucketName, key, count});
			const bucket = buckets.get(bucketName);
			if (!bucket) {
				throw new Error(`Could not find bucket ${bucketName}`);
			}
			let record = bucket.storage.get(key),
				conformant = true;
			if (!record || record.ttl < Date.now()) {
				logger.debug({msg: 'new record', record});
				record = {
					ttl: Date.now() + bucket.ttl,
					remaining: bucket.size
				};
				bucket.storage.set(key, record);
			}

			record.remaining -= count;

			if (count <= 0) {
				if (record.remaining <= 0) { //we gave or query so at 0 request is not conformant
					conformant = false;
				} else if (record.remaining > bucket.size) { //make sure we don't go past bucket size
					record.remaining = bucket.size;
				}
			} else if (record.remaining < 0) { //we just took tokens so at 0 request is still conformant
				conformant = false;
			}

			logger.debug({msg: conformant ? 'conformant record' : 'limited record', record});
			return {conformant, size: bucket.size, remaining: conformant ? record.remaining : 0, ttl: record.ttl};
		},

		reset (bucketName, key) {
			logger.debug({msg: 'delete', bucket: bucketName, key});
			const bucket = buckets.get(bucketName);
			if (!bucket) {
				throw new Error(`Could not find bucket ${bucketName}`);
			}
			return bucket.storage.delete(key);
		}
	};
}


module.exports = raplhDB;
