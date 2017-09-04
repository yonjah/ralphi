'use strict';
const path = require('path');
const should = require('should');
const lolex = require('lolex');
const sinon = require('sinon');
const _ = require('lodash');
const base = path.join(__dirname, '../');

require('should-sinon');

function uid (min = 1, range = 10000) {
	return Math.ceil(Math.random() * range) + min;
}

function requireSrc (file) {
	return require(getSrcPath(file));
}

function getSrcPath (file) {
	return path.join(base, 'lib', file);
}

function getBinPath (file) {
	return path.join(base, 'bin', file);
}

module.exports = {
	should,
	path,
	_,
	lolex,
	sinon,
	base,
	uid,
	requireSrc,
	getBinPath,
	getSrcPath
};