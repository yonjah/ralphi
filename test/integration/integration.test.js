/**
 * @file
 * @description Ralphi integration test
 */
'use strict';
const {spawn} = require('child_process');
const hapi    = require('hapi');
const express = require('express');
const utils   = require('./utils');
const {path, base, promHttpRequest, promDelay} = utils;
const binPath = path.join(base, 'server', 'bin', 'server-cli.js');
const Client = require(path.join(base, 'client'));
const plugin = require(path.join(base, 'hapi-plugin'));
const Middleware = require(path.join(base, 'express-middleware'));

describe('integration', () => {
	const slowTtl = 1000;
	const fastTtl = 1;
	const client  = new Client();

	let ralphiCli,
		ralphiLog = '';
	before(cb => {
		let called = false;
		ralphiCli = spawn(binPath, [`hSlow,1,${slowTtl}ms`, `hFast,1,${fastTtl}ms`,`eSlow,1,${slowTtl}ms`, `eFast,1,${fastTtl}ms`]);

		ralphiCli.stderr.on('data', data => {
			throw new Error(data.toString());
		});

		ralphiCli.stdout.on('data', data => {
			data = data.toString();
			ralphiLog += data;
			if (!called) {
				called = true;
				return cb();
			}
		});

		ralphiCli.on('close', code => {
			if (code) {
				throw new Error(`cli exit with code ${code}`);
			}
		});
	});

	after(() => {
		ralphiCli.kill();
	});

	describe('hapi rate limiting', () => {
		const port = 3000;

		let apiServer;
		before(() => {
			apiServer = new hapi.Server({port});
			apiServer.route({
				method: 'GET',
				path: '/slow',
				config: {
					plugins: {
						ralphi: {bucket: 'hSlow'}
					}
				},
				handler () {
					return 'Success';
				}
			});
			apiServer.route({
				method: 'GET',
				path: '/fast',
				config: {
					plugins: {
						ralphi: {bucket: 'hFast'}
					}
				},
				handler () {
					return 'Success';
				}
			});

			return apiServer.register({plugin, options: {client}})
				.then(() => apiServer.start());
		});

		after(() => {
			return apiServer.stop();
		});

		it('should rate limit route', () => {
			return promHttpRequest({
					path: '/slow',
					port
				}).then(res => {
					res.data.should.be.eql('Success');
					res.headers.should.have.property('x-ratelimit-limit', '1');
					res.headers.should.have.property('x-ratelimit-remaining', '0');
					res.headers.should.have.property('x-ratelimit-reset');

					return promHttpRequest({
							path: '/slow',
							port
						}).should.be.rejectedWith('{"statusCode":429,"error":"Too Many Requests","message":"you have exceeded your request limit"}(stauts 429)');
				});
		});

		it('should reset limit after ttl expires', () => {
			return promHttpRequest({
					path: '/fast',
					port
				}).then(res => {
					res.data.should.be.eql('Success');
					res.headers.should.have.property('x-ratelimit-limit', '1');
					res.headers.should.have.property('x-ratelimit-remaining', '0');
					res.headers.should.have.property('x-ratelimit-reset');

					return promDelay(2)
						.then(() => {
							return promHttpRequest({
								path: '/fast',
								port
							});
						}).then(res => {
							res.data.should.be.eql('Success');
							res.headers.should.have.property('x-ratelimit-limit', '1');
							res.headers.should.have.property('x-ratelimit-remaining', '0');
							res.headers.should.have.property('x-ratelimit-reset');
						});
				});
		});

		it('should correctly log request', () => {
			ralphiLog = '';
			return promHttpRequest({
					path: '/fast',
					port
				}).then(res => {
					res.data.should.be.eql('Success');
					res.headers.should.have.property('x-ratelimit-limit', '1');
					res.headers.should.have.property('x-ratelimit-remaining', '0');
					res.headers.should.have.property('x-ratelimit-reset');

					return promDelay(400);
				}).then(() => {
					const logs = ralphiLog.split('\n');
					const logEntry = JSON.parse(logs[0]);
					logEntry.should.have.properties('level', 'time', 'pid', 'hostname', 'req', 'bucket', 'key', 'res', 'v');
					logEntry.req.should.have.properties('method', 'url', 'headers', 'remoteAddress', 'remotePort');
					logEntry.should.have.property('bucket', 'hFast');
					logEntry.should.have.property('key', '127.0.0.1');
					logEntry.res.should.have.properties('conformant', 'size', 'remaining', 'ttl');
					logEntry.res.should.have.property('conformant', true);
					logEntry.res.should.have.property('size', 1);
					logEntry.res.should.have.property('remaining', 0);
				});
		});
	});

	describe('express rate limiting', () => {
		const port = 3001;

		let app, expressServer;
		before(cb => {
			app = express();

			app.use('/slow', Middleware({bucket: 'eSlow', client}));
			app.get('/slow', (req, res) => res.send('Success'));

			app.use('/fast', Middleware({bucket: 'eFast', client}));
			app.get('/fast', (req, res) => res.send('Success'));

			expressServer = app.listen(port, cb);
		});

		after(cb => {
			expressServer.close(cb);
		});

		it('should rate limit route', () => {
			return promHttpRequest({
					path: '/slow',
					port
				}).then(res => {
					res.data.should.be.eql('Success');
					res.headers.should.have.property('x-ratelimit-limit', '1');
					res.headers.should.have.property('x-ratelimit-remaining', '0');
					res.headers.should.have.property('x-ratelimit-reset');

					return promHttpRequest({
							path: '/slow',
							port
						}).should.be.rejectedWith('you have exceeded your request limit(stauts 429)');
				});
		});

		it('should reset limit after ttl expires', () => {
			return promHttpRequest({
					path: '/fast',
					port
				}).then(res => {
					res.data.should.be.eql('Success');
					res.headers.should.have.property('x-ratelimit-limit', '1');
					res.headers.should.have.property('x-ratelimit-remaining', '0');
					res.headers.should.have.property('x-ratelimit-reset');

					return promDelay(2)
						.then(() => {
							return promHttpRequest({
								path: '/fast',
								port
							});
						}).then(res => {
							res.data.should.be.eql('Success');
							res.headers.should.have.property('x-ratelimit-limit', '1');
							res.headers.should.have.property('x-ratelimit-remaining', '0');
							res.headers.should.have.property('x-ratelimit-reset');
						});
				});
		});
	});

});