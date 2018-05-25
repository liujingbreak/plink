/* tslint:disable no-console */
import * as Path from 'path';
import postCssPlugin from './postcss-cli-resource';
let {nodeInjector} = require('dr-comp-package/wfh/lib/injectorFactory');

nodeInjector.fromDir(Path.dirname(require.resolve(
'@angular-devkit/build-angular')))
.factory(/postcss-cli-resources/, (file: string) => {
	console.log('Hack postcss-cli-resources in ', file);
	return {
		default: postCssPlugin
	};
});
