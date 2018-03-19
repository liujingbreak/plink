import * as _ from 'lodash';

export default class PackageBrowserInstance {
	bundle: string;
	longName: string;
	shortName: string;
	file: string;
	parsedName: {scope: string, name: string};
	scopeName: string;
	entryPages: string[];
	i18n: string;
	packagePath: string;
	realPackagePath: string;
	main: string;
	style: string;
	entryViews: string[];
	browserifyNoParse: any[];
	isEntryServerTemplate: boolean;
	translatable: string;
	dr: any;
	json: any;
	browser: string;
	isVendor: boolean;
	appType: string;

	constructor(attrs: any) {
		if (!(this instanceof PackageBrowserInstance)) {
			return new PackageBrowserInstance(attrs);
		}
		if (attrs) {
			this.init(attrs);
		}
	}
	init(attrs: any) {
		_.assign(this, attrs);
		var parsedName = this.parsedName;
		if (parsedName) {
			this.shortName = parsedName.name;
			this.scopeName = parsedName.scope;
		}
	}
	toString() {
		return 'Package: ' + this.longName;
	}
}
