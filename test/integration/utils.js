'use strict';
const utils   = require('../utils');
const http = require('http');

function promHttpRequest (options) {
	return new Promise((resolve, reject) => {
		const req = http.request(options, res => {
			let data = '';
			res.setEncoding('utf8');
			res.on('data', chunk => {
				data += chunk;
			});
			res.on('end', () => {
				if (res.statusCode !== 200) {
					const err = new Error(`${data}(stauts ${res.statusCode})`);
					err.res = res;
					return reject(err);
				}
				res.data = data;
				return resolve(res);
			});
		});

		req.on('error', e => {
			reject(e);
		});

		req.end();
	});
}

function promDelay (ms) {
	return new Promise(resolve => {
		setTimeout(resolve, ms);
	});
}

module.exports = Object.assign(Object.create(null), {
	promHttpRequest,
	promDelay
}, utils);