/* tslint:disable max-line-length */
import NodePackage from './packageNodeInstance';
import Events = require('events');
import * as _ from 'lodash';
import {PackageInfo, packageInstance} from '@dr-core/build-util/index';
// import Package from './packageNodeInstance';
import { existsSync} from 'fs';
import {join} from 'path';
import {orderPackages} from './package-priority-helper';
const LRU = require('lru-cache');
const config = require('../lib/config');
const packageUtils = require('../lib/packageMgr/packageUtils');
const NodeApi = require('../lib/nodeApi');
const {nodeInjector} = require('../lib/injectorFactory');


const log = require('log4js').getLogger('package-runner');

export interface ServerRunnerEvent {
	file: string;
	functionName: string;
}
export class ServerRunner {
	// packageCache: {[shortName: string]: NodePackage} = {};
	// corePackages: {[shortName: string]: NodePackage} = {};
	deactivatePackages: NodePackage[];

	async shutdownServer() {
		log.info('shutting down');
		await this._deactivatePackages(this.deactivatePackages);
	}

	protected async _deactivatePackages(comps: NodePackage[]) {
		for (const comp of comps) {
			const exp = require(comp.longName);
			if (_.isFunction(exp.deactivate)) {
				log.info('deactivate', comp.longName);
				await Promise.resolve(exp.deactivate());
			}
		}
	}
}

const apiCache: {[name: string]: any} = {};

export function runPackages(argv: any) {
	const includeNameSet = new Set<string>();
	(argv.package as string[]).forEach(name => includeNameSet.add(name));

	const hyPos: number = (argv.target as string).indexOf('#');
	const fileToRun = (argv.target as string).substring(0, hyPos);
	const funcToRun = (argv.target as string).substring(hyPos + 1);
	const NodeApi = require('../lib/nodeApi');
	const proto = NodeApi.prototype;
	proto.argv = argv;
	const walkPackages = require('@dr-core/build-util').walkPackages;
	const packageInfo: PackageInfo = walkPackages(config, argv, packageUtils, argv['package-cache'] === false);
	proto.packageInfo = packageInfo;
	const cache = LRU(20);
	proto.findPackageByFile = function(file: string) {
		var found = cache.get(file);
		if (!found) {
			found = packageInfo.dirTree.getAllData(file).pop();
			cache.set(file, found);
		}
		return found;
	};
	proto.getNodeApiForPackage = function(packageInstance: any) {
		return getApiForPackage(packageInstance);
	};
	const components = packageInfo.allModules.filter(pk => {
		return (includeNameSet.size === 0 || includeNameSet.has(pk.longName) || includeNameSet.has(pk.shortName)) &&
			pk.dr != null && existsSync(join(pk.packagePath, fileToRun));
	});
	components.forEach( pk => {
		setupNodeInjectorFor(pk);
	});
	return orderPackages(components, (pkInstance: packageInstance)  => {
		const file = join(pkInstance.packagePath, fileToRun);
		log.info('require(%s)', JSON.stringify(file));
		const fileExports: any = require(file);
		if (_.isFunction(fileExports[funcToRun])) {
			log.info('Run %s %s()', file, funcToRun);
			return fileExports[funcToRun]();
		}
	})
	.then(() => {
		(proto.eventBus as Events).emit('done', {file: fileToRun, functionName: funcToRun} as ServerRunnerEvent);
	});
}

function setupNodeInjectorFor(pkInstance: packageInstance) {
	function apiFactory() {
		return getApiForPackage(pkInstance);
	}
	nodeInjector.fromPackage(pkInstance.longName, pkInstance.realPackagePath)
	.value('__injector', nodeInjector)
	.factory('__api', apiFactory);
	nodeInjector.fromPackage(pkInstance.longName, pkInstance.packagePath)
	.value('__injector', nodeInjector)
	.factory('__api', apiFactory);
	nodeInjector.default = nodeInjector; // For ES6 import syntax
}

function getApiForPackage(pkInstance: any) {
	if (_.has(apiCache, pkInstance.longName)) {
		return apiCache[pkInstance.longName];
	}

	const api = new NodeApi(pkInstance.longName, pkInstance);
	// api.constructor = NodeApi;
	pkInstance.api = api;
	apiCache[pkInstance.longName] = api;
	api.default = api; // For ES6 import syntax
	return api;
}
