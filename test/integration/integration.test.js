/**
 * @file
 * @description Ralphi integration test
 */
'use strict';
const {spawn} = require('child_process');
const hapi    = require('hapi');
const utils   = require('./utils');
const {path, base, promHttpRequest, promDelay} = utils;
const binPath = path.join(base, 'server', 'bin', 'server-cli.js');
const Client = require(path.join(base, 'client'));
const plugin = require(path.join(base, 'hapi-plugin'));


describe('integration', () => {
	const port    = 3000;
	const slowTtl = 1000;
	const fastTtl = 1;

	let ralphiCli, apiServer, client;
	before(cb => {
		let ready = 0;

		ralphiCli = spawn(binPath, [`slow,1,${slowTtl}ms`, `fast,1,${fastTtl}ms`]);
		ralphiCli.stderr.on('data', data => {
			throw new Error(data.toString());
		});
		ralphiCli.stdout.on('data', () => {
			done();
		});
		ralphiCli.on('close', code => {
			if (code !== 0) {
				throw new Error(`cli exit with code ${code}`);
			}
		});

		apiServer = new hapi.Server();
		apiServer.connection({port});

		client = new Client();

		apiServer.register({register: plugin, options: {client}});
		apiServer.route({
			method: 'GET',
			path: '/slow',
			config: {
				plugins: {
					ralphi: {bucket: 'slow'}
				}
			},
			handler (request, reply) {
				reply(null, 'Success');
			}
		});
		apiServer.route({
			method: 'GET',
			path: '/fast',
			config: {
				plugins: {
					ralphi: {bucket: 'fast'}
				}
			},
			handler (request, reply) {
				reply(null, 'Success');
			}
		});
		apiServer.start(done);

		function done () {
			ready += 1;
			if (ready == 2) {
				return cb();
			}
		}
	});

	after(() => {
		ralphiCli.kill();
		apiServer.stop();
	});

	describe('rate limiting', () => {
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
						}).should.be.rejected('Too many attempts');
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
