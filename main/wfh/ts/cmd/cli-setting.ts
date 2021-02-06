import config from '../config/index';
import {dispatcher, getStore, getState} from '../config/config-view-slice';
import {workspaceKey} from '../package-mgr';
import {completePackageName} from './utils';
import * as op from 'rxjs/operators';
import {createCliTable} from '../utils/misc';
import chalk from 'chalk';
import * as util from 'util';
// import Path from 'path';

export default async function(pkgName?: string) {
  const wskey = workspaceKey(process.cwd());
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
        printPackage(pkgName);
      } else {
        for (const name of state.packageNames!) {
          printPackage(name);
        }
      }
      // tslint:disable-next-line: no-console
      console.log(chalk.cyan('Complete setting values:'));
      // tslint:disable-next-line: no-console
      console.log(util.inspect(setting, false, 5));
    })
  ).subscribe();
  dispatcher.loadPackageSettingMeta({workspaceKey: wskey, packageName: pkgName});
}

function printPackage(pkgName: string) {
  const state = getState();
  const meta = state.packageMetaByName.get(pkgName);
  if (meta == null) {
    // tslint:disable-next-line: no-console
    console.log('No setting found for package ' + pkgName);
    return;
  }
  const table = createCliTable({horizontalLines: false, colWidths: [null, 50], colAligns: ['right', 'left']});
  table.push(
    // tslint:disable-next-line: max-line-length
    [{colSpan: 2, content: `Package ${chalk.green(pkgName)} setting ${chalk.gray('| ' + meta.typeFile)}`, hAlign: 'center'}],
    ['PROPERTY', 'TYPE AND DESCIPTION'].map(item => chalk.gray(item)),
    ['------', '-------'].map(item => chalk.gray(item))
  );
  // const valuesForPkg = pkgName === '@wfh/plink' ? setting : setting[pkgName];
  for (const prop of meta.properties) {
    const propMeta = state.propertyByName.get(pkgName + ',' + prop)!;
    table.push([
      chalk.cyan(propMeta.property),
      (propMeta.optional ? chalk.gray('(optional) ') : '') + chalk.magenta(propMeta.type) + ' - ' + propMeta.desc
      // JSON.stringify(valuesForPkg[propMeta.property], null, '  ')
    ]);
  }
  // tslint:disable: no-console
  console.log(table.toString());
}
