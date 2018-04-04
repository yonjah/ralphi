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
				const res = db.query(bucket, key);
				logger.info({req, bucket, key, res});
				return res;
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
			handler (req) {
				const {bucket, key} = req.params;
				const res = db.take(bucket, key);
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