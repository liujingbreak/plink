import {closestCommonParentDir} from '@wfh/plink/wfh/dist/utils/misc';
import {getState} from '@wfh/plink/wfh/dist/package-mgr';
import {getRootDir, setTsCompilerOptForNodePath, plinkEnv/* , log4File*/} from '@wfh/plink';
import ts from 'typescript';
import {runTsConfigHandlers, getReportDir} from './utils';
import Path from 'path';
import fs from 'fs';
// const log = log4File(__filename);

export function changeTsConfigFile() {
  // const craOptions = getCmdOptions();
  const plinkRoot = getRootDir();
  const rootDir = closestCommonParentDir(Array.from(
    getState().project2Packages.keys()
    ).map(prjDir => Path.resolve(plinkRoot, prjDir))).replace(/\\/g, '/');

  const tsconfigJson =
    ts.readConfigFile(process.env._plink_cra_scripts_tsConfig!,
      (file) => fs.readFileSync(file, 'utf-8')).config as {
        compilerOptions: {
          rootDir?: string; baseUrl?: string; paths: {[k: string]: string[]};
          preserveSymlinks?: boolean;
        };
        include?: string[];
      };
    // JSON.parse(fs.readFileSync(process.env._plink_cra_scripts_tsConfig!, 'utf8'));
  const tsconfigDir = Path.dirname(process.env._plink_cra_scripts_tsConfig!);

  // CRA does not allow we configure "compilerOptions.paths" in _plink_cra_scripts_tsConfig
  // (see create-react-app/packages/react-scripts/scripts/utils/verifyTypeScriptSetup.js)
  // therefore, initial paths is always empty.
  // const pathMapping: {[key: string]: string[]} = tsconfigJson.compilerOptions.paths = {};

  if (tsconfigJson.compilerOptions.baseUrl == null) {
    tsconfigJson.compilerOptions.baseUrl = './';
  }
  tsconfigJson.compilerOptions.preserveSymlinks = true;

  // tsconfigJson.compilerOptions.paths = pathMapping;

  setTsCompilerOptForNodePath(tsconfigDir, './', tsconfigJson.compilerOptions, {
    workspaceDir: plinkEnv.workDir,
    noSymlinks: true
  });
  runTsConfigHandlers(tsconfigJson.compilerOptions);

  tsconfigJson.include = [Path.relative(plinkEnv.workDir, process.env._plink_cra_scripts_indexJs!)];
  tsconfigJson.compilerOptions.rootDir = rootDir;
  const co = ts.parseJsonConfigFileContent(tsconfigJson, ts.sys, plinkEnv.workDir.replace(/\\/g, '/'),
    undefined, process.env._plink_cra_scripts_tsConfig).options;

  void fs.promises.writeFile(Path.resolve(getReportDir(), 'tsconfig.json'), JSON.stringify(tsconfigJson, null, '  '));
  return co;
}
