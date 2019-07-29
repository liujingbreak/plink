import {parse} from 'url';
import Path from 'path';
// import api from '__api';
import _ from 'lodash';
import {createNgRouterPath} from '../../isom/api-share';
import {initInjectorForNodePackages, initWebInjector} from 'dr-comp-package/wfh/dist/package-runner';
import {AngularBuilderOptions} from './common';

export default async function(browserOptions: AngularBuilderOptions, ssr = false) {
  const [pks, apiProto] = initInjectorForNodePackages(browserOptions.drcpArgs);
  await initWebInjector(pks, apiProto);

  const deployUrl = browserOptions.deployUrl || '';

  const publicUrlObj = parse(deployUrl);
  Object.assign(apiProto, {
    deployUrl,
    ssr,
    ngBaseRouterPath: _.trim(publicUrlObj.pathname, '/'),
    ngRouterPath: createNgRouterPath(browserOptions.baseHref),
    ssrRequire(requirePath: string) {
      if (ssr)
        return require(Path.join(this.__dirname, requirePath));
    }
  });
}
