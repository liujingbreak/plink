import * as _ from 'lodash';
const log = require('log4js').getLogger('packagePriorityHelper');

const priorityStrReg = /(before|after)\s+(\S+)/;

export interface PackageInfo {
  name: string;
  priority?: string | number;
}

export type PackageInfoWithPriority = {[key in keyof PackageInfo]-?: PackageInfo[key]};
// tslint:disable max-line-length
export function orderPackages(packages: PackageInfo[], run: (pk: PackageInfoWithPriority) => Promise<any> | any) {
  const numberTypePrio: PackageInfoWithPriority[] = [];
  const beforePackages: {[key: string]: PackageInfoWithPriority[]} = {};
  const afterPackages: {[key: string]: PackageInfoWithPriority[]} = {};

  const beforeOrAfter: Map<string, string[]> = new Map();
  packages.forEach(pk => {
    const priority = pk.priority;
    if (_.isNumber(priority)) {
      numberTypePrio.push(pk as PackageInfoWithPriority);
    } else if (_.isString(priority)) {
      const res = priorityStrReg.exec(priority);
      if (!res) {
        throw new Error('Invalid format of package.json - priority in ' +
          pk.name + ': ' + priority);
      }
      const targetPackageName = res[2];
      if (res[1] === 'before') {
        if (!beforePackages[targetPackageName]) {
          beforePackages[targetPackageName] = [];
          beforeOrAfter.set(targetPackageName, [pk.name, pk.priority as string]); // track target package
        }
        beforePackages[targetPackageName].push(pk as PackageInfoWithPriority);
      } else if (res[1] === 'after') {
        if (!afterPackages[targetPackageName]) {
          afterPackages[targetPackageName] = [];
          beforeOrAfter.set(targetPackageName, [pk.name, pk.priority as string]); // track target package
        }
        afterPackages[targetPackageName].push(pk as PackageInfoWithPriority);
      }
    } else {
      pk.priority = 5000;
      numberTypePrio.push(pk as PackageInfoWithPriority);
    }
  });
  numberTypePrio.sort(function(pk1, pk2) {
    return pk2.priority as number - (pk1.priority as number);
  });

  const pkNames = packages.map(p => p.name);

  const notFound = _.difference(Array.from(beforeOrAfter.keys()), pkNames)
  .map(name => name + ` by ${beforeOrAfter.get(name)!.join('\'s ')}`);

  if (notFound.length > 0) {
    const err = 'Priority depended packages are not found: ' +  notFound +
      '\nTotal packages available:\n' + pkNames.join('\n');
    log.error(err);
    return Promise.reject(new Error(err));
  }

  async function runPackagesSync(packages: PackageInfoWithPriority[]) {
    for (const pk of packages) {
      await runPackage(pk);
    }
  }

  function runPackagesAsync(packages: PackageInfoWithPriority[]) {
    return Promise.all(packages.map(runPackage));
  }

  async function runPackage(pk: PackageInfoWithPriority) {
    await beforeHandlersFor(pk.name);
    log.debug(pk.name, ' starts with priority: ', pk.priority);
    const anyRes = run(pk);
    await Promise.resolve(anyRes);
    log.debug(pk.name, ' ends');
    await afterHandlersFor(pk.name);
  }

  function beforeHandlersFor(name: string) {
    return runPackagesAsync(beforePackages[name] ? beforePackages[name] : []);
  }

  function afterHandlersFor(name: string) {
    return runPackagesAsync(afterPackages[name] ? afterPackages[name] : []);
  }

  return runPackagesSync(numberTypePrio);
}
