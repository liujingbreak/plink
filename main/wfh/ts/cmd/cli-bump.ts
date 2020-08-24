import {BumpOptions} from './types';
import config from '../config';
import logConfig from '../log-config';
import {getState, pathToProjKey} from '../package-mgr';
// import * as Path from 'path';
import { exe } from '../process-utils';
import {completePackageName} from './utils';
import log4js from 'log4js';

const log = log4js.getLogger('bump');

export default async function(options: BumpOptions & {packages: string[]}) {
  await config.init(options);
  logConfig(config());

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
}

async function bumpPackages(pkgNames: string[], increVersion: string) {
  await Promise.all(Array.from(completePackageName(getState(), pkgNames)).filter(pkgName => {
    const rs = pkgName != null;
    if (!rs) {
      log.error(`Can not find package for name like: ${pkgName}`);
    }
    return rs;
  }).map((pkgName) => {
    log.info(`bump ${pkgName} version`);
    const pkDir = getState().srcPackages.get(pkgName!)!.realPath;
    return exe('npm', 'version', increVersion, {cwd: pkDir}).promise;
  }));
}
