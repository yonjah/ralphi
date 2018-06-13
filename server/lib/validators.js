/**
 * @file
 * @description joi validators
 */
'use strict';
const joi = require('joi');
const bucketName = joi.string().required().alphanum();
const bucketSize = joi.number().min(1).integer().required();
const key = joi.string().required();
const tokenCount = joi.number().min(-1).max(1).integer().default(1);
const bucket = joi.object().keys({
		ttl: joi.number().min(1).integer().required(),
		size: bucketSize
	});
const buckets = joi.object().min(1).pattern(/^[a-zA-Z0-9]+$/, bucket).required();
const db = joi.object().keys({
	take: joi.func().required(),
	reset: joi.func().required(),
	clean: joi.func().required()
}).unknown();
const bucketConf = joi.object().keys({
		ttl: [joi.number().min(1).integer().required(), joi.string().regex(/^\d+(ms|s|m|h)?$/)],
		size: bucketSize
	});
const dbConfig = joi.object().keys({
	buckets,
	logger: joi.object().keys({debug: joi.func().required(), info: joi.func().required()}).unknown().required()
});



module.exports = {
	tokenCount,
	bucketName,
	bucketSize,
	key,
	bucket,
	buckets,
	bucketConf,
	db,
	dbConfig
};