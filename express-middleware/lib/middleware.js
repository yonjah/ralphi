/**
 * @file
 * @description Ralphi middleware for express js
 */
'use strict';
const joi  = require('joi');

const optionsKeys = {
	client: joi.object().keys({
		give: joi.func().arity(2).required(),
		take: joi.func().arity(2).required(),
		reset: joi.func().arity(2).required()
	}).unknown().required(),
	bucket      : joi.string().alphanum().required(),
	countSuccess: joi.boolean().default(true),
	getKey      : joi.func().arity(1).default(getRequestIP),
	addHeaders  : joi.boolean().default(true),
	message     : joi.string().default('you have exceeded your request limit'),
	onError     : joi.func().arity(4),
	errorSize   : joi.number().integer().min(0).default(1),
	errorDelay  : joi.number().integer().min(1).default(60),
	errorLog    : joi.func().arity(1)
};

const optionsSchema = joi.object().keys(optionsKeys).required();

function getRequestIP (req) {
	return req.ip;
}

function RalphiMiddleware (options) {
	const settings = joi.attempt(options, optionsSchema, 'options');
	const client = settings.client;

	async function ralphiMiddleware (req, res, next) {
		let limit;

		try {
			const key = settings.getKey(req);

			limit = await client.take(settings.bucket, key);

			if (!settings.countSuccess) {
				limit.conformant && replaceEnd(res, key, limit);
			}

		} catch (e) {
			settings.errorLog && settings.errorLog(e);
			if (settings.onError) {
				return  settings.onError(e, req, res, next);
			}

			limit = {
				conformant: false,
				size: settings.errorSize,
				remaining: 0,
				ttl: Math.ceil(Date.now() / 1000) + settings.errorDelay
			};
		}

		if (settings.addHeaders) {
			res.set({
				'X-RateLimit-Limit'    : limit.size,
				'X-RateLimit-Remaining': limit.remaining,
				'X-RateLimit-Reset'    : limit.ttl
			});
		}

		if (limit.conformant) {
			return next();
		}
		res.status(429).send(settings.message);
	}

	Object.keys(optionsKeys).forEach(key => {
		ralphiMiddleware[key] = value => {
			return RalphiMiddleware(Object.assign({}, settings, {[key]: value}));
		};
	});


	function replaceEnd (res, key, limit) {
		const end = res.end;
		res.end = () =>  {
			if (res.statusCode < 400) {
				if (settings.addHeaders) {
					res.set('X-RateLimit-Remaining', limit.remaining + 1);
				}
				client.give(settings.bucket, key)
					.catch(e => {
						settings.errorLog && settings.errorLog(e);
					});
			}
			end.call(res);
		};

	}

	return ralphiMiddleware;
}

module.exports = RalphiMiddleware;