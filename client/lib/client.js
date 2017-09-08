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
					return reject(new Error(data || `Status ${res.statusCode}`));
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
	constructor (conf) {
		this.settings = Object.assign({}, defaults, conf);
		this._getOptions = {
			method: 'GET',
			host: this.settings.host,
			port: this.settings.port
		};
	}

	/**
	 * Removes 1 token
	 * @param  {String} bucket
	 * @param  {String} key
	 * @return {Promise<Object>}
	 */
	take (bucket, key) {
		return promReq({
				method: 'GET',
				host: this.settings.host,
				port: this.settings.port,
				path: `/${bucket}/${key}`
			}).then(data => {
				return JSON.parse(data);
			});
	}

	/**
	 * Reset key record in bucket
	 * @param  {String} bucket
	 * @param  {String} key
	 * @return {Promise<Boolean>}
	 */
	reset (bucket, key) {
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