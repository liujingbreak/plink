import Path from 'path';
// import chalk from 'chalk';
import fs from 'fs-extra';
import config from '../config';
import logConfig from '../log-config';
import log4js from 'log4js';
import {LintOptions} from './types';
import gulp from 'gulp';
import _ from 'lodash';
import {getState, getPackagesOfProjects} from '../package-mgr';
import {completePackageName} from './utils';

const tslint = require('gulp-tslint');
const log = log4js.getLogger('wfh.lint');

export default async function(packages: string[], opts: LintOptions) {
  await config.init(opts);
  logConfig(config());
  return lint(packages, opts.pj, opts.fix);
}


function lint(packages: string[], projects: LintOptions['pj'], fix: LintOptions['fix']) {
  var prom = Promise.resolve();
  const errors: any[] = [];
  if (packages.length > 0) {

    for (const name of completePackageName(getState(), packages)) {
      if (name == null) {
        log.warn('Can not find package for name: ' + name);
        continue;
      }
      const pkg = getState().srcPackages[name];
      prom = prom.catch(err => errors.push(err))
      .then(() => {
        return _tsLintPackageAsync(pkg.name, pkg.json, pkg.realPath, fix);
      });
    }
  } else if (packages.length === 0 && (projects == null || projects.length === 0)) {
    for (const pkg of Object.values(getState().srcPackages)) {
      prom = prom.catch(err => errors.push(err))
      .then(() => _tsLintPackageAsync(pkg.name, pkg.json, pkg.realPath, fix));
    }
  } else if (projects && projects.length > 0) {
    for (const pkg of getPackagesOfProjects(projects)) {
      prom = prom.catch(err => errors.push(err))
      .then(() => _tsLintPackageAsync(pkg.name, pkg.json, pkg.realPath, fix));
    }
  }
  return prom.catch(err => errors.push(err))
  .then(() => {
    if (errors.length > 0) {
      errors.forEach(error => log.error(error));
      throw new Error('Lint result contains errors');
    }
  });
}

function _tsLintPackageAsync(fullName: string, json: any, packagePath: string, fix: boolean) {
  let dir;
  // packagePath = fs.realpathSync(packagePath);
  log.info('TSlint Scan', packagePath);
  if (fullName === 'dr-comp-package')
    packagePath = packagePath + '/wfh';
  for (let pDir = packagePath; dir !== pDir; pDir = Path.dirname(dir)) {
    dir = pDir;
    if (fs.existsSync(dir + '/tslint.json'))
      break;
  }
  const rcfile = Path.resolve(dir, 'tslint.json');
  log.debug('Use', rcfile);
  const packagePath0 = packagePath.replace(/\\/g, '/');

  // TODO: use require('../../dist/utils').getTsDirsOfPackage;
  // Unlike ESlint, TSLint fix does not write file to stream, but use fs.writeFileSync() instead
  return new Promise<void>((resolve, reject) => {
    const tsDestDir = _.get(json, 'dr.ts.dest', 'dist');
    const stream = gulp.src([packagePath0 + '/**/*.{ts,tsx}',
      `!${packagePath}/**/*.spec.ts`,
      `!${packagePath}/**/*.d.ts`,
      `!${packagePath}/${tsDestDir}/**/*`,
      `!${packagePath0}/spec/**/*`,
      `!${packagePath}/${_.get(json, 'dr.assetsDir', 'assets')}/**/*`,
      `!${packagePath0}/node_modules/**/*`], {base: packagePath})
    .pipe(tslint({tslint: require('tslint'), formatter: 'verbose', configuration: rcfile, fix}))
    .pipe(tslint.report({
      summarizeFailureOutput: true,
      allowWarnings: true
    }))
    // .pipe(through.obj(function(file, en, next) {
    // 	log.info(Path.relative(packagePath, file.path));
    // 	next(null, file);
    // }))
    .on('error', (err: Error) => reject(err));
    // else
    stream.resume();
    stream.on('end', () => resolve());
  });
}
