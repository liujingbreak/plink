import {parse} from 'url';
import Path from 'path';
// import api from '__api';
import _ from 'lodash';
import {createNgRouterPath} from '../../isom/api-share';
import {initInjectorForNodePackages} from '@wfh/plink/wfh/dist/package-runner';
import {AngularBuilderOptions} from './common';

export function injectorSetup(
  deployUrl: AngularBuilderOptions['deployUrl'],
  baseHref: AngularBuilderOptions['baseHref'], ssr = false) {
  const apiProto = initInjectorForNodePackages()[1];

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
