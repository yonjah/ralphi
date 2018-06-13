/**
 * @file
 * @description Ralphi plugin for hapi js
 */
'use strict';
const joi  = require('joi');
const boom = require('boom');

const optionsSchema = joi.object().keys({
	client: joi.object().keys({
		give: joi.func().arity(2).required(),
		take: joi.func().arity(2).required(),
		reset: joi.func().arity(2).required()
	}).unknown().required(),
	ext: joi.string().valid(['onPreAuth', 'onPostAuth', 'onPreHandler']).default('onPreHandler'),
	allRoutes: joi.boolean().default(false),
	bucket: joi.string().alphanum(),
	countSuccess: joi.boolean().default(true),
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

function register (server, options, next) { // eslint-disable-line no-unused-vars

	options = joi.attempt(options, optionsSchema, 'options');
	const client = options.client;


	server.ext(options.ext, async (request, h) => {
		let limit;
		const settings = getSettings(request.route.settings.plugins.ralphi);

		if (!settings) {
			return h.continue;
		}

		try {
			limit = await client.take(settings.bucket, settings.getKey(request));
		} catch (e) {
			request.log(['error'], e);
			if (settings.onError) {
				return settings.onError(request, h, e);
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
			throw error;
		}

		request.plugins.ralphi = limit;
		request.plugins.ralphi.addHeaders = settings.addHeaders;
		if (limit.conformant) {
			return h.continue;
		}

		const error = boom.tooManyRequests(settings.message);
		if (settings.addHeaders) {
			decorateError(error, limit);
		}
		throw error;
	});

	server.ext('onPreResponse', async (request, h) => {
		const response = request.response;
		const settings = getSettings(request.route.settings.plugins.ralphi);
		let limit    = request.plugins.ralphi;

		if (!settings || (response.isBoom && response.typeof === boom.tooManyRequests)) {
			return h.continue;
		}

		if (!settings.countSuccess && response.statusCode < 400) { //take one token if we only count failed request and request did not fail do to rate limiting
			try {
				limit = await client.give(settings.bucket, settings.getKey(request));
			} catch (e) {
				request.log(['error'], e);
			}
		}

		if (!settings.addHeaders || !limit) {
			return h.continue;
		}

		if (response.isBoom) {
			decorateError(response, limit);
		} else {
			response.header('X-RateLimit-Limit', limit.size);
			response.header('X-RateLimit-Remaining', limit.remaining);
			response.header('X-RateLimit-Reset', limit.ttl);
		}

		return h.continue;
	});

	function decorateError (error, limit) {
		error.output.headers['X-RateLimit-Limit'] = limit.size;
		error.output.headers['X-RateLimit-Remaining'] = limit.remaining;
		error.output.headers['X-RateLimit-Reset'] = limit.ttl;
	}

	function getSettings (routeSettings) {
		if (routeSettings === false || (!routeSettings && !options.allRoutes)) {
			return false;
		}

		if (routeSettings) {
			return Object.assign({}, options, routeSettings);
		}

		return options;
	}
}

module.exports = {register, pkg: require('../package.json')};