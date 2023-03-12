/**
 * This file is not used actually. This is an attempt to patch Tsconfig file of fock-ts-checker-webpack-plugin 4.1.6.
 * The actual working solution is hack-fork-ts-checker.ts
 */

import Path from 'path';
import fs from 'fs';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import {closestCommonParentDir} from '@wfh/plink/wfh/dist/utils/misc';
import {getState} from '@wfh/plink/wfh/dist/package-mgr';
import {setTsCompilerOptForNodePath, plinkEnv} from '@wfh/plink';
import ts from 'typescript';
import {runTsConfigHandlers} from './utils';
// const log = log4File(__filename);

export class ForkTsCheckerExtend extends ForkTsCheckerWebpackPlugin {

  constructor(opts: ConstructorParameters<typeof ForkTsCheckerWebpackPlugin>[0])  {
    if (opts != null) {
      const plinkRoot = plinkEnv.rootDir;
      const rootDir = closestCommonParentDir(Array.from(
        getState().project2Packages.keys())
        .map(prjDir => Path.resolve(plinkRoot, prjDir))).replace(/\\/g, '/');

      const tsconfigJson: {compilerOptions: any; include?: string[]} =
        ts.readConfigFile(opts.tsconfig!, (file) => fs.readFileSync(file, 'utf-8')).config;
      const tsconfigDir = Path.dirname(opts.tsconfig!);

      // CRA does not allow we configure "compilerOptions.paths"
      // (see create-react-app/packages/react-scripts/scripts/utils/verifyTypeScriptSetup.js)
      // therefore, initial paths is always empty.
      const pathMapping: {[key: string]: string[]} = tsconfigJson.compilerOptions.paths = {};
      if (tsconfigJson.compilerOptions.baseUrl == null) {
        tsconfigJson.compilerOptions.baseUrl = './';
      }
      for (const [name, {realPath}] of getState().srcPackages.entries() || []) {
        const realDir = Path.relative(tsconfigDir, realPath).replace(/\\/g, '/');
        pathMapping[name] = [realDir];
        pathMapping[name + '/*'] = [realDir + '/*'];
      }

      if (getState().linkedDrcp) {
        const drcpDir = Path.relative(tsconfigDir, getState().linkedDrcp!.realPath).replace(/\\/g, '/');
        pathMapping['@wfh/plink'] = [drcpDir];
        pathMapping['@wfh/plink/*'] = [drcpDir + '/*'];
      }
      tsconfigJson.compilerOptions.paths = pathMapping;

      setTsCompilerOptForNodePath(tsconfigDir, './', tsconfigJson.compilerOptions, {
        workspaceDir: plinkEnv.workDir || process.cwd()
      });
      runTsConfigHandlers(tsconfigJson.compilerOptions);

      tsconfigJson.include = [Path.relative(plinkEnv.workDir || process.cwd(), process.env._plink_cra_scripts_indexJs!)];
      tsconfigJson.compilerOptions.rootDir = rootDir;
      opts.compilerOptions = tsconfigJson.compilerOptions;
    }
    super(opts);
  }
}
