/* tslint:disable no-console */
import { BuilderContext, Target, targetFromTargetString } from '@angular-devkit/architect';
import { DevServerBuilderOptions } from '@angular-devkit/build-angular';
import { Schema as BrowserBuilderSchema } from '@angular-devkit/build-angular/src/browser/schema';
import { PackageInfo } from 'dr-comp-package/wfh/dist/build-util/ts';
import { ConfigHandler, DrcpConfig } from 'dr-comp-package/wfh/dist/config-handler';
import { getTsDirsOfPackage } from 'dr-comp-package/wfh/dist/utils';
import * as fs from 'fs';
import * as _ from 'lodash';
import * as Path from 'path';
import { sys } from 'typescript';
import { DrcpSetting } from '../configurable';
import { findAppModuleFileFromMain } from '../utils/parse-app-module';
import replaceCode from '../utils/patch-text';
import TsAstSelector from '../utils/ts-ast-query';
import { AngularBuilderOptions } from './common';
import apiSetup from './api-setup';
import ts from 'typescript';

const {cyan, green, red} = require('chalk');
const {walkPackages} = require('dr-comp-package/wfh/dist/build-util/ts');
const packageUtils = require('dr-comp-package/wfh/lib/packageMgr/packageUtils');
const currPackageName = require('../../package.json').name;
const cjson = require('comment-json');
const log = require('log4js').getLogger('@dr-core/ng-app-builder.change-cli-options');
export interface AngularConfigHandler extends ConfigHandler {
	/**
	 * You may override angular.json in this function
	 * @param options Angular angular.json properties under path <project>.architect.<command>.options
	 * @param builderConfig Angular angular.json properties under path <project>
	 */
	angularJson(options: AngularBuilderOptions,
		builderConfig?: DevServerBuilderOptions)
	: Promise<void> | void;
}

function hackAngularBuilderContext(context: BuilderContext, targetName: string,
	replacedOpts: any) {
	const getTargetOptions = context.getTargetOptions;

	// const cached = new Map<string, any>();
	context.getTargetOptions = async function(target: Target) {
		// if (cached.has(target.project + '.' + target.target)) {
		// 	return cached.get(target.project + '.' + target.target);
		// }
		if (target.target === targetName) {
			return replacedOpts;
		}
		const origOption = await getTargetOptions.apply(context, arguments);
		// cached.set(target.project + '.' + target.target, origOption);
		return origOption;
	};
}
/**
 * For build (ng build)
 * @param config 
 * @param browserOptions 
 */
export async function changeAngularCliOptionsForBuild(config: DrcpConfig,
	browserOptions: BrowserBuilderSchema): Promise<AngularBuilderOptions> {
	return processBrowserBuiliderOptions(config, browserOptions);
}

/**
 * For dev server (ng serve)
 * @param config 
 * @param context 
 * @param builderConfig 
 */
export async function changeAngularCliOptions(config: DrcpConfig,
	context: BuilderContext,
	builderConfig?: DevServerBuilderOptions) {

	const browserTarget = targetFromTargetString(builderConfig.browserTarget);
	const rawBrowserOptions = await context.getTargetOptions(browserTarget);
	const browserOptions = await processBrowserBuiliderOptions(
		config, rawBrowserOptions as any as BrowserBuilderSchema, builderConfig, true);
	hackAngularBuilderContext(context, 'build', browserOptions);
	return browserOptions;
}

async function processBrowserBuiliderOptions(config: DrcpConfig, rawBrowserOptions: BrowserBuilderSchema,
	builderConfig?: DevServerBuilderOptions, hmr = false) {
	const browserOptions = rawBrowserOptions as AngularBuilderOptions;
	for (const prop of ['deployUrl', 'outputPath', 'styles']) {
		const value = config.get([currPackageName, prop]);
		if (value != null) {
			(rawBrowserOptions as any)[prop] = value;
			console.log(currPackageName + ' - override %s: %s', prop, value);
		}
	}
	await config.configHandlerMgr().runEach<AngularConfigHandler>((file, obj, handler) => {
		console.log(green('change-cli-options - ') + ' run', cyan(file));
		if (handler.angularJson)
			return handler.angularJson(browserOptions, builderConfig);
		else
			return obj;
	});

	const pkJson = lookupEntryPackage(Path.resolve(browserOptions.main));
	if (pkJson) {
		console.log(green('change-cli-options - ') + `Set entry package ${cyan(pkJson.name)}'s output path to /`);
		config.set(['outputPathMap', pkJson.name], '/');
	}
	// Be compatible to old DRCP build tools
	const {deployUrl} = browserOptions;
	if (!config.get('staticAssetsURL'))
		config.set('staticAssetsURL', _.trimEnd(deployUrl, '/'));
	if (!config.get('publicPath'))
		config.set('publicPath', deployUrl);

	const mainHmr = createMainFileForHmr(browserOptions.main);
	if (hmr) {
		builderConfig.hmr = true;
		if (!browserOptions.fileReplacements)
			browserOptions.fileReplacements = [];
		browserOptions.fileReplacements.push({
			replace: browserOptions.main,
			with: Path.relative('.', mainHmr)
		});
	}
	if (browserOptions.drcpArgs == null) {
		browserOptions.drcpArgs = {};
	}
	hackTsConfig(browserOptions, config);
	apiSetup(browserOptions);

	return browserOptions;
}

function createMainFileForHmr(mainFile: string): string {
	const dir = Path.dirname(mainFile);
	const writeTo = Path.resolve(dir, 'main-hmr.ts');
	if (fs.existsSync(writeTo)) {
		return writeTo;
	}
	const main = fs.readFileSync(mainFile, 'utf8');
	let mainHmr = '// tslint:disable\n' +
	`import hmrBootstrap from '@dr-core/ng-app-builder/src/hmr';\n${main}`;
	const query = new TsAstSelector(mainHmr, 'main-hmr.ts');
	// query.printAll();

	let bootCallAst: ts.Node;
	const statement = query.src.statements.find(statement => {
		// tslint:disable-next-line max-line-length
		const bootCall = query.findWith(statement, ':PropertyAccessExpression > .expression:CallExpression > .expression:Identifier',
			(ast: ts.Identifier, path, parents) => {
				if (ast.text === 'platformBrowserDynamic' &&
				(ast.parent.parent as ts.PropertyAccessExpression).name.getText(query.src) === 'bootstrapModule' &&
				ast.parent.parent.parent.kind === ts.SyntaxKind.CallExpression) {
					return ast.parent.parent.parent;
				}
			});
		if (bootCall) {
			bootCallAst = bootCall;
			return true;
		}
		return false;
	});

	mainHmr = replaceCode(mainHmr, [{
		start: statement.getStart(query.src, true),
		end: statement.getEnd(),
		text: ''}]);
	mainHmr += `const bootstrap = () => ${bootCallAst.getText()};\n`;
	mainHmr += `if (module[ 'hot' ]) {
	    hmrBootstrap(module, bootstrap);
	  } else {
	    console.error('HMR is not enabled for webpack-dev-server!');
	    console.log('Are you using the --hmr flag for ng serve?');
	  }\n`.replace(/^\t/gm, '');

	fs.writeFileSync(writeTo, mainHmr);
	log.info('Write ' + writeTo);
	log.info(mainHmr);
	return writeTo;
}

// Hack ts.sys, so far it is used to read tsconfig.json
function hackTsConfig(browserOptions: AngularBuilderOptions, config: DrcpConfig) {
	const oldReadFile = sys.readFile;
	const tsConfigFile = Path.resolve(browserOptions.tsConfig);

	sys.readFile = function(path: string, encoding?: string): string {
		const res: string = oldReadFile.apply(sys, arguments);
		if (Path.sep === '\\') {
			// Angular somehow reads tsconfig.json twice and passes in `path`
			// with different path seperator `\` and `/` in Windows 
			// `cachedTsConfigFor` is lodash memoize function which needs a
			// consistent `path` value as cache key
			path = path.replace(/\//g, Path.sep);
		}
		try {
			if (path === tsConfigFile)
				return cachedTsConfigFor(path, res, browserOptions, config);
			else
				return res;
		} catch (err) {
			console.error(red('change-cli-options - ') + `Read ${path}`, err);
		}
	};
}

function lookupEntryPackage(lookupDir: string): any {
	while (true) {
		const pk = Path.join(lookupDir, 'package.json');
		if (fs.existsSync(pk)) {
			return require(pk);
		} else if (lookupDir === Path.dirname(lookupDir)) {
			break;
		}
		lookupDir = Path.dirname(lookupDir);
	}
	return null;
}

/**
 * Angular cli will read tsconfig.json twice due to some junk code, 
 * let's memoize the result by file path as cache key.
 */
const cachedTsConfigFor = _.memoize(overrideTsConfig);
/**
 * Let's override tsconfig.json files for Angular at rutime :)
 * - Read into memory
 * - Do not override properties of compilerOptions,angularCompilerOptions that exists in current file
 * - "extends" must be ...
 * - Traverse packages to build proper includes and excludes list and ...
 * - Find file where AppModule is in, find its package, move its directory to top of includes list,
 * 	which fixes ng cli windows bug
 */
function overrideTsConfig(file: string, content: string,
	browserOptions: AngularBuilderOptions, config: DrcpConfig): string {

	const root = config().rootPath;
	const oldJson = cjson.parse(content);
	const preserveSymlinks = browserOptions.preserveSymlinks;
	const pathMapping: {[key: string]: string[]} = preserveSymlinks ? undefined : {};
	const pkInfo: PackageInfo = walkPackages(config, null, packageUtils, true);
	// var packageScopes: string[] = config().packageScopes;
	// var components = pkInfo.moduleMap;

	type PackageInstances = typeof pkInfo.allModules;
	let ngPackages: PackageInstances = pkInfo.allModules;

	// const excludePkSet = new Set<string>();
	const excludePackage: DrcpSetting['excludePackage'] = config.get(currPackageName + '.excludePackage') || [];
	let excludePath: string[] = config.get(currPackageName + '.excludePath') || [];

	ngPackages = ngPackages.filter(comp =>
		!excludePackage.some(reg => _.isString(reg) ? comp.longName.includes(reg) : reg.test(comp.longName)) &&
		(comp.dr && comp.dr.angularCompiler || comp.parsedName.scope === 'bk' ||
			hasIsomorphicDir(comp.json, comp.packagePath)));

	const tsInclude: string[] = oldJson.include || [];
	const tsExclude: string[] = oldJson.exclude || [];
	const appModuleFile = findAppModuleFileFromMain(Path.resolve(browserOptions.main));
	const appPackageJson = lookupEntryPackage(appModuleFile);
	if (appPackageJson == null)
		throw new Error('Error, can not find package.json of ' + appModuleFile);

	// let hasAppPackage = false;
	ngPackages.forEach(pk => {
		// TODO: doc for dr.ngAppModule
		const isNgAppModule: boolean = pk.longName === appPackageJson.name;
		const dir = Path.relative(Path.dirname(file),
			isNgAppModule ? pk.realPackagePath : (preserveSymlinks? pk.packagePath : pk.realPackagePath))
			.replace(/\\/g, '/');
		if (isNgAppModule) {
			// hasAppPackage = true;
			tsInclude.unshift(dir + '/**/*.ts');
			// entry package must be at first of TS include list, otherwise will encounter:
			// "Error: No NgModule metadata found for 'AppModule'
		} else {
			tsInclude.push(dir + '/**/*.ts');
		}
		tsExclude.push(dir + '/ts',
			dir + '/spec',
			dir + '/dist',
			dir + '/**/*.spec.ts');

		if (!preserveSymlinks) {
			const realDir = Path.relative(root, pk.realPackagePath).replace(/\\/g, '/');
			pathMapping[pk.longName] = [realDir];
			pathMapping[pk.longName + '/*'] = [realDir + '/*'];
		}
	});
	// if (!hasAppPackage) {
	// 	tsInclude.unshift(Path.dirname(browserOptions.main).replace(/\\/g, '/') + '/**/*.ts');
	// }
	tsInclude.push(Path.relative(Path.dirname(file), preserveSymlinks ?
			'node_modules/dr-comp-package/wfh/share' :
			fs.realpathSync('node_modules/dr-comp-package/wfh/share'))
		.replace(/\\/g, '/'));
	tsExclude.push('**/test.ts');

	excludePath = excludePath.map(expath =>
		Path.relative(Path.dirname(file), expath).replace(/\\/g, '/'));
	console.log(excludePath);
	tsExclude.push(...excludePath);

	// Important! to make Angular & Typescript resolve correct real path of symlink lazy route module
	if (!preserveSymlinks) {
		const drcpDir = Path.relative(root, fs.realpathSync('node_modules/dr-comp-package')).replace(/\\/g, '/');
		pathMapping['dr-comp-package'] = [drcpDir];
		pathMapping['dr-comp-package/*'] = [drcpDir + '/*'];
		pathMapping['*'] = ['node_modules/*'
			, 'node_modules/@types/*'
		];
	}

	var tsjson: any = {
		// extends: require.resolve('@dr-core/webpack2-builder/configs/tsconfig.json'),
		include: tsInclude,
		exclude: tsExclude,
		compilerOptions: {
			...require('../../misc/tsconfig.app.json').compilerOptions,
			baseUrl: root,
			typeRoots: [
				Path.resolve(root, 'node_modules/@types'),
				Path.resolve(root, 'node_modules/@dr-types'),
				Path.resolve(root, 'node_modules/dr-comp-package/wfh/types')
			],
			// module: 'esnext',
			preserveSymlinks,
			paths: pathMapping
		},
		angularCompilerOptions: {
			// trace: true
		}
	};
	if (oldJson.extends) {
		tsjson.extends = oldJson.extends;
	}
	Object.assign(tsjson.compilerOptions, oldJson.compilerOptions);
	Object.assign(tsjson.angularCompilerOptions, oldJson.angularCompilerOptions);
	// console.log(green('change-cli-options - ') + `${file}:\n`, JSON.stringify(tsjson, null, '  '));
	log.info(`${file}:\n${JSON.stringify(tsjson, null, '  ')}`);
	return JSON.stringify(tsjson, null, '  ');
}

function hasIsomorphicDir(pkJson: any, packagePath: string) {
	const fullPath = Path.resolve(packagePath, getTsDirsOfPackage(pkJson).isomDir);
	try {
		return fs.statSync(fullPath).isDirectory();
	} catch (e) {
		return false;
	}
}
