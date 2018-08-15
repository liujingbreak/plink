/* tslint:disable no-console */
import {AngularBuilderOptions} from './common';
import {
	BuilderConfiguration
} from '@angular-devkit/architect';
import {DevServerBuilderOptions} from '@angular-devkit/build-angular';

export default function changeOptions(config: any, browserOptions: AngularBuilderOptions,
	builderConfig?: BuilderConfiguration<DevServerBuilderOptions>) {

	const currPackageName = require('../../package.json').name;

	for (const prop of ['deployUrl', 'outputPath']) {
		const value = config.get([currPackageName, prop]);
		if (value) {
			(browserOptions as any)[prop] = value;
			console.log(currPackageName + ' - override %s: %s', prop, value);
		}
	}
}
