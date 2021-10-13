import {BumpOptions} from './types';
import {getState, pathToProjKey, actionDispatcher} from '../package-mgr';
import { exe } from '../process-utils';
import {findPackagesByNames} from './utils';
import log4js from 'log4js';
// import Path from 'path';
import '../editor-helper';

const log = log4js.getLogger('plin.cli-bump');

export default async function(options: BumpOptions & {packages: string[]}) {
  if (options.packages.length > 0) {
    await bumpPackages(options.packages, options.increVersion);
  } else if (options.project.length > 0) {
    const pkgNames = options.project.map(proj => pathToProjKey(proj)).reduce(
      (pkgs, proj) => {
        const pkgsOfProj = getState().project2Packages.get(proj);
        if (pkgsOfProj)
          pkgs.push(...pkgsOfProj);
        return pkgs;
      },
      [] as string[]);

    await bumpPackages(pkgNames, options.increVersion);
  }
  await new Promise(resolve => setImmediate(resolve));
  actionDispatcher.scanAndSyncPackages({});
}

async function bumpPackages(pkgNames: string[], increVersion: string) {
  await Promise.all(Array.from(findPackagesByNames(getState(), pkgNames)).filter((pkg, idx) => {
    const rs = pkg != null;
    if (!rs) {
      log.error(`Can not find package for name like: ${pkgNames[idx]}`);
    }
    return rs;
  }).map((pkg) => {
    log.info(`bump ${pkg!.name} version`);
    const pkDir = pkg!.realPath;
    return exe('npm', 'version', increVersion, {cwd: pkDir}).promise;
  }));
}
