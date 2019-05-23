/* tslint:disable max-line-length */
import api from '__api';
import * as Url from 'url';
import * as log4js from 'log4js';
import * as _ from 'lodash';
import * as Path from 'path';
import * as _fs from 'fs-extra';
import {AngularCliParam} from './ng/common';
import changeWebpackConfig from './config-webpack';
import {TsHandler, ReplacementInf} from './utils/ts-before-aot';
import * as ts from 'typescript';
import {boxString} from 'dr-comp-package/wfh/dist/utils';
import {ngRouterPath} from './api-share';
export * from './configurable';
export * from './ng-prerender';
export * from './ng/common';
export * from './config-webpack';
export {AngularConfigHandler} from './ng/change-cli-options';

const semver = require('semver');
const {red, yellow} = require('chalk');

// const fs = require('fs-extra');
// const sysFs = fs as typeof _fs & {mkdirsSync: (file: string) => void};
const log = log4js.getLogger(api.packageName);

export function compile() {
	// const root = api.config().rootPath;
	// const ngParam: AngularCliParam = api.config()._angularCli;
	// if (!ngParam.browserOptions.preserveSymlinks) {
	// 	const fm = api.browserInjector.fromDir(Path.resolve('/'));
	// 	fm.alias(/^((?:@[^/]+\/)?[^./]+)(.*?)$/, (sourceFilePath: string, regs: RegExpExecArray): string => {
	// 		const pkInstance = api.packageInfo.moduleMap[regs[1]];
	// 		if (pkInstance) {
	// 			return Path.relative(root, pkInstance.realPackagePath).replace(/\\/g, '/') + regs[2];
	// 		}
	// 		return regs[0];
	// 	});
	// }
	return setupApiForAngularCli();
}

export let tsHandler: TsHandler = resolveImports;
function resolveImports(src: ts.SourceFile): ReplacementInf[] {
	return [];
	// const ngParam: AngularCliParam = api.config()._angularCli;
	// if (ngParam.browserOptions.preserveSymlinks)
	// 	return [];

	// const sel = new TsSelector(src);
	// const repl: ReplacementInf[] = [];
	// const dir = Path.dirname(src.fileName);
	// for (const ast of sel.findAll(':ImportDeclaration>.moduleSpecifier')) {
	// 	const from = ast as ts.StringLiteral;
	// 	// log.info('from ', from.text);
	// 	const reg = /^((?:@[^/]+\/)?[^./]+)(.*?)$/.exec(from.text);
	// 	if (reg == null)
	// 		continue;
	// 	const pkInstance = api.packageInfo.moduleMap[reg[1]];
	// 	if (pkInstance && pkInstance.dr) {
	// 		let resolvedFrom = Path.relative(dir, pkInstance.realPackagePath).replace(/\\/g, '/') + reg[2];
	// 		if (resolvedFrom.startsWith('node_modules/')) {
	// 			resolvedFrom = resolvedFrom.slice('node_modules/'.length);
	// 		} else if (/^[^./]/.test(resolvedFrom)) {
	// 			resolvedFrom = './' + resolvedFrom;
	// 		}
	// 		repl.push({text: `'${resolvedFrom}'`, start: from.getStart(src), end: from.getEnd()});
	// 	}
	// }
	// return repl;
}

export async function init() {
	// printHelp();
	if (_fs.existsSync('node_modules/@angular-devkit/build-angular/node_modules')) {
		_fs.removeSync('node_modules/@angular-devkit/build-angular/node_modules');
	}
	await new Promise(resolve => setTimeout(resolve, 100)); // wait for delete
	if (!checkAngularVersion())
		throw new Error('Angular version check Error');
	// writeTsconfig();
	hackFixWatchpack();
	writeTsconfig4Editor();
}

export function activate() {
}

async function setupApiForAngularCli() {
	const ngParam: AngularCliParam = api.config()._angularCli;
	if (!ngParam || api.ngEntryComponent)
		return;
	// if (!ngParam.browserOptions.preserveSymlinks) {
	// 	throw new Error('In order to get DRCP builder work,\
	// 	you must set property `preserveSymlinks` to be true in project\'s angular.json file \
	// 	');
	// }
	const webpackConfig = ngParam.webpackConfig;
	const ngEntryComponent = api.findPackageByFile(Path.resolve(ngParam.projectRoot));
	const deployUrl = webpackConfig.output.publicPath || api.config.get('publicPath');

	const publicUrlObj = Url.parse(deployUrl);
	Object.assign(Object.getPrototypeOf(api), {
		webpackConfig,
		ngEntryComponent,
		deployUrl,
		ssr: ngParam.ssr,
		ngBaseRouterPath: _.trim(publicUrlObj.pathname, '/'),
		ngRouterPath,
		ssrRequire(requirePath: string) {
			if (ngParam.ssr)
				return require(Path.join(this.__dirname, requirePath));
		}
	});
	await changeWebpackConfig(ngParam, webpackConfig, api.config());

	// ngParam.vfsHost.hookRead = createTsReadHook(ngParam);
	log.info('Setup api object for Angular');
}

function checkAngularVersion() {
	const deps: {[k: string]: string} = {
		'@angular-devkit/build-angular': '0.12.2',
		'@angular/cli': '7.2.2',
		'@angular/compiler-cli': '7.2.1',
		'@angular/language-service': '7.2.1'
	};
	let valid = true;
	_.each(deps, (expectVer, mod) => {
		const ver = require(mod + '/package.json').version;
		if (!semver.satisfies(ver, expectVer)) {
			valid = false;
			log.error(yellow(`Installed dependency "${mod}@`) + red(ver) + yellow(`" version is not supported, install ${expectVer} instead.`));
		}
	});

	try {
		const duplicate = require.resolve('@angular-devkit/build-angular/node_modules/webpack/package.json');
		log.error(`Duplicate dependency is found in "${duplicate}",\n
		DRCP failed to delete some files for unknow reason, please try this command again`);
		valid = false;
	} catch (ex) {}

	if (_fs.existsSync('@angular-devkit/build-angular/node_modules/@angular-devkit')) {
		log.error(`Duplicate dependency is found in "@angular-devkit/build-angular/node_modules/@angular-devkit",\n
		DRCP failed to delete some files for unknow reason, please try this command again`);
		valid = false;
	}
	if (_fs.existsSync('@angular-devkit/build-angular/node_modules/@ngtools/webpack')) {
		log.error(`Duplicate dependency is found in "@angular-devkit/build-angular/node_modules/@ngtools/webpack",\n
		DRCP failed to delete some files for unknow reason, please try this command again`);
		valid = false;
	}
	try {
		const duplicate = require.resolve('@angular-devkit/architect/node_modules/rxjs/package.json');
		log.error(`Duplicate dependency is found in "${duplicate}",\n
		DRCP failed to delete some files for unknow reason, please try this command again`);
		valid = false;
	} catch (ex) {}
	return valid;
}

// function printHelp() {
// 	// tslint:disable no-console
// 	console.log('\n\n  If you want to narrow down to only specific modules for Angular to build/serve, try\n    ' +
// 		yellow('drcp init --prop @dr-core/ng-app-builder.packages=<packageName,...>') + '\n  ' +
// 		'Or through a configuration file:\n' +
// 		yellow('    drcp init -c <other files> modules.yaml\n') +
// 		'  modules.yaml:\n' +
// 		cyan('  '.repeat(1) + '@dr-core/ng-app-builder:\n' +
// 			'  '.repeat(2) + 'packages:\n' +
// 			'  '.repeat(3) + '- <packageName 1>\n' +
// 			'  '.repeat(3) + '- <packageName 2>\n')
// 	);
// }

function writeTsconfig4Editor() {
	const tsjson: any = {
		// extends: require.resolve('@dr-core/webpack2-builder/configs/tsconfig.json'),
		extends: require.resolve('dr-comp-package/wfh/tsconfig.json'),
		// include: tsInclude,
		compilerOptions: {
			baseUrl: '.',
			strictNullChecks: true
		}
	};
	// ------- Write tsconfig.json for Visual Code Editor --------

	let srcDirCount = 0;
	const root = api.config().rootPath;

	const packageToRealPath: Array<[string, string]> = [];
	require('dr-comp-package/wfh/lib/packageMgr/packageUtils')
	.findAllPackages((name: string, entryPath: string, parsedName: string, json: any, packagePath: string) => {
		const realDir = _fs.realpathSync(packagePath);
		// Path.relative(root, realDir).replace(/\\/g, '/');
		packageToRealPath.push([name, realDir]);
	}, 'src');

	for (let proj of api.config().projectList) {
		tsjson.include = [];
		require('dr-comp-package/wfh/dist/recipe-manager').eachRecipeSrc(proj, (srcDir: string) => {
			let includeDir = Path.relative(proj, srcDir).replace(/\\/g, '/');
			if (includeDir && includeDir !== '/')
				includeDir += '/';
			tsjson.include.push(includeDir + '**/*.ts');
			tsjson.include.push(includeDir + '**/*.tsx');
			srcDirCount++;
		});
		log.info('Write tsconfig.json to ' + proj);
		const pathMapping: {[key: string]: string[]} = {};
		for (const [name, realPath] of packageToRealPath) {
			const realDir = Path.relative(proj, realPath).replace(/\\/g, '/');
			pathMapping[name] = [realDir];
			pathMapping[name + '/*'] = [realDir + '/*'];
		}

		const drcpDir = Path.relative(root, _fs.realpathSync('node_modules/dr-comp-package')).replace(/\\/g, '/');
		pathMapping['dr-comp-package'] = [drcpDir];
		pathMapping['dr-comp-package/*'] = [drcpDir + '/*'];
		pathMapping['*'] = ['node_modules/*', 'node_modules/@types/*'];

		tsjson.compilerOptions = {
			baseUrl: root,
			paths: pathMapping,
			typeRoots: [
				Path.join(root, 'node_modules/@types'),
				Path.join(root, 'node_modules/@dr-types'),
				Path.join(Path.dirname(require.resolve('dr-comp-package/package.json')), '/wfh/types')
			],
			noImplicitAny: true,
			target: 'es2015',
			module: 'commonjs'
		};
		_fs.writeFileSync(Path.resolve(proj, 'tsconfig.json'), JSON.stringify(tsjson, null, '  '));
	}


	if (srcDirCount > 0) {
		log.info('\n' + boxString('To be friendly to your editor, we just added tsconfig.json file to each of your project directories,\n' +
		'But please add "tsconfig.json" to your .gitingore file,\n' +
		'since these tsconfig.json are generated based on your local workspace location.'));
	}
}


/**
 * https://github.com/webpack/watchpack/issues/61
 */
function hackFixWatchpack() {
	const watchpackPath = ['webpack/node_modules/watchpack', 'watchpack'].find(path => {
		return _fs.existsSync(Path.resolve('node_modules/' + path + '/lib/DirectoryWatcher.js'));
	});
	if (!watchpackPath) {
		log.warn('Can not find watchpack, please make sure Webpack is installed.');
		return;
	}
	const target = Path.resolve('node_modules/' + watchpackPath + '/lib/DirectoryWatcher.js');
	if (_fs.existsSync(target + '.drcp-bak'))
		return;
	log.info(`hacking ${target}\n\t to workaround issue: https://github.com/webpack/watchpack/issues/61`);
	_fs.renameSync(target, target + '.drcp-bak');
	_fs.writeFileSync(target,
		_fs.readFileSync(target + '.drcp-bak', 'utf8').replace(/\WfollowSymlinks:\sfalse/g, 'followSymlinks: true'), 'utf8');
}
