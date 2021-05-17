import { getCmdOptions } from './utils';
import {TscCmdParam} from '@wfh/plink/wfh/dist/ts-cmd';
import {findPackagesByNames} from '@wfh/plink';
import {PKG_LIB_ENTRY_PROP, PKG_LIB_ENTRY_DEFAULT} from './types';
import {runTsConfigHandlers} from './utils';
import * as _tscmd from '@wfh/plink/wfh/dist/ts-cmd';
import _ from 'lodash';

export async function buildTsd(packages?: string[], overridePackgeDirs: TscCmdParam['overridePackgeDirs'] = {}) {

  if (packages == null) {
    const opts = getCmdOptions();
    packages = [opts.buildTarget];
  }

  const pkgs = [...findPackagesByNames(packages)].map((pkg, i) => {
    if (pkg == null) {
      throw new Error(`Can not find package ${packages![i]}`);
    }
    return pkg;
  });

  const _overridePackgeDirs: TscCmdParam['overridePackgeDirs'] = {...overridePackgeDirs};
  for (const pkg of pkgs) {
    if (_overridePackgeDirs[pkg.name] == null) {
      _overridePackgeDirs[pkg.name] = {
        destDir: 'build',
        srcDir: '',
        include: _.get(pkg.json.plink ? pkg.json.plink : pkg.json.dr, PKG_LIB_ENTRY_PROP, PKG_LIB_ENTRY_DEFAULT)
      };
    }
  }
  // const targetPackage = pkg.name;
  const workerData: TscCmdParam = {
    package: pkgs.map(pkg => pkg.name), ed: true, jsx: true, watch: getCmdOptions().watch,
    pathsJsons: [],
    overridePackgeDirs: _overridePackgeDirs
  };
  const {tsc} = require('@wfh/plink/wfh/dist/ts-cmd') as typeof _tscmd;
  const compilerOptionsDraft = {paths: {}};

  runTsConfigHandlers(compilerOptionsDraft);
  workerData.compilerOptions = compilerOptionsDraft;
  await tsc(workerData);
}