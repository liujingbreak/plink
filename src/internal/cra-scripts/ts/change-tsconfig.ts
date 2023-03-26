import Path from 'path';
import fs from 'fs';
import {closestCommonParentDir} from '@wfh/plink/wfh/dist/utils/misc';
import {getState} from '@wfh/plink/wfh/dist/package-mgr';
import {setTsCompilerOptForNodePath, plinkEnv/* , log4File*/} from '@wfh/plink';
import ts from 'typescript';
import {ForkTsCheckerWebpackPluginTypescriptOpts} from './types';
import {runTsConfigHandlers} from './utils';
// const log = log4File(__filename);

export function changeTsConfigFile(entryFile: string) {
  // const craOptions = getCmdOptions();
  const rootDir = closestCommonParentDir(
    Array.from(
      getState().project2Packages.keys()
    ).map(prjDir => Path.resolve(plinkEnv.rootDir, prjDir))
  ).replace(/\\/g, '/');

  // const rootDir = plinkEnv.workDir;

  const tsconfigJson =
    ts.readConfigFile(process.env._plink_cra_scripts_tsConfig!,
      (file) => fs.readFileSync(file, 'utf-8')).config as {
      compilerOptions: {
        rootDir?: string; baseUrl?: string; paths: {[k: string]: string[]};
        preserveSymlinks?: boolean;
      };
      include?: string[];
    } & NonNullable<ForkTsCheckerWebpackPluginTypescriptOpts['configOverwrite']>;
    // JSON.parse(fs.readFileSync(process.env._plink_cra_scripts_tsConfig!, 'utf8'));
  const tsconfigDir = Path.dirname(process.env._plink_cra_scripts_tsConfig!);

  // CRA does not allow we configure "compilerOptions.paths" in _plink_cra_scripts_tsConfig
  // (see create-react-app/packages/react-scripts/scripts/utils/verifyTypeScriptSetup.js)
  // therefore, initial paths is always empty.
  // const pathMapping: {[key: string]: string[]} = tsconfigJson.compilerOptions.paths = {};

  if (tsconfigJson.compilerOptions.baseUrl == null) {
    tsconfigJson.compilerOptions.baseUrl = './';
  }
  tsconfigJson.compilerOptions.preserveSymlinks = false;

  // tsconfigJson.compilerOptions.paths = pathMapping;

  setTsCompilerOptForNodePath(tsconfigDir, './', tsconfigJson.compilerOptions, {
    workspaceDir: plinkEnv.workDir,
    noSymlinks: true
    // realPackagePaths: true
  });
  runTsConfigHandlers(tsconfigJson.compilerOptions);

  tsconfigJson.files = [Path.relative(plinkEnv.workDir, entryFile)];
  tsconfigJson.include = [];

  tsconfigJson.compilerOptions.rootDir = rootDir;
  const co = ts.parseJsonConfigFileContent(tsconfigJson, ts.sys, plinkEnv.workDir.replace(/\\/g, '/'),
    undefined, process.env._plink_cra_scripts_tsConfig).options;

  return {tsconfigJson, compilerOptions: co};
}
