import * as _ from 'lodash';
import PackageNodeInstance from './packageNodeInstance';
import PackageBrowserInstance from './package-mgr/package-instance';
const log = require('log4js').getLogger('packagePriorityHelper');

const priorityStrReg = /(before|after)\s+(\S+)/;
export type PackageInstance = PackageBrowserInstance | PackageNodeInstance;

// tslint:disable max-line-length
export function orderPackages(packages: PackageInstance[], run: (...arg: any[]) => Promise<any> | any, priorityProperty?: string) {
  const numberTypePrio: PackageInstance[] = [];
  const beforePackages: {[key: string]: PackageInstance[]} = {};
  const afterPackages: {[key: string]: PackageInstance[]} = {};
  if (priorityProperty == null)
    priorityProperty = 'priority';

  const beforeOrAfter: Map<string, string[]> = new Map();
  packages.forEach(pk => {
    const priority = _.get(pk, priorityProperty!);
    if (_.isNumber(priority)) {
      numberTypePrio.push(pk);
    } else if (_.isString(priority)) {
      const res = priorityStrReg.exec(priority);
      if (!res) {
        throw new Error('Invalid format of package.json - priority in ' +
          pk.longName + ': ' + priority);
      }
      const targetPackageName = res[2];
      if (res[1] === 'before') {
        if (!beforePackages[targetPackageName]) {
          beforePackages[targetPackageName] = [];
          beforeOrAfter.set(targetPackageName, [pk.longName, priorityProperty!]); // track target package
        }
        beforePackages[targetPackageName].push(pk);
      } else if (res[1] === 'after') {
        if (!afterPackages[targetPackageName]) {
          afterPackages[targetPackageName] = [];
          beforeOrAfter.set(targetPackageName, [pk.longName, priorityProperty!]); // track target package
        }
        afterPackages[targetPackageName].push(pk);
      }
    } else {
      pk.json = JSON.parse(JSON.stringify(pk.json));
      _.set(pk, priorityProperty! + '', 5000);
      numberTypePrio.push(pk);
    }
  });
  numberTypePrio.sort(function(pk1, pk2) {
    return _.get(pk2, priorityProperty!) - _.get(pk1, priorityProperty!);
  });

  // console.log(numberTypePrio.map(p => p.longName + ' ' + _.get(p, priorityProperty!)));

  const pkNames = packages.map(p => p.longName);

  const notFound = _.difference(Array.from(beforeOrAfter.keys()), pkNames)
  .map(name => name + ` by ${beforeOrAfter.get(name)!.join('\'s ')}`);
  if (notFound.length > 0) {
    const err = 'Priority depended packages are not found: ' +  notFound +
      '\nTotal packages available:\n' + pkNames.join('\n');
    log.error(err);
    return Promise.reject(new Error(err));
  }

  async function runPackagesSync(packages: PackageInstance[]) {
    for (const pk of packages) {
      await runPackage(pk);
    }
  }

  function runPackagesAsync(packages: PackageInstance[]) {
    return Promise.all(packages.map(runPackage));
  }

  async function runPackage(pk: PackageInstance) {
    await beforeHandlersFor(pk.longName);
    log.debug(pk.longName, ' starts with priority: ', _.get(pk, priorityProperty!));
    const anyRes = run(pk);
    await Promise.resolve(anyRes);
    log.debug(pk.longName, ' ends');
    await afterHandlersFor(pk.longName);
  }

  function beforeHandlersFor(name: string) {
    return runPackagesAsync(beforePackages[name] ? beforePackages[name] : []);
  }

  function afterHandlersFor(name: string) {
    return runPackagesAsync(afterPackages[name] ? afterPackages[name] : []);
  }

  return runPackagesSync(numberTypePrio);
}
