/**
 * @file
 * @description promise wrapper around http request
 */
'use strict';
const http = require('http');

function promHttpRequest (options, postData) {
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

		req.setTimeout(options.timeout, () => {
			req.abort();
		});

		postData && req.write(postData);

		req.end();
	});
}


module.exports = promHttpRequest;