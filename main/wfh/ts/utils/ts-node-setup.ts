import fs from 'fs';
import Path from 'path';
import ts from 'typescript';
import {register as registerTsNode} from 'ts-node';
import {setTsCompilerOptForNodePath} from '../package-mgr/package-list-helper';
import {plinkEnv} from './misc';

function register() {
  const internalTscfgFile = Path.resolve(__dirname, '../../tsconfig-base.json');

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const {compilerOptions} = ts.readConfigFile(internalTscfgFile,
    file => fs.readFileSync(file, 'utf8')
  ).config;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access

  setTsCompilerOptForNodePath(process.cwd(), './', compilerOptions, {
    enableTypeRoots: true,
    workspaceDir: plinkEnv.workDir
  });

  compilerOptions.module = 'commonjs';
  compilerOptions.noUnusedLocals = false;
  compilerOptions.diagnostics = true;
  compilerOptions.declaration = false;
  delete compilerOptions.rootDir;

  // console.log(compilerOptions);
  registerTsNode({
    typeCheck: true,
    compilerOptions,
    skipIgnore: true, // important, by "false" will ignore files are under node_modules
    compiler: require.resolve('typescript'),
    /**
     * Important!! prevent ts-node looking for tsconfig.json from current working directory
     */
    skipProject: true,
    transformers: {
      before: [
        context => (src) => {
          // log.info('before ts-node compiles:', src.fileName);
          // console.log(src.text);
          return src;
        }
      ],
      after: [
        context => (src) => {
          // log.info('ts-node compiles:', src.fileName);
          // console.log(src.text);
          return src;
        }
      ]
    }
  });
}

try {
  register();
} catch (e) {
  console.error(e);
}

