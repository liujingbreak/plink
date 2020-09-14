import _ from 'lodash';
// import fs from 'fs-extra';
// import Path from 'path';
import {getState} from 'dr-comp-package/wfh/dist/package-mgr';
import {findPackagesByNames} from 'dr-comp-package/wfh/dist/cmd/utils';

function _findPackage(shortName: string): {name: string; packageJson: any, dir: string} | null {
  const pkg = Array.from(findPackagesByNames(getState(), [shortName]))[0];
  if (pkg == null)
    return null;
  return {
    name: pkg.name,
    packageJson: pkg.json,
    dir: pkg.realPath
  };
}

export const findPackage = _.memoize(_findPackage);

