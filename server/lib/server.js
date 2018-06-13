/**
 * @file
 * @description Ralphi api server
 */
'use strict';
module.exports = {
	async create (config) {
		const hapi = require('hapi');
		const validators = require('./validators');
		const joi = require('joi');
		const {logger, buckets, port, host, db} = config;
		const server = new hapi.Server({port, host});

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
			handler (req) {
				const {bucket, key} = req.params;
				const res = db.take(bucket, key, 0);
				logger.info({req, bucket, key, res});
				return res;
			}
		});

		server.route({
			method: 'POST',
			path: '/{bucket}/{key}',
			config: {
				payload: {
					defaultContentType: 'application/x-www-form-urlencoded'
				},
				validate: {
					params: {
						bucket: validatorBucketName,
						key: validators.key
					},
					payload: {
						count: validators.tokenCount
					}
				}
			},
			handler (req) {
				const {bucket, key} = req.params;
				const res = db.take(bucket, key, req.payload.count);
				logger.info({req, bucket, key, res});
				return res;
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
			handler (req) {
				const {bucket, key} = req.params;
				const res = db.reset(bucket, key);
				logger.info({req, bucket, key, res});
				return res;
			}
		});

		server.route({
			method: 'DELETE',
			path: '/clean',
			async handler (req) {
				logger.info({req});
				await db.clean();
				return true;
			}
		});

		await server.start();
		logger.info(`Server running at: ${server.info.uri}`);
		return server;
	}
};