/**
 * @file
 * @description Method to run db cleaning process on specific interval
 */
'use strict';

function cleanInterval (db, logger, interval) {
	let cleaning = false;
	setInterval(() => {
		if (!cleaning) {
			cleaning = true;
			db.clean()
				.then(() => {
					cleaning = false;
				}, e => {
					cleaning = false;
					throw e;
				});
		} else {
			logger.warn('Cleaning failed to run due to previous incomplete process, you should consider increasing clean-interval setting');
		}
	}, interval);
}

module.exports = cleanInterval;