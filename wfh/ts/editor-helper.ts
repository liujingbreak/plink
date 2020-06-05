import Path from 'path';
import * as _fs from 'fs-extra';
import { boxString } from './utils';
import {DrcpConfig} from './config-handler';
const config: DrcpConfig = require('../lib/config');

const {parse} = require('comment-json');

export function writeTsconfig4Editor() {
  const tsjson: any = {
    extends: null
  };
  // ------- Write tsconfig.json for Visual Code Editor --------

  let srcDirCount = 0;
  const root = process.cwd(); // api.config().rootPath;

  const packageToRealPath: Array<[string, string]> = [];
  require('dr-comp-package/wfh/lib/packageMgr/packageUtils')
  .findAllPackages((name: string, entryPath: string, parsedName: string, json: any, packagePath: string) => {
    const realDir = _fs.realpathSync(packagePath);
    // Path.relative(root, realDir).replace(/\\/g, '/');
    packageToRealPath.push([name, realDir]);
  }, 'src');

  const recipeManager = require('dr-comp-package/wfh/dist/recipe-manager');

  for (const proj of config().projectList) {
    tsjson.include = [];
    tsjson.extends = Path.relative(proj, require.resolve('dr-comp-package/wfh/tsconfig.json'));
    if (!Path.isAbsolute(tsjson.extends) && !tsjson.extends.startsWith('..')) {
      tsjson.extends = './' + tsjson.extends;
    }
    tsjson.extends = tsjson.extends.replace(/\\/g, '/');
    recipeManager.eachRecipeSrc(proj, (srcDir: string) => {
      let includeDir = Path.relative(proj, srcDir).replace(/\\/g, '/');
      if (includeDir && includeDir !== '/')
        includeDir += '/';
      tsjson.include.push(includeDir + '**/*.ts');
      tsjson.include.push(includeDir + '**/*.tsx');
      srcDirCount++;
    });

    const pathMapping: {[key: string]: string[]} = {};
    for (const [name, realPath] of packageToRealPath) {
      const realDir = Path.relative(proj, realPath).replace(/\\/g, '/');
      pathMapping[name] = [realDir];
      pathMapping[name + '/*'] = [realDir + '/*'];
    }

    const drcpDir = Path.relative(root, _fs.realpathSync('node_modules/dr-comp-package')).replace(/\\/g, '/');
    pathMapping['dr-comp-package'] = [drcpDir];
    pathMapping['dr-comp-package/*'] = [drcpDir + '/*'];
    // pathMapping['*'] = ['node_modules/*', 'node_modules/@types/*'];

    tsjson.compilerOptions = {
      rootDir: './',
      baseUrl: root,
      // noResolve: true, // Do not add this, VC will not be able to understand rxjs module
      paths: pathMapping,
      skipLibCheck: false,
      jsx: 'preserve',
      // typeRoots: [
      //   Path.join(root, 'node_modules/@types'),
      //   Path.join(root, 'node_modules/@dr-types'),
      //   Path.join(Path.dirname(require.resolve('dr-comp-package/package.json')), '/wfh/types')
      // ],
      noImplicitAny: true,
      target: 'es2015',
      module: 'commonjs'
    };
    const tsconfigFile = Path.resolve(proj, 'tsconfig.json');
    if (_fs.existsSync(tsconfigFile)) {
      const existing = _fs.readFileSync(tsconfigFile, 'utf8');
      const existingJson = parse(existing);
      const co = existingJson.compilerOptions;
      if (!co.jsx) {
        co.jsx = 'preserve';
      }
      const newCo = tsjson.compilerOptions;
      co.typeRoots = newCo.typeRoots;
      co.baseUrl = newCo.baseUrl;
      co.paths = newCo.paths;
      co.rootDir = newCo.rootDir;

      existingJson.extends = tsjson.extends;
      existingJson.include = tsjson.include;

      const newJsonStr = JSON.stringify(existingJson, null, '  ');
      if (newJsonStr !== existing) {
        // tslint:disable-next-line: no-console
        console.log('[editor-helper] Write tsconfig.json to ' + proj);
        _fs.writeFileSync(tsconfigFile, JSON.stringify(existingJson, null, '  '));
      } else {
        // tslint:disable-next-line: no-console
        console.log(`[editor-helper] ${tsconfigFile} is not changed.`);
      }
    } else {
      // tslint:disable-next-line: no-console
      console.log('[editor-helper] Write tsconfig.json to ' + proj);
      _fs.writeFileSync(tsconfigFile, JSON.stringify(tsjson, null, '  '));
    }
  }


  if (srcDirCount > 0) {
    // tslint:disable-next-line: no-console
    console.log('[editor-helper]\n' + boxString('To be friendly to your editor, we just added tsconfig.json file to each of your project directories,\n' +
    'But please add "tsconfig.json" to your .gitingore file,\n' +
    'since these tsconfig.json are generated based on your local workspace location.'));
  }
}
