'use strict';
const utils = require('../utils');
const nock = require('nock');
const {base, path} = utils;

function requireSrc (file) {
	return require(getSrcPath(file));
}

function getSrcPath (file) {
	return path.join(base, 'client', 'lib', file);
}

module.exports = Object.assign(Object.create(null), {
	nock,
	requireSrc,
	getSrcPath
}, utils);