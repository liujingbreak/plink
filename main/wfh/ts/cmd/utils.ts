import chalk from 'chalk';
import fs from 'fs-extra';
import Path from 'path';
import _config from '../config';
import { createPackageInfo, PackageInfo, PackagesState, getState } from '../package-mgr';

export function completePackageName(guessingNames: Iterable<string>):
  Generator<string | null, void, unknown>;
export function completePackageName(state: PackagesState, guessingNames: Iterable<string>):
  Generator<string | null, void, unknown>;
export function* completePackageName(state: PackagesState | Iterable<string>, guessingNames?: Iterable<string>) {
  for (const pkg of findPackagesByNames(state as PackagesState, guessingNames as Iterable<string>)) {
    if (pkg) {
      yield pkg.name;
    } else {
      yield null;
    }
  }
}

/** Use package-utils.ts#lookForPackages() */
export function findPackagesByNames(guessingNames: Iterable<string>):
  Generator<PackageInfo | null | undefined>;
export function findPackagesByNames(state: PackagesState, guessingNames: Iterable<string>):
  Generator<PackageInfo | null | undefined>;
export function* findPackagesByNames(state: PackagesState | Iterable<string>, guessingNames?: Iterable<string>):
  Generator<PackageInfo | null | undefined> {
  if (guessingNames === undefined) {
    guessingNames = state as string[];
    state = getState();
  }
  const config: typeof _config = require('../config').default;

  const prefixes = ['', ...config().packageScopes.map(scope => `@${scope}/`)];
  const available = (state as PackagesState).srcPackages;
  for (const gn of guessingNames) {
    let found = false;
    for (const prefix of prefixes) {
      const name = prefix + gn;
      if (name === '@wfh/plink' && (state as PackagesState).linkedDrcp) {
        yield (state as PackagesState).linkedDrcp;
        found = true;
        break;
      }
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

export function hl(text: string) {
  return chalk.green(text);
}

export function hlDesc(text: string) {
  return chalk.gray(text);
}

export function arrayOptionFn(curr: string, prev: string[] | undefined) {
  if (prev)
    prev.push(curr);
  return prev;
}
