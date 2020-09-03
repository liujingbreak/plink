import {parse} from 'url';
import Path from 'path';
// import api from '__api';
import _ from 'lodash';
import {createNgRouterPath} from '../../isom/api-share';
import {walkPackages } from 'dr-comp-package/wfh/dist/build-util/ts/main';
import {initInjectorForNodePackages, initWebInjector} from 'dr-comp-package/wfh/dist/package-runner';
import {AngularBuilderOptions} from './common';

export default async function walkPackagesAndSetupInjector(browserOptions: AngularBuilderOptions, ssr = false): Promise<ReturnType<typeof walkPackages>> {
  const packageInfo = walkPackages();
  await injectorSetup(packageInfo, browserOptions.drcpArgs, browserOptions.deployUrl, browserOptions.baseHref, ssr);
  return packageInfo;
}

export async function injectorSetup(packageInfo: ReturnType<typeof walkPackages>,
  drcpArgs: AngularBuilderOptions['drcpArgs'],
  deployUrl: AngularBuilderOptions['deployUrl'],
  baseHref: AngularBuilderOptions['baseHref'], ssr = false) {
  const [pks, apiProto] = initInjectorForNodePackages(drcpArgs, packageInfo);
  await initWebInjector(pks, apiProto);

  const publicUrlObj = parse(deployUrl || '');
  const baseHrefPath = baseHref ? parse(baseHref).pathname : undefined;

  Object.assign(apiProto, {
    deployUrl,
    ssr,
    ngBaseRouterPath: publicUrlObj.pathname ? _.trim(publicUrlObj.pathname, '/') : '',
    ngRouterPath: createNgRouterPath(baseHrefPath ? baseHrefPath : undefined),
    ssrRequire(requirePath: string) {
      if (ssr)
        return require(Path.join(this.__dirname, requirePath));
    }
  });
}
