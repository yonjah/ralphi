/**
 * @file
 * @description Ralphi Client for querying Ralphi server
 */
'use strict';
const promHttpRequest = require('./promHttpRequest');
const defaults = {
	host: 'localhost',
	port: 8910,
	timeout: 5000
};

class RalphiClient {
	constructor (config = {}) {
		if (config.host !== undefined && (!config.host || typeof config.host !== 'string')) {
			throw new Error('Config host must be a string with value');
		}
		if (config.port !== undefined && (config.port < 1 || parseInt(config.port, 10) !== config.port)) {
			throw new Error('Config port must be positive numeric integer');
		}
		if (config.timeout !== undefined && (config.timeout < 1 || parseInt(config.timeout, 10) !== config.timeout)) {
			throw new Error('Config timeout must be positive numeric integer');
		}
		this.settings = Object.assign({}, defaults, config);
	}

	/**
	 * Removes 1 token
	 * @param  {String} bucket
	 * @param  {String} key
	 * @return {Promise<Object>}
	 */
	take (bucket, key) {
		_validateApiCall(bucket, key);
		return promHttpRequest({
				method: 'POST',
				host: this.settings.host,
				port: this.settings.port,
				timeout: this.settings.timeout,
				path: `/${bucket}/${key}`
			}).then(data => {
				data = JSON.parse(data);
				data.ttl = Math.ceil(data.ttl / 1000);
				return data;
			});
	}

	/**
	 * Adds    1 token
	 * @param  {String} bucket
	 * @param  {String} key
	 * @return {Promise<Object>}
	 */
	give (bucket, key) {
		_validateApiCall(bucket, key);
		return promHttpRequest({
				method: 'POST',
				host: this.settings.host,
				port: this.settings.port,
				timeout: this.settings.timeout,
				path: `/${bucket}/${key}`
			}, 'count=-1')
			.then(data => {
				data = JSON.parse(data);
				data.ttl = Math.ceil(data.ttl / 1000);
				return data;
			});
	}

	/**
	 * Query key record without removing any tokens
	 * @param  {String} bucket
	 * @param  {String} key
	 * @return {Promise<Object>}
	 */
	query (bucket, key) {
		_validateApiCall(bucket, key);
		return promHttpRequest({
				method: 'GET',
				host: this.settings.host,
				port: this.settings.port,
				timeout: this.settings.timeout,
				path: `/${bucket}/${key}`
			}).then(data => {
				data = JSON.parse(data);
				data.ttl = Math.ceil(data.ttl / 1000);
				return data;
			});
	}

	/**
	 * Reset key record in bucket
	 * @param  {String} bucket
	 * @param  {String} key
	 * @return {Promise<Boolean>}
	 */
	reset (bucket, key) {
		_validateApiCall(bucket, key);
		return promHttpRequest({
				method: 'DELETE',
				host: this.settings.host,
				port: this.settings.port,
				timeout: this.settings.timeout,
				path: `/${bucket}/${key}`
			}).then(data => {
				return data === 'true';
			});
	}

	/**
	 * Clean all expired records
	 * @return {Promise<Boolean>}
	 */
	clean () {
		return promHttpRequest({
				method: 'DELETE',
				host: this.settings.host,
				port: this.settings.port,
				timeout: this.settings.timeout,
				path: '/clean'
			}).then(data => {
				return data === 'true';
			});
	}
}

function _validateApiCall (bucket, key) {
	if (!bucket || typeof bucket !== 'string') {
		throw new Error('Bucket must exist and be a string');
	}
	if (!key || typeof key !== 'string') {
		throw new Error('Key must exist and be a string');
	}
}

module.exports = RalphiClient;