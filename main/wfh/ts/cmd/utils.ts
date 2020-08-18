import chalk from 'chalk';
import fs from 'fs-extra';
import Path from 'path';
import {PackagesState} from '../package-mgr';
import _config from '../config';

export function writeFile(file: string, content: string) {
  fs.writeFileSync(file, content);
  // tslint:disable-next-line: no-console
  console.log('%s is written', chalk.cyan(Path.relative(process.cwd(), file)));
}

export function completePackageName(state: PackagesState, guessingName: string[]): (string|null)[] {
  const config: typeof _config = require('../config');

  const prefixes = ['', ...config().packageScopes.map(scope => `@${scope}/`)];
  const available = state.srcPackages;
  return guessingName.map(gn => {
    for (const prefix of prefixes) {
      const name = prefix + gn;
      if (available[name]) {
        return name;
      }
    }
    return null;
  });
}
