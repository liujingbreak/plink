const api = require('__api');
const webpack = require('webpack');
const chalk = require('chalk');
const fs = require('fs-extra');
var log = require('log4js').getLogger('wfh.dll-plugin-config');
var _ = require('lodash');
const Path = require('path');
var mutilEntryHtmlPlugin = require('../lib/multi-entry-html-plugin');
const ManualChunkPlugin = require('../lib/manual-chunk-plugin');
var pify = require('pify');
var readFileAsync = pify(fs.readFile);

/**
 * There is extra dll setting in webpack.config.js for ExtractTextPlugin
 */
module.exports = function(wconfig) {
	var dllDir = api.config.resolve('dllDestDir');
	if (api.argv.dll) {
		var safeName = api.argv.dll.replace(/(^[^_a-zA-Z$]|[^_a-zA-Z0-9$])/g, '_');
		fs.mkdirsSync(dllDir);
		var o = wconfig.output;
		o.filename = '[name].js';
		o.chunkFilename = '[id].[name].js';
		o.path = dllDir;
		// o.publicPath += 'dll/';
		o.library = safeName;
		wconfig.plugins.push(new webpack.DllPlugin({
			name: safeName,
			path: api.isDefaultLocale() ?
				Path.join(dllDir, '[name]-manifest.json') :
				Path.join(dllDir, api.getBuildLocale(), '[name]-manifest.json')
		}));
		var deleteIdx = _.findIndex(wconfig.plugins, plugin => plugin instanceof ManualChunkPlugin);
		wconfig.plugins.splice(deleteIdx, 1);
	}
	var refDll = api.argv.refDll;
	if (refDll) {
		// Insert chunks
		var entryHtmlPlugin = _.find(wconfig.plugins, plugin => plugin instanceof mutilEntryHtmlPlugin);
		var promises = [];
		for (let fname of refDll) {
			let libPath = /^(.*?)(?:\.js|-manifest\.json)?$/.exec(fname)[1];
			// js chunk
			var foundJs = false;
			var testPaths = [
				Path.join(dllDir, libPath + '.js'),
				libPath + '.js'
			];
			for (let testPath of testPaths) {
				if (!fs.existsSync(testPath))
					continue;
				let url = Path.relative(dllDir, testPath).replace(/\\/g, '/');
				log.info(`Add <script src> tag "${chalk.cyan(url)}" to entry pages`);
				entryHtmlPlugin.addExternalJs(url);
				foundJs = true;
			}
			if (!foundJs)
				log.error('Can not find DLL chunk as:\n' + testPaths.join(',\n'));
			testPaths = [
				Path.join(dllDir, libPath + '.css'),
				libPath + '.css'
			];
			for (let testPath of testPaths) {
				if (!fs.existsSync(testPath))
					continue;
				let url = Path.relative(dllDir, testPath).replace(/\\/g, '/');
				log.info(`Add <link rel="stylesheet" href> tag "${chalk.cyan(url)}" to entry page`);
				entryHtmlPlugin.addExternalCss(url);
			}
			// manifest
			testPaths = [
				Path.join(dllDir, libPath + '-manifest.json'),
				libPath + '-manifest.json'
			];
			var foundMani = false;
			for (let testPath of testPaths) {
				if (!fs.existsSync(testPath))
					continue;
				addDllRefPluginFor(testPath, wconfig.plugins);
				foundMani = true;
			}
			if (!foundMani)
				log.error(`Can not find DLL manifest ${libPath}-manifest.json`);
		}
		return Promise.all(promises);
	}
	return Promise.resolve(null);
};

function addDllRefPluginFor(manifestFile, toList) {
	log.info('Dll reference ' + chalk.cyan(manifestFile));
	return readFileAsync(manifestFile)
	.then(content => {
		var manifest = JSON.parse(content);
		var plugin = new webpack.DllReferencePlugin({
			context: api.config().rootPath,
			manifest
		});
		toList.push(plugin);
	});
}
