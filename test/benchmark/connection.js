/* eslint no-console: "off"*/
/**
 * @file
 * @description Ralphi connection  benchmark
 */
'use strict';
const {spawn} = require('child_process');
const {Benchmark, Suite} = require('sandra');
const {performance} = require('perf_hooks');
const utils      = require('../integration/utils');
const {path, base} = utils;
const binPath = path.join(base, 'server', 'bin', 'server-cli.js');
const Client      =  require(path.join(base, 'client'));
const items       = 100000;
const concorrency = process.argv[2] ? parseInt(process.argv[2], 10) : 10;
const timeout     = process.argv[3] ? parseInt(process.argv[3], 10) : 5000;


function initServer () {
	let called = false;
	return new Promise(resolve => {
		const ralphiServer = spawn(binPath, ['bucket1,1000,1h','bucket2,1000,1h','bucket3,1000,1h','bucket4,1000,1h']);
		ralphiServer.stderr.on('data', data => {
			throw new Error(data.toString());
		});

		ralphiServer.stdout.on('data', () => {
			if (!called) {
				called = true;
				return resolve(ralphiServer);
			}
		});

		ralphiServer.on('close', code => {
			if (code) {
				throw new Error(`cli exit with code ${code}`);
			}
		});
	});
}


(async () => {
	await nrSuite();
	await kaSuite();
})();

async function kaSuite () {
	let i = 0;
	// basic operation
	const server = await initServer();
	const client = new Client({keepAlive: true});
	const suite  = new Suite('keepAlive');

	const bench1 = new Benchmark('sync run no records', async () => {
		i += 1;
		await client.take('bucket1', i.toString());
	});

	const bench2 = new Benchmark('sync run with records', async () => {
		i += 1;
		await client.take('bucket1', i.toString());
	});

	const bench3 = new Benchmark('rand run with records', async () => {
		i += 1;
		await client.take('bucket1', Math.ceil(Math.random() * items).toString());
	});

	suite.push(bench1);
	suite.push(bench2);
	suite.push(bench3);
	suite.on('cycle', event => {
		i = 0;
		console.log(event.toString());
	});

	await runSuite(suite, {
		concorrency,
		timeout
	});

	server.kill();
}

async function nrSuite () {
	let i = 0;
	// basic operation
	const server = await initServer();
	const client = new Client();
	const suite  = new Suite('normal');

	const bench1 = new Benchmark('sync run no records', async () => {
		i += 1;
		await client.take('bucket1', i.toString());
	});

	const bench2 = new Benchmark('sync run with records', async () => {
		i += 1;
		await client.take('bucket1', i.toString());
	});

	const bench3 = new Benchmark('rand run with records', async () => {
		i += 1;
		await client.take('bucket1', Math.ceil(Math.random() * items).toString());
	});

	suite.push(bench1);
	suite.push(bench2);
	suite.push(bench3);
	suite.on('cycle', event => {
		i = 0;
		console.log(event.toString());
	});

	await runSuite(suite, {
		concorrency,
		timeout
	});

	server.kill();
}

function avg (arr) {
	return arr.reduce((sum, value) => sum + value, 0) / arr.length;
}

async function runSuite (suite, options) {
	options = Object.assign({timeout: 1e3, concorrency: 10}, options);
	suite.emit('start');

	for (let benchmark of suite.benchmarks) {
		const stats = await runConcorrent(benchmark, options.timeout, options.concorrency);
		let min = Infinity,
			max = 0;

		const average = avg(stats);
		const deviation = Math.sqrt(avg(stats.map(value => {
			min = Math.min(min, value);
			max = Math.max(max, value);
			const diff = average - value;
			return diff * diff;
		})));

		const ops = `${(stats.length * 1000 / options.timeout).toFixed(2)} ops/sec`;
		const dev = `±${(deviation / average).toFixed(2)}%`;
		const runs = `${stats.length} runs sampled`;

		suite.emit('cycle', `${suite.title}#${benchmark.title}(${options.concorrency})  x ${ops} ${dev} min/max/avg ${min}/${max}/${average} (${runs})`);
	}

	suite.emit('complete');
}

async function runConcorrent (benchmark, timeout, concorrency) {
	const {args, func} = benchmark;
	const elapsed = [];

	let end = performance.now();
	const finish = performance.now() + timeout;

	async function run () {
		const start = performance.now();
		await func(...args);
		end = performance.now();
		elapsed.push(end - start);
	}
	while (end < finish) {
		const promises = [];
		for (let i = 0; i < concorrency; i += 1) {
			promises.push(run());
		}
		await Promise.all(promises);
	}

	return elapsed;
}