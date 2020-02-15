import _ from 'lodash';
import fs from 'fs-extra';
import Path from 'path';

const packageScopes = ['@bk', '@dr'];

function findPackageJson(name: string): string {
  const file = name + '/package.json';
  const guessingFile: string[] = [
    file,
    ...packageScopes.map(scope => `${scope}/${file}`)
  ];
  let resolved: string;
  const foundModule = guessingFile.find(target => {
    try {
      resolved = require.resolve(target);
      return true;
    } catch (ex) {
      return false;
    }
  });

  if (!foundModule) {
    throw new Error(`Could not resolve package.json from paths like:\n${guessingFile.join('\n')}`);
  }
  return resolved!;
}

function _findPackage(shortName: string): {name: string; packageJson: any, dir: string} {
  const jsonFile = findPackageJson(shortName);
  const pkJson = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

  const pkDir = Path.dirname(jsonFile);
  return {
    name: pkJson.name,
    packageJson: pkJson,
    dir: pkDir
  };
}

export const findPackage = _.memoize(_findPackage);

