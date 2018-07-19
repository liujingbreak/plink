/* tslint:disable max-line-length */
import NodePackage from './packageNodeInstance';
import * as _ from 'lodash';
import Package from './packageNodeInstance';
import { existsSync, realpathSync} from 'fs';
import {join} from 'path';
const packageUtils = require('../lib/packageMgr/packageUtils');
// const {orderPackages} = require('../lib/packageMgr/packagePriorityHelper');

const log = require('log4js').getLogger('package-runner');

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

export function runPackages(argv: any) {
	// const packageNames: string[] = argv.package;
	const pks: Package[] = [];
	const hyPos: number = (argv.fileExportFunc as string).indexOf('#');
	const fileToRun = (argv.fileExportFunc as string).substring(0, hyPos);
	// const funcToRun = (argv.fileExportFunc as string).substring(hyPos + 1);

	packageUtils.findNodePackageByType('*', (name: string, entryPath: string, parsedName: any, pkJson: string, packagePath: string, isInstalled: boolean) => {
		const realPackagePath = realpathSync(packagePath);
		const pkInstance = new Package({
			moduleName: name,
			shortName: parsedName.name,
			name,
			longName: name,
			scope: parsedName.scope,
			path: packagePath,
			json: pkJson,
			realPackagePath
		});
		console.log(join(packagePath, fileToRun));
		if (!existsSync(join(packagePath, fileToRun)))
			return;
		pks.push(pkInstance);
	});
}
