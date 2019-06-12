import {parse} from 'url';
import Path from 'path';
// import api from '__api';
import _ from 'lodash';
import {ngRouterPath} from '../api-share';
import {initApiForAllPackages} from 'dr-comp-package/wfh/dist/package-runner';
import {AngularBuilderOptions} from './common';

export default function(browserOptions: AngularBuilderOptions, ssr = false) {
	const [, apiProto] = initApiForAllPackages(browserOptions.drcpArgs);

	const deployUrl = browserOptions.deployUrl || '';

	const publicUrlObj = parse(deployUrl);
	Object.assign(apiProto, {
		deployUrl,
		ssr,
		ngBaseRouterPath: _.trim(publicUrlObj.pathname, '/'),
		ngRouterPath,
		ssrRequire(requirePath: string) {
			if (ssr)
				return require(Path.join(this.__dirname, requirePath));
		}
	});
}
