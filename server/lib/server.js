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
				logger.info({req, bucket, key});
				const res = db.take(bucket, key);
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
				logger.info({req, bucket, key});
				reply(db.reset(bucket, key));
			}
		});

		server.start(err => {
			if (err) {
				throw err;
			}
			logger.info(`Server running at: ${server.info.uri}`);
			cb && cb(server);
		});
	}
};