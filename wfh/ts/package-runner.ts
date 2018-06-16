import NodePackage from './packageNodeInstance';
import * as _ from 'lodash';
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
		for (let comp of comps) {
			let exp = require(comp.longName);
			if (_.isFunction(exp.deactivate)) {
				log.info('deactivate', comp.longName);
				await Promise.resolve(exp.deactivate());
			}
		}
	}
}
