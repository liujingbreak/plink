import chalk from 'chalk';
import fs from 'fs-extra';
import Path from 'path';
import {createPackageInfo} from '../package-mgr';
import {PackagesState, PackageInfo} from '../package-mgr';
import * as _ from 'lodash';
// import {createSelector} from '@reduxjs/toolkit';

import _config from '../config';

export function writeFile(file: string, content: string) {
  fs.writeFileSync(file, content);
  // tslint:disable-next-line: no-console
  console.log('%s is written', chalk.cyan(Path.relative(process.cwd(), file)));
}

export function* completePackageName(state: PackagesState, guessingNames: string[]) {
  for (const pkg of findPackagesByNames(state, guessingNames)) {
    if (pkg) {
      yield pkg.name;
    } else {
      yield null;
    }
  }
}

/** Use package-utils.ts#lookForPackages() */
export function* findPackagesByNames(state: PackagesState, guessingNames: string[]):
  Generator<PackageInfo | null> {
  const config: typeof _config = require('../config');

  const prefixes = ['', ...config().packageScopes.map(scope => `@${scope}/`)];
  const available = state.srcPackages;
  for (const gn of guessingNames) {
    let found = false;
    for (const prefix of prefixes) {
      const name = prefix + gn;
      const pkg = available.get(name);
      if (pkg) {
        yield pkg;
        found = true;
        break;
      } else {
        const pkjsonFile = lookupPackageJson(gn);
        if (pkjsonFile) {
          yield createPackageInfo(pkjsonFile, true);
          found = true;
          break;
        }
      }
    }

    if (!found) {
      yield null;
    }
  }
}

const nodePaths: string[] = process.env.NODE_PATH ? process.env.NODE_PATH!.split(Path.delimiter) : [];
/**
 * Look up package.json file in environment variable NODE_PATH 
 * @param moduleName 
 */
export function lookupPackageJson(moduleName: string) {
  for (const p of nodePaths) {
    const test = Path.resolve(p, moduleName, 'package.json');
    if (fs.existsSync(test)) {
      return test;
    }
  }
  return null;
}
