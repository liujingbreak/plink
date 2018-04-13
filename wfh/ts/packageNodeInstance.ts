import * as _ from 'lodash';

export default class Package {
	moduleName: string;
	shortName: string;
	name: string;
	longName: string;
	scope: string;
	path: string;
	json: any;

	constructor(attrs: any) {
		_.assign(this, attrs);
	}
}
