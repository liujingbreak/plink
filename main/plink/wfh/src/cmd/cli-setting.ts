// eslint-disable  max-len, no-console
import * as util from 'util';
import Path from 'path';
import * as op from 'rxjs/operators';
import chalk from 'chalk';
import {getLogger} from 'log4js';
import config from '../config/index';
import {dispatcher, getStore, getState} from '../config/config-view-slice';
import {workspaceKey, PackageInfo} from '../package-mgr';
import {createCliTable, plinkEnv} from '../utils/misc';
import {findPackagesByNames, completePackageName} from './utils';

const log = getLogger('plink.cli-setting');

export default function(pkgName?: string) {
  const wskey = workspaceKey(plinkEnv.workDir);
  if (pkgName) {
    const foundPkgName = Array.from(completePackageName([pkgName]))[0];
    if (foundPkgName == null) {
      throw new Error(`Package of name "${pkgName}" does not exist`);
    }
    pkgName = foundPkgName;
  }
  getStore().pipe(
    op.map(s => s.updateChecksum), op.distinctUntilChanged(),
    op.skip(1), op.take(1),
    op.tap(() => {
      const state = getState();
      const setting = config();

      if (pkgName) {
        const [pkg] = Array.from(findPackagesByNames([pkgName]));
        printPackage(pkg!);
      } else {
        const pkgs = Array.from(findPackagesByNames(state.packageNames!));

        for (let i = 0, l = pkgs.length ; i < l; i++) {
          const pkg = pkgs[i];
          const name = state.packageNames![i];
          if (pkg == null) {
            log.error(`Can not found package installed or linked for name: ${name}`);
            continue;
          }
          printPackage(pkg);
        }
      }
      const tbl = createCliTable();
      tbl.push(['Complete setting values:']);
      // eslint-disable-next-line no-console
      console.log(tbl.toString());
      // eslint-disable-next-line no-console
      console.log(util.inspect(setting, false, 5));
    })
  ).subscribe();
  dispatcher.loadPackageSettingMeta({workspaceKey: wskey, packageName: pkgName});
}

function printPackage({name: pkgName, realPath}: PackageInfo) {
  const state = getState();
  const meta = state.packageMetaByName.get(pkgName);
  if (meta == null) {
    // eslint-disable-next-line no-console
    console.log('No setting found for package ' + pkgName);
    return;
  }

  const tbl = createCliTable({horizontalLines: false});

  tbl.push([`Package ${chalk.green(pkgName)} setting ${'| ' + chalk.gray(Path.relative(plinkEnv.workDir, realPath))}`],
    [`  ${chalk.gray(meta.typeFile)}`]);
  // eslint-disable-next-line no-console
  console.log(tbl.toString());

  for (const prop of meta.properties) {
    const propMeta = state.propertyByName.get(pkgName + ',' + prop)!;
    // eslint-disable-next-line no-console
    console.log('   ' + chalk.cyan(propMeta.property) + ': ' +
      (propMeta.optional ? chalk.gray('(optional) ') : '') + chalk.magenta(propMeta.type.replace(/\n/g, '\n  ')));
    // console.log('    ' + (propMeta.optional ? chalk.gray('  (optional) ') : '  ') + chalk.magenta(propMeta.type));
    if (propMeta.desc)
      // eslint-disable-next-line no-console
      console.log('      - ' + propMeta.desc.trim().replace(/\n/g, '\n      '));
  }
}
