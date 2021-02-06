import 'source-map-support/register';
// import log4js from 'log4js';
import Path from 'path';
import gulp from 'gulp';
import _ from 'lodash';
import fs from 'fs';
const tslint = require('gulp-tslint');

// const log = log4js.getLogger('plink.tslint-worker');


export default function tsLintPackageAsync(fullName: string, json: any, packagePath: string, fix: boolean) {
  let dir;
  // packagePath = fs.realpathSync(packagePath);
  // tslint:disable-next-line: no-console
  console.log('TSlint Scan', packagePath);

  if (fullName === '@wfh/plink')
    packagePath = packagePath + '/wfh';
  for (let pDir = packagePath; dir !== pDir; pDir = Path.dirname(dir)) {
    dir = pDir;
    if (fs.existsSync(dir + '/tslint.json'))
      break;
  }
  const rcfile = Path.resolve(dir, 'tslint.json');
  // tslint:disable-next-line: no-console
  console.log('Use', rcfile);
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
    .on('error', (err: Error) => reject(err));

    stream.resume();
    stream.on('end', () => resolve());
  });
}
