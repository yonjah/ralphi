/**
 * @file
 * @description Ralphi cli test
 */
'use strict';
const utils = require('./utils');
const {spawnSync} = require('child_process');
const {_, path, getBinPath, getAssetPath} = utils;
const cli = getBinPath('server-cli.js');
const cwd = getAssetPath('');
let timeout;

function runCli (args = []) {
	if (!timeout) { //first cli run sometimes seem to take longer
		timeout = 1000;
	} else {
		timeout = 400;
	}

	return spawnSync(
			cli,
			args,
			{
				encoding: 'utf-8',
				cwd,
				timeout
			}
		);
}


describe('cli', function () {
	this.slow(550);

	describe('--help', function () {
		this.slow(250);
		it('should output usage to stderr if usage is not valid', () => {
			const result = runCli();
			result.stderr.should.be.ok();
			result.stderr.should.match(/Usage:/);
		});

		it('should output usage with --help', () => {
			const result = runCli(['--help']);
			result.stderr.should.not.be.ok();
			result.stdout.should.be.ok();
			result.stdout.should.match(/Usage:/);
		});
	});

	describe('--config' , () => {
		it('should load config from config file relative to cmd', () => {
			const confFile = './conf.json';
			const conf   = require(path.join(cwd, confFile));
			const result = runCli(['--config', confFile, '-l', 'debug']);
			result.stdout.should.be.ok();
			result.stderr.should.not.be.ok();
			const confLog = JSON.parse(result.stdout.split('\n')[1]);
			confLog.config.should.be.eql(conf);
		});

		it('should load config from config file absolute path', () => {
			const confFile = getAssetPath('conf.json');
			const conf   = require(confFile);
			const result = runCli(['--config', confFile, '-l', 'debug']);
			result.stdout.should.be.ok();
			result.stderr.should.not.be.ok();
			const confLog = JSON.parse(result.stdout.split('\n')[1]);
			confLog.config.should.be.eql(conf);
		});

		it('should fail if config does not exist', () => {
			const confFile = getAssetPath('no-file.json');
			const result = runCli(['--config', confFile, '-l', 'error']);
			result.stdout.should.not.be.ok();
			result.stderr.should.be.ok();
			result.stderr.should.match(new RegExp(`Could not find file ${confFile}`));
		});

		it('should fail if config file is not json or js file', () => {
			const confFile = getAssetPath('bad-format.yml');
			const result = runCli(['--config', confFile, '-l', 'error']);
			result.stdout.should.not.be.ok();
			result.stderr.should.be.ok();
			result.stderr.should.match(/Config file should be either \.js or \.json file/);
		});

		it('should fail if config is invalid', () => {
			const confFile = getAssetPath('conf-invalid.json');
			const result = runCli(['--config', confFile, '-l', 'error']);
			result.stdout.should.not.be.ok();
			result.stderr.should.be.ok();
			result.stderr.should.match(/Unknown ttl unit Y for bucket test/);
		});

		it('should fail if config is missing buckets', () => {
			const confFile = getAssetPath('conf-missing-buckets.json');
			const result = runCli(['--config', confFile, '-l', 'error']);
			result.stdout.should.not.be.ok();
			result.stderr.should.be.ok();
			result.stderr.should.match(/Bucket list is empty/);
		});

		it('should set default options if  not available in the config file', () => {
			const bucket   = ['b1', 1, 2];
			const confFile = getAssetPath('conf-missing-buckets.json');
			const result   = runCli(['--config', confFile, '-l', 'debug', bucket.join(',')]);
			result.stdout.should.be.ok();
			result.stderr.should.not.be.ok();
			const confLog = JSON.parse(result.stdout.split('\n')[1]);
			confLog.should.have.property('config');
			confLog.should.have.property('buckets', {
				[bucket[0]]: {size: bucket[1], ttl: bucket[2] * 1000}
			});
			confLog.config.should.have.property('port', 8910);
		});

		it('should set options from command line if available and not in config file', () => {
			const bucket   = ['b1', 1, 2];
			const port     = 8080;
			const confFile = getAssetPath('conf-missing-buckets.json');
			const conf     = require(confFile);
			const result   = runCli(['--config', confFile, '-l', 'debug', '--port', port, '--host', 'fake', bucket.join(',')]);
			result.stdout.should.be.ok();
			result.stderr.should.not.be.ok();
			const confLog = JSON.parse(result.stdout.split('\n')[1]);
			confLog.should.have.property('config');
			confLog.should.have.property('buckets', {
				[bucket[0]]: {size: bucket[1], ttl: bucket[2] * 1000}
			});
			confLog.config.should.have.property('host', conf.host);
			confLog.config.should.have.property('port', port);
		});

		it('should merge buckets from config file and commnad line', () => {
			const bucket   = ['b1', 1, 2];
			const port     = 8080;
			const confFile = getAssetPath('conf.json');
			const conf     = require(confFile);
			const result   = runCli(['--config', confFile, '-l', 'debug', '--port', port, '--host', 'fake', bucket.join(',')]);
			result.stdout.should.be.ok();
			result.stderr.should.not.be.ok();
			const confLog = JSON.parse(result.stdout.split('\n')[1]);
			const buckets = Object.keys(conf.buckets).reduce((obj, name) => {
				obj[name] = {size: conf.buckets[name].size, ttl: parseInt(conf.buckets[name].ttl, 10) * 1000};
				return obj;
			}, {[bucket[0]]: {size: bucket[1], ttl: bucket[2] * 1000}});

			confLog.should.have.property('buckets', buckets);
		});
	});

	describe('--clear-interval' , () => {
		it('should not be set by default', () => {
			const result   = runCli(['-l', 'debug', 'b,1,1']);
			result.stdout.should.be.ok();
			result.stderr.should.not.be.ok();
			const confLog = JSON.parse(result.stdout.split('\n')[0]);
			confLog.should.have.property('config');
			confLog.config.should.not.have.property('clearInterval');
		});

		it('should be set from the command line', () => {
			const interval = 20;
			const result   = runCli(['-l', 'debug', '--clear-interval', interval, 'b,1,1']);
			result.stdout.should.be.ok();
			result.stderr.should.not.be.ok();
			const confLog = JSON.parse(result.stdout.split('\n')[0]);
			confLog.should.have.property('config');
			confLog.config.should.have.property('clearInterval', interval);
		});


		it('should be set from config file', () => {
			const confFile = getAssetPath('conf.json');
			const conf     = require(confFile);
			const result   = runCli(['-l', 'debug', '--config', confFile, 'b,1,1']);
			result.stdout.should.be.ok();
			result.stderr.should.not.be.ok();
			const confLog = JSON.parse(result.stdout.split('\n')[1]);
			confLog.should.have.property('config');
			confLog.config.should.have.property('clearInterval', conf.clearInterval);
		});

		it('should fail if set to negative value', () => {
			const interval = -20;
			const result   = runCli(['-l', 'debug', '--clear-interval', interval, 'b,1,1']);
			result.stderr.should.be.ok();
			result.stderr.should.match(new RegExp(`Error: clear interval must be a positive integer \\(${interval}\\)`));
		});
	});

	describe('--port' , () => {
		it('should be set by default', () => {
			const result   = runCli(['-l', 'debug', 'b,1,1']);
			result.stdout.should.be.ok();
			result.stderr.should.not.be.ok();
			const confLog = JSON.parse(result.stdout.split('\n')[0]);
			confLog.should.have.property('config');
			confLog.config.should.have.property('port', 8910);
		});

		it('should be set from the command line', () => {
			const port = 8999;
			const result   = runCli(['-l', 'debug', '--port', port, 'b,1,1']);
			result.stdout.should.be.ok();
			result.stderr.should.not.be.ok();
			const confLog = JSON.parse(result.stdout.split('\n')[0]);
			confLog.should.have.property('config');
			confLog.config.should.have.property('port', port);
		});


		it('should be set from config file', () => {
			const confFile = getAssetPath('conf.json');
			const conf     = require(confFile);
			const result   = runCli(['-l', 'debug', '--config', confFile, 'b,1,1']);
			result.stdout.should.be.ok();
			result.stderr.should.not.be.ok();
			const confLog = JSON.parse(result.stdout.split('\n')[1]);
			confLog.should.have.property('config');
			confLog.config.should.have.property('port', conf.port);
		});

		it('should fail if set to zero or negative value', () => {
			const port = -20;
			const result   = runCli(['-l', 'debug', '--port', port, 'b,1,1']);
			result.stderr.should.be.ok();
			result.stderr.should.match(new RegExp(`Error: port must be a positive integer \\(${port}\\)`));
		});
	});

	describe('--host' , () => {
		it('should be set by default', () => {
			const result   = runCli(['-l', 'debug', 'b,1,1']);
			result.stdout.should.be.ok();
			result.stderr.should.not.be.ok();
			const confLog = JSON.parse(result.stdout.split('\n')[0]);
			confLog.should.have.property('config');
			confLog.config.should.have.property('host', 'localhost');
		});

		it('should be set from the command line', () => {
			const host = '0.0.0.0';
			const result   = runCli(['-l', 'debug', '--host', host, 'b,1,1']);
			result.stdout.should.be.ok();
			result.stderr.should.not.be.ok();
			const confLog = JSON.parse(result.stdout.split('\n')[0]);
			confLog.should.have.property('config');
			confLog.config.should.have.property('host', host);
		});


		it('should be set from config file', () => {
			const confFile = getAssetPath('conf.json');
			const conf     = require(confFile);
			const result   = runCli(['-l', 'debug', '--config', confFile, 'b,1,1']);
			result.stdout.should.be.ok();
			result.stderr.should.not.be.ok();
			const confLog = JSON.parse(result.stdout.split('\n')[1]);
			confLog.should.have.property('config');
			confLog.config.should.have.property('host', conf.host);
		});
	});

	describe('--log-level' , () => {
		const confFile = getAssetPath('conf.json');
		it('should log from info by default', () => {
			const result   = runCli(['--config', confFile]);
			result.stdout.should.be.ok();
			result.stdout.split('\n').should.have.length(2);
		});

		it('should not log in silent mode', () => {
			const result = runCli(['--log-level', 'silent', '--config', confFile]);
			result.stdout.should.not.be.ok();
		});

		it('should be more verbose in debug mode', () => {
			const result = runCli(['--log-level', 'debug', '--config', confFile]);
			result.stdout.should.be.ok();
			result.stdout.split('\n').should.have.length(4);
		});

		it('should fail if mode is unknown', () => {
			const result = runCli(['--log-level', 'bad']);
			result.stdout.should.not.be.ok();
			result.stderr.should.be.ok();
			result.stderr.should.match(/Error: unknown level bad/);
		});
	});

	describe('buckets' , () => {
		it('should correctly set bucket', () => {
			const buckets  = {
				b1: {size: 1,  ttl: '1', ms: 1 * 1000},
				b2: {size: 10, ttl: '2ms', ms: 2},
				b3: {size: 15, ttl: '3s', ms: 3 * 1000},
				b4: {size: 20, ttl: '4m', ms: 4 * 1000 * 60},
				b5: {size: 25, ttl: '5h', ms: 5 * 1000 * 60 * 60}
			};
			const result   = runCli(['-l', 'debug'].concat(_.map(buckets, (b, n) => `${n},${b.size},${b.ttl}`)));
			result.stdout.should.be.ok();
			result.stderr.should.not.be.ok();
			const confLog = JSON.parse(result.stdout.split('\n')[0]);
			confLog.should.have.property('config');
			_.map(buckets, bucket => {
				bucket.ttl = bucket.ms;
				delete bucket.ms;
			});
			confLog.should.have.property('buckets', buckets);
		});

		it('it should merge buckets with config file giving priority to config file', () => {
			const buckets  = {
				b1: {size: 1,  ttl: 1},
				test: {size: 1, ttl: 1}
			};
			const confFile = getAssetPath('conf.json');
			const conf     = require(confFile);
			const result   = runCli(['--config', confFile, '-l', 'debug'].concat(_.map(buckets, (b, n) => `${n},${b.size},${b.ttl}`)));
			result.stdout.should.be.ok();
			result.stderr.should.not.be.ok();
			const confLog = JSON.parse(result.stdout.split('\n')[1]);
			confLog.should.have.property('config');
			confLog.should.have.property('buckets');
			confLog.buckets.should.have.property('b1', {size: buckets.b1.size, ttl: buckets.b1.ttl * 1000});
			confLog.buckets.should.have.property('test', {size: conf.buckets.test.size, ttl: parseInt(conf.buckets.test.ttl, 10) * 1000});
		});

		it('it should fail if size is missing or 0', () => {
			let result   = runCli(['-l', 'debug', 'b1,,1']);
			result.stderr.should.be.ok();
			result.stderr.should.match(/Error: Could not parse bucket b1,,1 name:b1 size: ttl:1000/);

			result   = runCli(['-l', 'debug', 'b1,0,1']);
			result.stderr.should.be.ok();
			result.stderr.should.match(/bucket size "value" must be larger than or equal to 1/);
		});

		it('it should fail if ttl is missing or 0', () => {
			let result   = runCli(['-l', 'debug', 'b1,1']);
			result.stderr.should.be.ok();
			result.stderr.should.match(/Error: Could not parse bucket b1,1 name:b1 size:1 ttl:undefined/);

			result   = runCli(['-l', 'debug', 'b1,1,']);
			result.stderr.should.be.ok();
			result.stderr.should.match(/Error: Could not parse bucket b1,1, name:b1 size:1 ttl:/);

			result   = runCli(['-l', 'debug', 'b1,1,0']);
			result.stderr.should.be.ok();
			result.stderr.should.match(/Error: ttl must be a positive integer for bucket b1,1,0/);
		});

		it('it should fail if bucket name is not unique', () => {
			let result   = runCli(['-l', 'debug', 'b1,1,1', 'b1,1,2']);
			result.stderr.should.be.ok();
			result.stderr.should.match(/Error: Bucket b1 was already defined/);
		});
	});
});
