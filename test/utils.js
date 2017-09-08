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

function getAssetPath (file) {
	return path.join(base, 'test', 'assets', file);
}

module.exports = {
	should,
	path,
	_,
	lolex,
	sinon,
	base,
	uid,
	getAssetPath
};