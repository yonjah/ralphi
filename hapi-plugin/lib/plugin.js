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
	}).unknown().required(),
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
		const settings = getSettings(request.route.settings.plugins.ralphi);
		if (!settings) {
			return reply.continue();
		}

		client.take(settings.bucket, settings.getKey(request))
			.then(limit => {
				request.plugins.ralphi = limit;
				request.plugins.ralphi.addHeaders = settings.addHeaders;
				if (limit.conformant) {
					return reply.continue();
				}

				const error = boom.tooManyRequests(settings.message);
				return reply(error);
			}).catch(e => {
				request.log(['error'], e);
				if (settings.onError) {
					return settings.onError(request, reply, e);
				}

				request.plugins.ralphi = {
					conformant: false,
					size: settings.errorSize,
					remaining: 0,
					ttl: Math.ceil(Date.now() / 1000) + settings.errorDelay,
					error: e
				};
				const error = boom.boomify(e, {statusCode: 429});
				error.output.payload.message = settings.message;
				return reply(error);
			});

	});

	server.ext('onPreResponse', (request, reply) => {
		const response = request.response;
		const limit    = request.plugins.ralphi;
		const settings = getSettings(request.route.settings.plugins.ralphi);
		if (!settings || !settings.addHeaders || !limit) {
			return reply.continue();
		}

		if (response.isBoom) {
			response.output.headers['X-RateLimit-Limit'] = limit.size;
			response.output.headers['X-RateLimit-Remaining'] = limit.remaining;
			response.output.headers['X-RateLimit-Reset'] = limit.ttl;
			return reply.continue();
		}

		response.header('X-RateLimit-Limit', limit.size);
		response.header('X-RateLimit-Remaining', limit.remaining);
		response.header('X-RateLimit-Reset', limit.ttl);
		return reply.continue();
	});

	function getSettings (routeSettings) {
		if (routeSettings === false || (!routeSettings && !options.allRoutes)) {
			return false;
		}

		if (routeSettings) {
			return Object.assign({}, options, routeSettings);
		}

		return options;
	}

	return next();
};

register.attributes = {
	pkg: require('../package.json')
};

module.exports = {register};