// tslint:disable:no-console
import {DrPackageInjector} from './dist/injector-factory';
import * as _ from 'lodash';

export = function(injector: DrPackageInjector) {
	// var _ = require('lodash');
	const config = require('./lib/config');
	let less: any;

	injector.fromPackage('url-loader', {baseDir: process.cwd()})
		.alias('file-loader', '@dr-core/webpack2-builder/lib/dr-file-loader');
	let oldLessRender: () => void;
	// Hacking less-loader start: to append NpmImportPlugin to less render plugin list
	try {
		less = require('less');
		oldLessRender = less.render;
		var NpmImportPlugin: any;
		if ([
			'less-plugin-npm-import',
			'@dr-core/webpack2-builder/node_modules/less-plugin-npm-import'
		].some(m => {
			try {
				NpmImportPlugin = require(m);
			} catch (e) {
				return false;
			}
			return true;
		})) {
			injector.fromDir(['node_modules/less-loader', '@dr-core/webpack2-builder/node_modules/less-loader'])
			.factory('less', function(file) {
				if (less.render !== hackedLessRender)
					less.render = hackedLessRender;
				return less;
			});
		}
	} catch (e) {
		console.log('Don\'t be panic, this might be normal: ', e);
		console.log(
			'Skip setting up LESS hacking for above issue, it might be normal to a production Node.js HTTP server environment.');
	}
	function hackedLessRender(source: string, options: any, ...others: any[]) {
		options.plugins.push(new NpmImportPlugin());
		return oldLessRender.call(less, source, options, ...others);
	}
	// Hacking less-loader end

	const chalk = require('chalk');
	injector.fromAllComponents()
	.factory('chalk', function() {
		return new chalk.constructor(
			{enabled: config.get('colorfulConsole') !== false && _.toLower(process.env.CHALK_ENABLED) !== 'false'});
	});
};
