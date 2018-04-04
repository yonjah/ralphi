/**
 * @file
 * @description Ralphi api server
 */
'use strict';
module.exports = {
	create (config, cb) {
		const hapi = require('hapi');
		const validators = require('./validators');
		const joi = require('joi');
		const {logger, buckets, port, host, db} = config;
		const server = new hapi.Server();

		server.connection({port, host});
		joi.assert(db, validators.db, 'db');
		const validatorBucketName = joi.string().valid(Object.keys(buckets));

		server.route({
			method: 'GET',
			path: '/{bucket}/{key}',
			config: {
				validate: {
					params: {
						bucket: validatorBucketName,
						key: validators.key
					}
				}
			},
			handler (req, reply) {
				const {bucket, key} = req.params;
				const res = db.query(bucket, key);
				logger.info({req, bucket, key, res});
				reply(res);
			}
		});

		server.route({
			method: 'POST',
			path: '/{bucket}/{key}',
			config: {
				validate: {
					params: {
						bucket: validatorBucketName,
						key: validators.key
					}
				}
			},
			handler (req, reply) {
				const {bucket, key} = req.params;
				const res = db.take(bucket, key);
				logger.info({req, bucket, key, res});
				reply(res);
			}
		});

		server.route({
			method: 'DELETE',
			path: '/{bucket}/{key}',
			config: {
				validate: {
					params: {
						bucket: validatorBucketName,
						key: validators.key
					}
				}
			},
			handler (req, reply) {
				const {bucket, key} = req.params;
				const res = db.reset(bucket, key);
				logger.info({req, bucket, key, res});
				reply(res);
			}
		});

		server.route({
			method: 'DELETE',
			path: '/clean',
			handler (req, reply) {
				logger.info({req});
				db.clean()
					.then(() => reply(null, true));
			}
		});

		server.start(err => {
			/* istanbul ignore if*/
			if (err) {
				throw err;
			}
			logger.info(`Server running at: ${server.info.uri}`);
			cb && cb(server);
		});
	}
};