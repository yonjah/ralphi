/* eslint no-console: "off"*/
/**
 * @file
 * @description Ralphi database benchmarks
 */
'use strict';
const gc = global.gc;
if (!gc) {
	throw new Error('You should run benchmarks with --expose-gc flag');
}

const logger     = {debug (){}, info (){}};
const bucket     = 'one';
const items      = process.argv[2] ? parseInt(process.argv[2], 10) : 1000000;
const sync       = process.argv[3] === 'sync' ? true : false;
const itemsBreak = Math.ceil(items * 0.9);
const ttl        = Math.ceil(2 * items / 10000);
const buckets    = {
	[bucket]: {size: 20, ttl}
};
const db = require('../../server/lib/db')({buckets, logger});

let i,
	times = [];
printMeM();
console.time(`Add ${items} items `);
for (i = itemsBreak; i > 0; i -= 1) {
	db.take(bucket, i);
}
for (i = items; i > itemsBreak; i -= 1) {
	let time = Date.now();
	db.take(bucket, i);
	times.push(Date.now() - time);
}
console.timeEnd(`Add ${items} items `);
printStats(times);
times = [];
gc();
printMeM();

for (i = items; i > itemsBreak; i -= 1) {
	let time = Date.now();
	db.take(bucket, randItem());
	times.push(Date.now() - time);
}
printStats(times);
times = null;
gc();
printMeM();

if (sync) {
	console.time(`cleanup ${items} items sync`);
	const arr = db.cleanSync();
	console.timeEnd(`cleanup ${items} items sync`);
	console.log('remain', arr[0]);
	printMeM();
	console.time(`gc ${items} items `);
	gc();
	console.timeEnd(`gc ${items} items `);
	printMeM();
} else {
	console.time(`cleanup ${items} items `);
	db.clean()
		.then(arr => {
			console.timeEnd(`cleanup ${items} items `);
			console.log('remain', arr[0]);
			printMeM();
			console.time(`gc ${items} items `);
			gc();
			console.timeEnd(`gc ${items} items `);
			printMeM();
		});
}

function randItem () {
	return Math.ceil(Math.random() * items);
}

function printStats (times) {
	let min = Infinity, max = 0, sum = 0;
	for (let time of times) {
		sum += time;
		min = Math.min(min, time);
		max = Math.max(max, time);
	}
	console.log(`max:${max}/min:${min}/avg:${sum / times.length} of ${times.length} items`);
}

function printMeM () {
	const units = ['', 'B', 'M', 'G'];
	const mem = process.memoryUsage();
	Object.keys(mem).forEach(prop => {
		let val = mem[prop],
			unit = 0;
		while (val > 1024 && unit < units.length) {
			val = val / 1024;
			val = Math.floor(val * 100) / 100;
			unit += 1;
		}
		mem[prop] = `${val}${units[unit]}`;
	});
	console.log(JSON.stringify(mem));
}