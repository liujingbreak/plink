import 'source-map-support/register';

import Path from 'path';
// import chalk from 'chalk';
import log4js from 'log4js';
import {LintOptions} from './types';
import _ from 'lodash';
import {getState, getPackagesOfProjects} from '../package-mgr';
import {completePackageName} from './utils';
import {Pool} from '../../../thread-promise-pool/dist';
import os from 'os';
import tsLintPackageAsync from './tslint-worker';

const log = log4js.getLogger('plink.cli-lint');

const cpus = os.cpus().length;

export default async function(packages: string[], opts: LintOptions) {
  return lint(packages, opts.pj, opts.fix);
}


function lint(packages: string[], projects: LintOptions['pj'], fix: LintOptions['fix']) {
  let prom: Promise<any> = Promise.resolve();
  const errors: any[] = [];
  if (packages.length > 0) {
    for (const name of completePackageName(getState(), packages)) {
      if (name == null) {
        log.warn('Can not find package for name: ' + name);
        continue;
      }
      const pkg = getState().srcPackages.get(name)!;
      prom = prom.catch(err => errors.push(err))
      .then(() => {
        return tsLintPackageAsync(pkg.name, pkg.json, pkg.realPath, fix);
      });
    }
  } else if (packages.length === 0 && (projects == null || projects.length === 0)) {
    const threadPool = new Pool(cpus - 1, 0, {
      // verbose: true,
      initializer: {file: 'source-map-support/register'}
    });
    const taskProms: Promise<any>[] = [];
    for (const pkg of Object.values(getState().srcPackages)) {
      taskProms.push(threadPool.submit({
        file: Path.resolve(__dirname, 'tslint-worker.js'),
        exportFn: 'default',
        args: [pkg.name, pkg.json, pkg.realPath, fix]
      }));
    }
    prom = Promise.all(taskProms);
  } else if (projects && projects.length > 0) {
    const taskProms: Promise<any>[] = [];
    const threadPool = new Pool(cpus - 1, 0, {
      // verbose: true,
      initializer: {file: 'source-map-support/register'}
    });
    for (const pkg of getPackagesOfProjects(projects)) {
      taskProms.push(threadPool.submit({
        file: Path.resolve(__dirname, 'tslint-worker.js'),
        exportFn: 'default',
        args: [pkg.name, pkg.json, pkg.realPath, fix]
      }));
    }
    prom = Promise.all(taskProms);
  }
  return prom.catch(err => errors.push(err))
  .then(() => {
    if (errors.length > 0) {
      errors.forEach(error => log.error(error));
      throw new Error('Lint result contains errors');
    }
  });
}

