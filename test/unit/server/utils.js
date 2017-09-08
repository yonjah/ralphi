'use strict';
const utils = require('../utils');
const {base, path} = utils;

function requireSrc (file) {
	return require(getSrcPath(file));
}

function getSrcPath (file) {
	return path.join(base, 'server', 'lib', file);
}

function getBinPath (file) {
	return path.join(base, 'server', 'bin', file);
}

module.exports = Object.assign(Object.create(null), {
	requireSrc,
	getSrcPath,
	getBinPath
}, utils);