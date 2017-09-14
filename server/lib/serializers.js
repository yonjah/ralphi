/**
 * @file
 * @description Object serializers to be used with pino
 */
'use strict';
const pino = require('pino');

module.exports = {
	req (req) {
		const obj = pino.stdSerializers.req(req.raw.req);
		obj.id = req.id;
		return obj;
	}
};