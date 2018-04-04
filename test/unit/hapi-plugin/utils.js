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

async function createServer (options, routes) {
	const server = new hapi.Server();
	routes.forEach(route => {
		server.route(route);
	});
	await server.register({plugin, options});
	return server;
}

module.exports = Object.assign(Object.create(null), {
	nock,
	requireSrc,
	getSrcPath,
	createServer
}, utils);