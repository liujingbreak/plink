import {parse} from 'url';
import Path from 'path';
// import api from '__api';
import _ from 'lodash';
import NodeApi from 'dr-comp-package/wfh/dist/package-mgr/node-package-api';
import {walkPackages } from 'dr-comp-package/wfh/dist/build-util/ts/main';
import {initInjectorForNodePackages, initWebInjector} from 'dr-comp-package/wfh/dist/package-runner';
// import {AngularBuilderOptions} from './common';

export default function walkPackagesAndSetupInjector(ssr = false) {
  const packageInfo = walkPackages();
  const api = injectorSetup(packageInfo, ssr);
  return api;
}

export function injectorSetup(packageInfo: ReturnType<typeof walkPackages>, ssr = false): NodeApi {
  const [pks, apiProto] = initInjectorForNodePackages({}, packageInfo);
  initWebInjector(pks, apiProto);


  const publicUrlObj = parse(process.env.PUBLIC_URL || '');
  // const baseHrefPath = baseHref ? parse(baseHref).pathname : undefined;

  Object.assign(apiProto, {
    deployUrl: process.env.PUBLIC_URL,
    ssr,
    ngBaseRouterPath: publicUrlObj.pathname ? _.trim(publicUrlObj.pathname, '/') : '',
    // ngRouterPath: createNgRouterPath(baseHrefPath ? baseHrefPath : undefined),
    ssrRequire(requirePath: string) {
      if (ssr)
        return require(Path.join(this.__dirname, requirePath));
    }
  });
  return apiProto;
}
