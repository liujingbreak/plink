// import Path from 'path';

const packageScopes = ['@bk', '@dr'];

export function findPackageJson(name: string): string {
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
