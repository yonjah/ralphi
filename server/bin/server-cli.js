#! /usr/bin/env node
/**
 * @file
 * @description Ralphi Cli for running ralphi api server
 */
'use strict';

const path          = require('path');
const fs            = require('fs');
const program       = require('commander');
const _             = require('lodash');
const joi           = require('joi');
const pino          = require('pino');
const validators    = require('../lib/validators.js');
const server        = require('../lib/server.js');
const Db            = require('../lib/db.js');
const serializers   = require('../lib/serializers.js');
const cleanInterval = require('../lib/clean-runner.js');
const buckets       = {};

let logger;

program
  .version('0.0.1')
  .usage('[options] [buckets...]')
  .description('Each bucket is a comma seperated defention in the form of name:String,size:Integer,ttl:Integer')
  .option('-c, --config <file>', 'Config file path (either .js or .json)')
  .option('-i, --clean-interval <n>', 'Clean interval in seconds')
  .option('-p, --port <n>', 'port', 8910)
  .option('-h, --host <ip>', 'host or ip to listen on', 'localhost')
  .option('-l, --log-level <level>', 'log level (debug,info,error,silent)', 'info')
  .parse(process.argv);

process.on('uncaughtException', showUsageOnError);

logger = pino({level: program.logLevel});

logger.serializers = serializers;

const config = {port: program.port, host: program.host, cleanInterval: program.cleanInterval, buckets: program.args};

function parseTTL (ttlString) {
	let ttl = parseInt(ttlString, 10);
	if (!ttl) {
		throw new Error ('ttl must be a positive integer');
	}
	const unit = ttlString.substring(ttl.toString().length) || 's';
	switch (unit) {
		case 'h':
			ttl *= 60;
			/*fallthrough*/
		case 'm':
			ttl *= 60;
			/*fallthrough*/
		case 's':
			ttl *= 1000;
			/*fallthrough*/
		case 'ms':
			return ttl;
		default:
			throw new Error(`Unknown ttl unit ${unit}`);
		}
}

config.buckets.forEach(bucket => {
	const [name, size, ttlString] = bucket.split(',').map(_.trim);

	let ttl;
	try {
		ttl = ttlString && parseTTL(ttlString);
	} catch (e) {
		throw new Error(`${e.message} for bucket ${bucket}`);
	}

	if (!name || !size || !ttl) {
		throw new Error(`Could not parse bucket ${bucket} name:${name} size:${size} ttl:${ttl}`);
	}

	if (buckets[name]) {
		throw new Error(`Bucket ${name} was already defined`);
	}

	buckets[name] = {size: joi.attempt(size, validators.bucketSize, 'bucket size'), ttl};
});

if (program.config) {
	let file = program.config;
	const ext = path.extname(file);
	if (['.js', '.json'].indexOf(ext.toLowerCase()) === -1) {
		throw new Error('Config file should be either .js or .json file');
	}
	if (file[0] !== '/') {
		file = path.join(process.cwd(), file);
	}

	if (!fs.existsSync(file)) {
		throw new Error(`Could not find file ${file}`);
	}

	logger.debug(`loading config ${file}`);
	const fileConf = require(file);
	_.map(fileConf.buckets, (bucket, name) => {
		try {
			buckets[name] = {ttl: parseTTL(bucket.ttl), size: bucket.size};
		} catch (e) {
			throw new Error(`${e.message} for bucket ${name}`);
		}
	});
	Object.assign(config, fileConf);
}

if (_.isEmpty(buckets)) {
	throw new Error('Bucket list is empty');
}

config.port = positiveInt(config.port, 'port');

const db = Db({buckets, logger});

if (config.cleanInterval !== undefined)  {
	config.cleanInterval = positiveInt(config.cleanInterval, 'clean interval');
	cleanInterval(db, logger, config.cleanInterval * 1000);
}

logger.debug({config, buckets});

server.create(Object.assign(config, {logger, buckets, db}));

process.removeListener('uncaughtException', showUsageOnError);

function positiveInt (val, name) {
	const int = parseInt(val, 10);
	if (int != val || int < 0) {
		throw new Error(`${name} must be a positive integer (${val})`);
	}
	return int;
}

function showUsageOnError (err) {
	process.stderr.write(err.stack + '\n');
	process.stderr.write(program.helpInformation());
	process.exit(1);
}