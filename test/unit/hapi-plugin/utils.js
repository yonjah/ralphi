'use strict';
const utils        = require('../utils');
const nock         = require('nock');
const hapi         = require('hapi');
const {base, path} = utils;
const plugin       = requireSrc('plugin');

function requireSrc (file) {
	return require(getSrcPath(file));
}

function getSrcPath (file) {
	return path.join(base, 'hapi-plugin', 'lib', file);
}



function createServer (options, routes) {
	const server = new hapi.Server();
	if (server.connection) {
		server.connection();
		server.register({register: plugin, options});
		routes.forEach(route => {
			server.route(route);
		});
	} else {
		let ready = false;
		const start = server.start;
		const stop = server.stop;
		const inject = server.inject;
		routes.forEach(route => {
			const handler = route.handler;
			route.handler = request => {
				let res, err;
				function reply (e, r) {
					err = e;
					res = r;
				}
				handler(request, reply);
				if (err) {
					throw err;
				}
				return res;
			};
			server.route(route);
		});
		server.register({plugin, options})
			.then(() => {
				ready = true;
			});

		server.start = cb => {
			if (!ready) {
				return setImmediate(server.start, cb);
			}
			return start.apply(server).then(res => cb(res));
		};

		server.stop = cb => {
			return stop.apply(server).then(res => cb(res));
		};

		server.inject = (data, cb) => {
			return inject.call(server, data)
				.then(res => cb(res));
		};

	}
	return server;
}

module.exports = Object.assign(Object.create(null), {
	nock,
	requireSrc,
	getSrcPath,
	createServer
}, utils);