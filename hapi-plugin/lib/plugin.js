/**
 * @file
 * @description Ralphi plugin for hapi js
 */
'use strict';
const joi  = require('joi');
const boom = require('boom');

const optionsSchema = joi.object().keys({
	client: joi.object().keys({
		take: joi.func().arity(2).required(),
		reset: joi.func().arity(2).required()
	}).required(),
	ext: joi.string().valid(['onPreAuth', 'onPostAuth', 'onPreHandler']).default('onPreHandler'),
	allRoutes: joi.boolean().default(false),
	bucket: joi.string().alphanum(),
	addHeaders: joi.boolean().default(true),
	message: joi.string().default('you have exceeded your request limit'),
	onError: joi.func().arity(3),
	getKey: joi.func().arity(1).default(getRequestIP),
	errorSize: joi.number().integer().min(0).default(1),
	errorDelay: joi.number().integer().min(1).default(60)
}).required();

function getRequestIP (request) {
	return request.info.remoteAddress;
}

const register = function (server, options, next) {
	options = joi.attempt(options, optionsSchema, 'options');
	const client = options.client;

	server.ext(options.ext, (request, reply) => {
		let settings;
		if (request.route.settings.plugins.ralphi === false || (!request.route.settings.plugins.ralphi && !options.allRoutes)) {
			return reply.continue();
		}

		if (request.route.settings.plugins.ralphi) {
			settings = Object.assign({}, options, request.route.settings.plugins.ralphi);
		} else {
			settings = options;
		}
		client.take(settings.bucket, settings.getKey(request))
			.then(limit => {
				request.plugins.ralphi = limit;
				request.plugins.ralphi.addHeaders = settings.addHeaders;
				if (limit.conformant) {
					reply.continue();
				} else {
					const error = boom.tooManyRequests(settings.message);
					if (settings.addHeaders) {
						error.output.headers['X-RateLimit-Limit'] = limit.size;
						error.output.headers['X-RateLimit-Remaining'] = limit.remaining;
						error.output.headers['X-RateLimit-Reset'] = limit.ttl;
					}
					reply(error);
				}
			}).catch(e => {
				request.plugins.ralphi = e;
				if (settings.onError) {
					return settings.onError(request, reply, e);
				} else {
					const error = boom.boomify(e, {statusCode: 429});
					error.output.payload.message = settings.message;
					if (settings.addHeaders) {
						error.output.headers['X-RateLimit-Limit'] = settings.errorSize;
						error.output.headers['X-RateLimit-Remaining'] = 0;
						error.output.headers['X-RateLimit-Reset'] = Math.ceil(Date.now() / 1000) + settings.errorDelay;
					}
					reply(error);
				}
			});

	});

	server.ext('onPreResponse', (request, reply) => {
		const response = request.response;
		const limit = request.plugins.ralphi;
		if (response.isBoom || !limit || !limit.addHeaders) {
			return reply.continue();
		}

		response.header('X-RateLimit-Limit', limit.size);
		response.header('X-RateLimit-Remaining', limit.remaining);
		response.header('X-RateLimit-Reset', limit.ttl);
		reply.continue();
	});

	return next();
};

register.attributes = {
	pkg: require('../package.json')
};

module.exports = {register};