import RJ from 'require-injector';
import {doInjectorConfig} from './require-injectors';
import {FactoryMapCollection, FactoryMapInterf} from 'require-injector/dist/factory-map';
// import {ResolveOption} from 'require-injector/dist/node-inject';
import * as _ from 'lodash';
import * as fs from 'fs';
import * as Path from 'path';

const log = require('log4js').getLogger('lib.injectorFactory');

const packageNamePathMap: {[name: string]: string} = {};

const emptyFactoryMap = {
	factory: emptryChainableFunction,
	substitute: emptryChainableFunction,
	value: emptryChainableFunction,
	alias: emptryChainableFunction
};

export class DrPackageInjector extends RJ {
	constructor(resolve: (id: string) => string, protected noNode = false) {
		super({
			basedir: process.cwd(),
			resolve,
			// debug: config.devMode,
			noNode
		});
	}

	addPackage(name: string, dir: string) {
		log.debug('add %s %s', name, dir);
		packageNamePathMap[name] = dir;
	}

	fromComponent(name: string | string[], dir?: string | string[]) {
		const names = ([] as string[]).concat(name);
		if (dir) {
			const dirs = ([] as string[]).concat(dir);
			let i = 0;
			if (names.length !== dirs.length)
				throw new Error('fromComponent(name, dir)\'s be called with 2 Array of same length');
			for (const nm of names as string[]) {
				this.addPackage(nm, dirs[i++]);
			}
		}
		const factoryMaps: FactoryMapInterf[] = [];
		for (const nm of names) {
			if (_.has(packageNamePathMap, nm)) {
				factoryMaps.push(super.fromDir(packageNamePathMap[nm]));
			} else {
				factoryMaps.push(super.fromPackage(nm));
			}
		}
		return new FactoryMapCollection(factoryMaps);
	}

	fromAllComponents() {
		return super.fromDir(_.values(packageNamePathMap));
	}

	fromAllPackages() {
		return this.fromAllComponents();
	}

	notFromPackages(...excludePackages: string[]) {
		const names = _.difference(_.keys(packageNamePathMap), excludePackages);
		const dirs = names.map(pkName => packageNamePathMap[pkName]);
		log.debug('from ' + dirs);
		return super.fromDir(dirs);
	}

	readInjectFile(fileName: string) {
		if (!fileName) {
			fileName = 'module-resolve.server.js';
		}
		log.debug('execute internal ' + fileName);
		require('../' + fileName)(this);
		const file = Path.resolve(process.cwd(), fileName);
		if (fs.existsSync(file)) {
			log.debug('execute ' + file);
			require(process.cwd().replace(/\\/g, '/') + '/' + fileName)(this);
		} else {
			log.warn(file + ' doesn\'t exist');
		}
		return doInjectorConfig(this, !this.noNode);
	}
}

export let nodeInjector = new DrPackageInjector(require.resolve, false);
export let webInjector = new DrPackageInjector(null, true);


function emptryChainableFunction() {
	return emptyFactoryMap;
}
