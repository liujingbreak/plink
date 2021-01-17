import Path from 'path';
import {getRootDir} from '../utils/misc';
import fs from 'fs';
import parse, {ObjectAst} from '../utils/json-sync-parser';
// import replaceCode from '../utils/patch-text';

export function reinstallWithLinkedPlink(plinkRepoPath: string, deletedSymlinks: string[]) {
  // const plinkRepo = Path.resolve(plinkRepoPath);
  const rootDir = getRootDir();
  const nmDir = Path.resolve(rootDir, 'node_modules');
  const pkJsonStr = fs.readFileSync(Path.resolve(rootDir, 'package.json'), 'utf8');
  const packageNamesToCheck = new Set<string>(
    deletedSymlinks.map(file => Path.relative(nmDir, file).replace(/\\/g, '/')));

  const ast = parse(pkJsonStr);
  const depsAst = ast.properties.find(prop => prop.name.text === '"dependencies"');
  console.log(depsAst)
  if (depsAst) {
    for (const prop of (depsAst.value as ObjectAst).properties) {
      const name = prop.name.text.slice(1, -2);
      if (packageNamesToCheck.has(name) || name === '@wfh/plink') {
        console.log('::', name)
      }
    }
  }
}
