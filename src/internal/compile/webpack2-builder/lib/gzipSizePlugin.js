var _ = require('lodash');
//var log = require('log4js').getLogger('gzipSizePlugin');
var Path = require('path');
const gzipSize = require('gzip-size');
var chalk = require('chalk');
var prettyBytes = require('pretty-bytes');

module.exports = function() {
	var compiler = this;
	compiler.plugin('emit', function(compilation, callback) {
		var all = [];
		var maxLenName = _.max(_.map(compilation.assets, (src, file) => file.length));

		_.each(compilation.assets, (source, file) => {
			if (Path.extname(file) === '.map')
				return;
			all.push(new Promise((resolve, reject) => {
				gzipSize(source.source(), (err, size) => {
					if (err)
						return reject(err);
					//log.info(_.padStart(`${file} gzip size: ${size}`, maxLenName, ' '));
					resolve([file, prettyBytes(size)]);
				});
			}));
		});
		Promise.all(all).then((datas) => {
			var maxLenSize = _.max(_.map(datas, data => data[1].length));
			var sepLineLen = '(gzipped)'.length + maxLenSize + maxLenName + 10;
			console.log(_.pad(' Gzip size ', sepLineLen, '-'));

			_.each(datas, data => {
				console.log(_.padStart(data[0], maxLenName + 2, ' ') + chalk.magenta(_.padStart(data[1], maxLenSize + 2, ' ')) + ' (gzipped)');
			});
			console.log(_.pad('', sepLineLen, '-'));
			callback();
		});
	});
};

