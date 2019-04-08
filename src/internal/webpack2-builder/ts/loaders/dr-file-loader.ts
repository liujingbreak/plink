/**
 * Unlike file-loader, it loads assets resource from "DRCP" package relative directory, not from current
 * process.cwd() directory 
 */

import * as path from 'path';
import api from '__api';
import * as _ from 'lodash';
// import * as fs from 'fs';
import {loader as wl} from 'webpack';
import {RawSourceMap} from 'source-map';
import * as loaderUtils from 'loader-utils';
var log = require('log4js').getLogger(api.packageName + '.dr-file-loader');
let resolveSymlink: boolean = null;

function loader(this: wl.LoaderContext, content: string | Buffer, sourceMap?: RawSourceMap):
	string | Buffer | void | undefined {
	if (!this.emitFile)
		throw new Error('File Loader\n\nemitFile is required from module system');
	if (resolveSymlink === null)
		resolveSymlink = _.get(this, '_compiler.options.resolve.symlinks');
	if (this.cacheable)
		this.cacheable();
	// var callback = this.async();

	if (!this.emitFile) throw new Error('emitFile is required from module system');

	var options = loaderUtils.getOptions(this) || {};

	options = Object.assign(options, {publicPath: false,
		useRelativePath: false,
		name: '[name].[md5:hash:hex:8].[ext]'
	});

	const context =
		options.context ||
		this.rootContext ||
		((this as any).options && (this as any).options.context);

	var url = loaderUtils.interpolateName(this, options.name, {
		context,
		content,
		regExp: options.regExp
	});

	let outputPath = url;
	if (options.outputPath) {
		if (typeof options.outputPath === 'function') {
			outputPath = options.outputPath(url);
		} else {
			outputPath = path.posix.join(options.outputPath, url);
		}
	}
	const drcpOutputDir = drPackageOutputPath(this);
	outputPath = drcpOutputDir + '/' + _.trimStart(outputPath, '/');
	outputPath = _.trimStart(outputPath, '/');
	// console.log(drPackageOutputPath(this));
	// ------- DRCP: not supporting useRelativePath --------
	// if (options.useRelativePath) {
	// 	const filePath = this.resourcePath;

	// 	const issuer = options.context
	// 	? context
	// 	: this._module && this._module.issuer && this._module.issuer.context;

	// 	const relativeUrl =
	// 	issuer &&
	// 	path
	// 		.relative(issuer, filePath)
	// 		.split(path.sep)
	// 		.join('/');

	// 	const relativePath = relativeUrl && `${path.dirname(relativeUrl)}/`;
	// 	// eslint-disable-next-line no-bitwise
	// 	if (~relativePath.indexOf('../')) {
	// 	outputPath = path.posix.join(outputPath, relativePath, url);
	// 	} else {
	// 	outputPath = path.posix.join(relativePath, url);
	// 	}
	// }
	let publicPath = `__webpack_public_path__ + ${JSON.stringify(outputPath)}`;

	if (options.publicPath) {
		if (typeof options.publicPath === 'function') {
			publicPath = options.publicPath(url);
		} else if (options.publicPath.endsWith('/')) {
			publicPath = options.publicPath + url;
		} else {
			publicPath = `${options.publicPath}/${url}`;
		}

		publicPath = JSON.stringify(publicPath);
	}

	// eslint-disable-next-line no-undefined
	if (options.emitFile === undefined || options.emitFile) {
		this.emitFile(outputPath, content, null);
	}

	// TODO revert to ES2015 Module export, when new CSS Pipeline is in place
	log.info('resource URL:', publicPath);
	return `module.exports = ${publicPath};`;


	// var filePath = this.resourcePath;
	// var browserPackage = api.findPackageByFile(filePath);
	// let outputPath = _.trimStart(api.config.get(['outputPathMap', browserPackage.longName]), '/');

	// let packageDir;
	// if (browserPackage.realPackagePath.startsWith(process.cwd()) || resolveSymlink) {
	// 	packageDir = browserPackage.realPackagePath;
	// 	filePath = fs.realpathSync(filePath);
	// } else {
	// 	packageDir = browserPackage.packagePath;
	// }
	// outputPath = path.join(outputPath, path.dirname(path.relative(packageDir, filePath)));

	// url = path.join(outputPath, url.split('/').pop()).replace(/\\/g, '/'); // only file name part
	// url = url.replace(/(^|\/)node_modules(\/|$)/g, '$1n-m$2').replace(/@/g, 'a');

	// var publicPath = '__webpack_public_path__ + ' + JSON.stringify(url);

	// if (options.emitFile === undefined || options.emitFile) {
	// 	this.emitFile(url, content, sourceMap);
	// }
	// callback(null, 'module.exports = ' + publicPath + ';');
}

namespace loader {
	export const raw = true;
}
export = loader;

/**
 * return propert paths of a resource from DRCP package, including emit() path and source URL
 * @param this null
 * @param loaderCtx Webpack loader context instance
 * @return [<> , <emit >]
 */
function drPackageOutputPath(this: unknown, loaderCtx: wl.LoaderContext) {
	if (resolveSymlink === null)
		resolveSymlink = _.get(this, '_compiler.options.resolve.symlinks');
	var dir = loaderCtx.context;
	var browserPackage = api.findPackageByFile(dir);
	if (browserPackage) {
		let outDir = _.trimStart(api.config.get(['outputPathMap', browserPackage.longName]), '/');
		let sourcePkgDir = resolveSymlink ? browserPackage.realPackagePath : browserPackage.packagePath;
		let relativeInPkg = path.relative(sourcePkgDir, dir).replace(/\\/g, '/');
		return outDir + '/' + relativeInPkg;
	} else {
		return path.relative(loaderCtx.rootContext, dir).replace(/\\/g, '/')
			.replace(/\.\./g, '_')
			.replace(/(^|\/)node_modules(\/|$)/g, '$1vendor$2')
			.replace(/@/g, 'a_');
	}
}
