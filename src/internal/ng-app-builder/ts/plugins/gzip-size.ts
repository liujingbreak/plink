/* tslint:disable no-console */
import * as _ from 'lodash';
import * as Path from 'path';

// var log = require('log4js').getLogger('gzipSizePlugin');
const gzipSize = require('gzip-size');
var {magenta, cyan} = require('chalk');
var prettyBytes = require('pretty-bytes');

export default class GzipSize {
	compiler: any;
	done = false;

	apply(compiler: any) {
		this.compiler = compiler;
		compiler.hooks.emit.tapPromise('GzipSize', (compilation: any) => {
			if (this.done)
				return Promise.resolve();
			this.done = true;
			var all: Array<PromiseLike<any>> = [];
			var maxLenName = _.max(_.map(compilation.assets, (src, file) => file.length));
			if (maxLenName == null)
				return Promise.resolve();

			_.each(compilation.assets, (source, file) => {
				if (Path.extname(file) === '.map')
					return;
				all.push(gzipSize(source.source()).then((size: number) => {
					let colorFunc: any;
					if (size >= 100 * 1024) {
						colorFunc = magenta;
					} else {
						colorFunc = cyan;
					}
					return [file, size, colorFunc];
				}));
			});
			return Promise.all(all).then((rawDatas: Array<[string, number]>) => {
				rawDatas.sort((item: [string, number], item2: [string, number]) => {
					return item2[1] - item[1];
				})
				.forEach((item: [string, number]) => {
					item[1] = prettyBytes(item[1]);
				});
				const datas = (rawDatas as any) as Array<[string, string]>;

				var maxLenSize = _.max(_.map(datas, data => data[1].length));

				if (maxLenSize == null)
					maxLenSize = 0;

				var sepLineLen = '(gzipped)'.length + maxLenSize + maxLenName! + 10;
				console.log();
				console.log(_.pad(' Gzip size ', sepLineLen, '-'));

				_.each(datas, (data: any) => {
					console.log(_.padStart(data[0], maxLenName! + 2, ' ') +
						data[2](_.padStart(data[1], maxLenSize! + 2, ' ')) + ' (gzipped)');
				});
				console.log(_.pad('', sepLineLen, '-'));
			})
			.catch((err: any) => {
				console.log('Failed in GzipSize plugin', err);
			});
		});
	}
}
