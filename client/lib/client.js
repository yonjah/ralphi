/**
 * @file
 * @description Ralphi Client for querying Ralphi server
 */
'use strict';
const http = require('http');

const defaults = {
	host: 'localhost',
	port: 8910
};

function promReq (options) {
	return new Promise((resolve, reject) => {
		const req = http.request(options, res => {
			let data = '';
			res.setEncoding('utf8');
			res.on('data', chunk => {
				data += chunk;
			});
			res.on('end', () => {
				if (res.statusCode !== 200) {
					return reject(new Error(`${data}(stauts ${res.statusCode})`));
				}
				return resolve(data);
			});
		});

		req.on('error', e => {
			reject(e);
		});

		req.end();
	});
}

class RalphiClient {
	constructor (config = {}) {
		if (config.host !== undefined && (!config.host || typeof config.host !== 'string')) {
			throw new Error('Config host must be a string with value');
		}
		if (config.port !== undefined && (config.port < 1 || parseInt(config.port, 10) !== config.port)) {
			throw new Error('Config port must be positive numeric integer');
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
		if (!bucket || typeof bucket !== 'string') {
			throw new Error('Bucket must exist and be a string');
		}
		if (!key || typeof key !== 'string') {
			throw new Error('Key must exist and be a string');
		}
		return promReq({
				method: 'GET',
				host: this.settings.host,
				port: this.settings.port,
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
		if (!bucket || typeof bucket !== 'string') {
			throw new Error('Bucket must exist and be a string');
		}
		if (!key || typeof key !== 'string') {
			throw new Error('Key must exist and be a string');
		}
		return promReq({
				method: 'DELETE',
				host: this.settings.host,
				port: this.settings.port,
				path: `/${bucket}/${key}`
			}).then(data => {
				return data === 'true';
			});
	}
}

module.exports = RalphiClient;